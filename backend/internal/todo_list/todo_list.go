package todolist

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
	"github.com/milkystar516/go-todo/backend/internal/validation"
)

var ErrListNotFound = errors.New("todo list not found")
var errOwnerRequired = errors.New("todo list owner required")
var errUserNotFound = errors.New("user not found")
var errMemberNotFound = errors.New("list member not found")
var errLastOwner = errors.New("todo list must have an owner")

type MemberRole string

const (
	MemberRoleMember MemberRole = "member"
	MemberRoleOwner  MemberRole = "owner"
)

type Service struct {
	db *pgxpool.Pool
}

type Handler struct {
	lists *Service
}

type TodoList struct {
	ID            string `json:"id" db:"id"`
	Name          string `json:"name" db:"name"`
	DefaultRuleID int64  `json:"default_rule_id" db:"default_rule_id"`
}

type Member struct {
	ID       int64      `json:"id" db:"id"`
	Username string     `json:"username" db:"username"`
	Nickname *string    `json:"nickname" db:"nickname"`
	Role     MemberRole `json:"role" db:"role"`
}

type listRequest struct {
	Name          string `json:"name" validate:"required,max=50"`
	DefaultRuleID int64  `json:"default_rule_id" validate:"gt=0"`
}

const listColumns = `
	id,
	name,
	default_rule_id
`

const listSelectColumns = `
	todo_lists.id,
	todo_lists.name,
	todo_lists.default_rule_id
`

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func NewHandler(lists *Service) *Handler {
	return &Handler{lists: lists}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /lists", requireAuth(http.HandlerFunc(h.createList)))
	mux.Handle("GET /lists", requireAuth(http.HandlerFunc(h.listLists)))
	mux.Handle("GET /lists/{list_id}", requireAuth(http.HandlerFunc(h.getList)))
	mux.Handle("PUT /lists/{list_id}", requireAuth(http.HandlerFunc(h.updateList)))
	mux.Handle("DELETE /lists/{list_id}", requireAuth(http.HandlerFunc(h.deleteList)))
	mux.Handle("GET /lists/{list_id}/members", requireAuth(http.HandlerFunc(h.listMembers)))
	mux.Handle("PUT /lists/{list_id}/members/{user_id}", requireAuth(http.HandlerFunc(h.addMember)))
	mux.Handle("DELETE /lists/{list_id}/members/{user_id}", requireAuth(http.HandlerFunc(h.deleteMember)))
	mux.Handle("PUT /lists/{list_id}/owners/{user_id}", requireAuth(http.HandlerFunc(h.promoteOwner)))
}

func ParseID(raw string) (string, error) {
	var id pgtype.UUID
	if err := id.Scan(raw); err != nil || !id.Valid {
		return "", errors.New("invalid todo list id")
	}
	return id.String(), nil
}

func (s *Service) DefaultRuleTx(ctx context.Context, tx pgx.Tx, listID string, userID int64) (int64, error) {
	var ruleID int64
	err := tx.QueryRow(
		ctx,
		`SELECT list.default_rule_id
		FROM todo_lists AS list
		JOIN todo_list_members AS member ON member.list_id = list.id
		WHERE list.id = @list_id AND member.user_id = @user_id
		FOR SHARE OF list`,
		pgx.StrictNamedArgs{"list_id": listID, "user_id": userID},
	).Scan(&ruleID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrListNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("load todo list: %w", err)
	}
	return ruleID, nil
}

func (s *Service) RequireMember(ctx context.Context, listID string, userID int64) error {
	var role MemberRole
	err := s.db.QueryRow(
		ctx,
		`SELECT role FROM todo_list_members
		WHERE list_id = @list_id AND user_id = @user_id`,
		pgx.StrictNamedArgs{"list_id": listID, "user_id": userID},
	).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrListNotFound
	}
	return err
}

func (h *Handler) createList(w http.ResponseWriter, r *http.Request) {
	req, err := readListRequest(r)
	if err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}
	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid list request")
		return
	}

	userID := auth.UserID(r.Context())
	var list TodoList
	err = pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		if err := requireRule(r.Context(), tx, req.DefaultRuleID); err != nil {
			return err
		}
		rows, err := tx.Query(
			r.Context(),
			`INSERT INTO todo_lists (name, default_rule_id)
			VALUES (@name, @default_rule_id)
			RETURNING `+listColumns,
			pgx.StrictNamedArgs{"name": req.Name, "default_rule_id": req.DefaultRuleID},
		)
		if err != nil {
			return err
		}
		list, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[TodoList])
		if err != nil {
			return err
		}
		_, err = tx.Exec(
			r.Context(),
			`INSERT INTO todo_list_members (list_id, user_id, role)
			VALUES (@list_id, @user_id, @role)`,
			pgx.StrictNamedArgs{"list_id": list.ID, "user_id": userID, "role": MemberRoleOwner},
		)
		return err
	})
	if errors.Is(err, todolistRuleNotFound) {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "unknown default_rule_id")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Location", "/api/lists/"+list.ID)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) listLists(w http.ResponseWriter, r *http.Request) {
	rows, err := h.lists.db.Query(
		r.Context(),
		`SELECT `+listSelectColumns+`
		FROM todo_lists
		JOIN todo_list_members ON todo_list_members.list_id = todo_lists.id
		WHERE todo_list_members.user_id = @user_id
		ORDER BY todo_lists.name, todo_lists.id`,
		pgx.StrictNamedArgs{"user_id": auth.UserID(r.Context())},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	lists, err := pgx.CollectRows(rows, pgx.RowToStructByName[TodoList])
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lists)
}

func (h *Handler) getList(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	list, err := h.findList(r.Context(), listID, auth.UserID(r.Context()))
	if errors.Is(err, ErrListNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) updateList(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	req, err := readListRequest(r)
	if err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}
	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid list request")
		return
	}

	var list TodoList
	err = pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		if err := lockOwnerList(r.Context(), tx, listID, auth.UserID(r.Context())); err != nil {
			return err
		}
		if err := requireRule(r.Context(), tx, req.DefaultRuleID); err != nil {
			return err
		}
		rows, err := tx.Query(
			r.Context(),
			`UPDATE todo_lists
			SET name = @name, default_rule_id = @default_rule_id
			WHERE id = @list_id
			RETURNING `+listColumns,
			pgx.StrictNamedArgs{"name": req.Name, "default_rule_id": req.DefaultRuleID, "list_id": listID},
		)
		if err != nil {
			return err
		}
		list, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[TodoList])
		return err
	})
	if writeMutationError(w, err) {
		return
	}
	if errors.Is(err, todolistRuleNotFound) {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "unknown default_rule_id")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *Handler) deleteList(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	err := pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		if err := lockOwnerList(r.Context(), tx, listID, auth.UserID(r.Context())); err != nil {
			return err
		}
		_, err := tx.Exec(r.Context(), "DELETE FROM todo_lists WHERE id = @list_id", pgx.StrictNamedArgs{"list_id": listID})
		return err
	})
	if writeMutationError(w, err) {
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listMembers(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	if err := h.lists.RequireMember(r.Context(), listID, auth.UserID(r.Context())); errors.Is(err, ErrListNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list not found")
		return
	} else if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	rows, err := h.lists.db.Query(
		r.Context(),
		`SELECT users.id, users.username, users.nickname, todo_list_members.role
		FROM users
		JOIN todo_list_members ON todo_list_members.user_id = users.id
		WHERE todo_list_members.list_id = @list_id
		ORDER BY todo_list_members.role DESC, users.id`,
		pgx.StrictNamedArgs{"list_id": listID},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	members, err := pgx.CollectRows(rows, pgx.RowToStructByName[Member])
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

func (h *Handler) addMember(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	memberID, ok := readUserID(w, r)
	if !ok {
		return
	}
	err := pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		if err := lockOwnerList(r.Context(), tx, listID, auth.UserID(r.Context())); err != nil {
			return err
		}
		var exists int
		err := tx.QueryRow(r.Context(), "SELECT 1 FROM users WHERE id = @user_id", pgx.StrictNamedArgs{"user_id": memberID}).Scan(&exists)
		if errors.Is(err, pgx.ErrNoRows) {
			return errUserNotFound
		}
		if err != nil {
			return err
		}
		_, err = tx.Exec(
			r.Context(),
			`INSERT INTO todo_list_members (list_id, user_id)
			VALUES (@list_id, @user_id)
			ON CONFLICT DO NOTHING`,
			pgx.StrictNamedArgs{"list_id": listID, "user_id": memberID},
		)
		return err
	})
	if writeMutationError(w, err) {
		return
	}
	if errors.Is(err, errUserNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) promoteOwner(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	memberID, ok := readUserID(w, r)
	if !ok {
		return
	}
	err := pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		if err := lockOwnerList(r.Context(), tx, listID, auth.UserID(r.Context())); err != nil {
			return err
		}
		res, err := tx.Exec(
			r.Context(),
			`UPDATE todo_list_members SET role = @role
			WHERE list_id = @list_id AND user_id = @user_id`,
			pgx.StrictNamedArgs{"role": MemberRoleOwner, "list_id": listID, "user_id": memberID},
		)
		if err != nil {
			return err
		}
		if res.RowsAffected() == 0 {
			return errMemberNotFound
		}
		return nil
	})
	if writeMutationError(w, err) {
		return
	}
	if errors.Is(err, errMemberNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list member not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteMember(w http.ResponseWriter, r *http.Request) {
	listID, ok := readListID(w, r)
	if !ok {
		return
	}
	memberID, ok := readUserID(w, r)
	if !ok {
		return
	}

	actorID := auth.UserID(r.Context())
	err := pgx.BeginFunc(r.Context(), h.lists.db, func(tx pgx.Tx) error {
		actorRole, err := lockMemberList(r.Context(), tx, listID, actorID)
		if err != nil {
			return err
		}
		if actorID != memberID && actorRole != MemberRoleOwner {
			return errOwnerRequired
		}

		var memberRole MemberRole
		err = tx.QueryRow(
			r.Context(),
			`SELECT role FROM todo_list_members
			WHERE list_id = @list_id AND user_id = @user_id`,
			pgx.StrictNamedArgs{"list_id": listID, "user_id": memberID},
		).Scan(&memberRole)
		if errors.Is(err, pgx.ErrNoRows) {
			return errMemberNotFound
		}
		if err != nil {
			return err
		}
		if memberRole == MemberRoleOwner {
			var ownerCount int
			if err := tx.QueryRow(
				r.Context(),
				`SELECT count(*) FROM todo_list_members
				WHERE list_id = @list_id AND role = @role`,
				pgx.StrictNamedArgs{"list_id": listID, "role": MemberRoleOwner},
			).Scan(&ownerCount); err != nil {
				return err
			}
			if ownerCount == 1 {
				return errLastOwner
			}
		}
		_, err = tx.Exec(
			r.Context(),
			"DELETE FROM todo_list_members WHERE list_id = @list_id AND user_id = @user_id",
			pgx.StrictNamedArgs{"list_id": listID, "user_id": memberID},
		)
		return err
	})
	if writeMutationError(w, err) {
		return
	}
	if errors.Is(err, errMemberNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list member not found")
		return
	}
	if errors.Is(err, errLastOwner) {
		httpx.WriteProblem(w, http.StatusConflict, "list must have an owner")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) findList(ctx context.Context, listID string, userID int64) (TodoList, error) {
	rows, err := h.lists.db.Query(
		ctx,
		`SELECT `+listSelectColumns+`
		FROM todo_lists
		JOIN todo_list_members ON todo_list_members.list_id = todo_lists.id
		WHERE todo_lists.id = @list_id AND todo_list_members.user_id = @user_id`,
		pgx.StrictNamedArgs{"list_id": listID, "user_id": userID},
	)
	if err != nil {
		return TodoList{}, err
	}
	list, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[TodoList])
	if errors.Is(err, pgx.ErrNoRows) {
		return TodoList{}, ErrListNotFound
	}
	return list, err
}

var todolistRuleNotFound = errors.New("todo rule not found")

func requireRule(ctx context.Context, tx pgx.Tx, ruleID int64) error {
	var exists int
	err := tx.QueryRow(ctx, "SELECT 1 FROM todo_rule WHERE id = @rule_id", pgx.StrictNamedArgs{"rule_id": ruleID}).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) {
		return todolistRuleNotFound
	}
	return err
}

func lockMemberList(ctx context.Context, tx pgx.Tx, listID string, userID int64) (MemberRole, error) {
	var role MemberRole
	err := tx.QueryRow(
		ctx,
		`SELECT member.role
		FROM todo_lists AS list
		JOIN todo_list_members AS member ON member.list_id = list.id
		WHERE list.id = @list_id AND member.user_id = @user_id
		FOR UPDATE OF list`,
		pgx.StrictNamedArgs{"list_id": listID, "user_id": userID},
	).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrListNotFound
	}
	return role, err
}

func lockOwnerList(ctx context.Context, tx pgx.Tx, listID string, userID int64) error {
	role, err := lockMemberList(ctx, tx, listID, userID)
	if err != nil {
		return err
	}
	if role != MemberRoleOwner {
		return errOwnerRequired
	}
	return nil
}

func writeMutationError(w http.ResponseWriter, err error) bool {
	if errors.Is(err, ErrListNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list not found")
		return true
	}
	if errors.Is(err, errOwnerRequired) {
		httpx.WriteProblem(w, http.StatusForbidden, "list owner required")
		return true
	}
	return false
}

func readListRequest(r *http.Request) (listRequest, error) {
	var req listRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		return listRequest{}, err
	}
	req.Name = strings.TrimSpace(req.Name)
	return req, nil
}

func readListID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, err := ParseID(r.PathValue("list_id"))
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return "", false
	}
	return id, true
}

func readUserID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("user_id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return 0, false
	}
	return id, true
}
