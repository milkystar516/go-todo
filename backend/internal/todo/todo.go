package todo

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
	todolist "github.com/milkystar516/go-todo/backend/internal/todo_list"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
	"github.com/milkystar516/go-todo/backend/internal/validation"
)

type Handler struct {
	db    *pgxpool.Pool
	rules *todorule.Service
	lists *todolist.Service
}

type Todo struct {
	ID          int64           `json:"id" db:"id"`
	OwnerID     int64           `json:"owner_id" db:"owner_id"`
	ListID      string          `json:"list_id" db:"list_id"`
	RuleID      int64           `json:"rule_id" db:"rule_id"`
	Title       string          `json:"title" db:"title"`
	DueAt       *time.Time      `json:"due_at" db:"due_at"`
	Content     json.RawMessage `json:"content" db:"content"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	CompletedAt *time.Time      `json:"completed_at" db:"completed_at"`
}

const todoColumns = `
	id,
	owner_id,
	list_id,
	rule_id,
	title,
	due_at,
	content,
	created_at,
	completed_at
`

type TodoCreateRequest struct {
	ListID  string          `json:"list_id" validate:"required"`
	RuleID  *int64          `json:"rule_id" validate:"omitempty,gt=0"`
	Title   string          `json:"title" validate:"required,min=1,max=200"`
	DueAt   *time.Time      `json:"due_at"`
	Content json.RawMessage `json:"content" validate:"required"`
}

type TodoUpdateRequest struct {
	Title   *string         `json:"title" validate:"omitempty,min=1,max=200"`
	DueAt   json.RawMessage `json:"due_at"`
	Content json.RawMessage `json:"content"`
}

var errInvalidTodoContent = errors.New("invalid todo content")

func NewHandler(db *pgxpool.Pool, rules *todorule.Service, lists *todolist.Service) *Handler {
	return &Handler{db: db, rules: rules, lists: lists}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /todos", requireAuth(http.HandlerFunc(h.createTodo)))
	mux.Handle("GET /users/{owner_id}/todos", requireAuth(http.HandlerFunc(h.getTodosByOwner)))
	mux.Handle("GET /lists/{list_id}/todos", requireAuth(http.HandlerFunc(h.getTodosByList)))
	mux.Handle("GET /todos/{todo_id}", requireAuth(http.HandlerFunc(h.getTodo)))
	mux.Handle("PATCH /todos/{todo_id}", requireAuth(http.HandlerFunc(h.updateTodo)))
	mux.Handle("PATCH /todos/{todo_id}/complete", requireAuth(http.HandlerFunc(h.toggleTodoComplete)))
	mux.Handle("DELETE /todos/{todo_id}", requireAuth(http.HandlerFunc(h.deleteTodo)))
}

func (h *Handler) createTodo(w http.ResponseWriter, r *http.Request) {
	var req TodoCreateRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid todo request")
		return
	}
	listID, err := todolist.ParseID(req.ListID)
	if err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid list_id")
		return
	}

	userID := auth.UserID(r.Context())

	var todo Todo

	err = pgx.BeginFunc(
		r.Context(),
		h.db,
		func(tx pgx.Tx) error {
			if err := h.lists.RequireMemberTx(
				r.Context(),
				tx,
				listID,
				userID,
			); err != nil {
				return err
			}

			ruleID := todorule.DefaultRuleID
			if req.RuleID != nil {
				ruleID = *req.RuleID
			}

			validator, err := h.rules.ValidatorTx(
				r.Context(),
				tx,
				ruleID,
			)
			if err != nil {
				return err
			}

			if err := validator.ValidateJSON(req.Content); err != nil {
				return errors.Join(errInvalidTodoContent, err)
			}

			rows, err := tx.Query(
				r.Context(),
				`INSERT INTO todos (owner_id, list_id, rule_id, title, due_at, content)
				VALUES (@owner_id, @list_id, @rule_id, @title, @due_at, @content)
				RETURNING `+todoColumns,
				pgx.StrictNamedArgs{
					"owner_id": userID,
					"list_id":  listID,
					"rule_id":  ruleID,
					"title":    req.Title,
					"due_at":   req.DueAt,
					"content":  req.Content,
				},
			)
			if err != nil {
				return err
			}

			todo, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Todo])
			return err
		},
	)
	if errors.Is(err, todolist.ErrListNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list not found")
		return
	}
	if errors.Is(err, todorule.ErrRuleNotFound) {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "unknown rule_id")
		return
	}
	if errors.Is(err, errInvalidTodoContent) {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid todo content")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Location", "/api/todos/"+strconv.FormatInt(todo.ID, 10))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) getTodo(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	rows, err := h.db.Query(
		r.Context(),
		`SELECT `+todoColumns+` FROM todos
		WHERE id = @todo_id
		  AND EXISTS (
			SELECT 1 FROM todo_list_members
			WHERE list_id = todos.list_id AND user_id = @user_id
		  )`,
		pgx.StrictNamedArgs{
			"todo_id": todoID,
			"user_id": auth.UserID(r.Context()),
		},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	todo, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Todo])
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) getTodosByOwner(w http.ResponseWriter, r *http.Request) {
	ownerID, err := strconv.ParseInt(r.PathValue("owner_id"), 10, 64)
	if err != nil || ownerID <= 0 {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var todos []Todo
	err = pgx.BeginFunc(r.Context(), h.db, func(tx pgx.Tx) error {
		var exists int
		if err := tx.QueryRow(
			r.Context(),
			"SELECT 1 FROM users WHERE id = @owner_id FOR SHARE",
			pgx.StrictNamedArgs{"owner_id": ownerID},
		).Scan(&exists); err != nil {
			return err
		}

		todos, err = h.findTodosByOwner(r.Context(), tx, ownerID, auth.UserID(r.Context()))
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func (h *Handler) findTodosByOwner(ctx context.Context, tx pgx.Tx, ownerID, userID int64) ([]Todo, error) {
	rows, err := tx.Query(
		ctx,
		`SELECT `+todoColumns+`FROM todos
		WHERE owner_id = @owner_id
		  AND EXISTS (
			SELECT 1 FROM todo_list_members
			WHERE list_id = todos.list_id AND user_id = @user_id
		  )
		ORDER BY id`,
		pgx.StrictNamedArgs{
			"owner_id": ownerID,
			"user_id":  userID,
		},
	)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, pgx.RowToStructByName[Todo])
}

func (h *Handler) getTodosByList(w http.ResponseWriter, r *http.Request) {
	listID, err := todolist.ParseID(r.PathValue("list_id"))
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	userID := auth.UserID(r.Context())
	if err := h.lists.RequireMember(r.Context(), listID, userID); errors.Is(err, todolist.ErrListNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "list not found")
		return
	} else if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	rows, err := h.db.Query(
		r.Context(),
		`SELECT `+todoColumns+` FROM todos
		WHERE list_id = @list_id
		ORDER BY id`,
		pgx.StrictNamedArgs{"list_id": listID},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}
	todos, err := pgx.CollectRows(rows, pgx.RowToStructByName[Todo])
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func (h *Handler) updateTodo(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var req TodoUpdateRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid todo request")
		return
	}

	setTitle := req.Title != nil
	setDueAt := len(req.DueAt) > 0
	setContent := len(req.Content) > 0
	if !setTitle && !setDueAt && !setContent {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "empty todo update")
		return
	}

	var dueAt *time.Time
	if setDueAt {
		if err := json.Unmarshal(req.DueAt, &dueAt); err != nil {
			httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid due_at")
			return
		}
	}

	userID := auth.UserID(r.Context())

	var todo Todo

	err = pgx.BeginFunc(
		r.Context(),
		h.db,
		func(tx pgx.Tx) error {
			var ruleID int64

			err := tx.QueryRow(
				r.Context(),
				`SELECT rule_id FROM todos
				WHERE id = @todo_id
				  AND EXISTS (
					SELECT 1 FROM todo_list_members AS member
					WHERE member.list_id = todos.list_id
					  AND member.user_id = @user_id
					  AND (todos.owner_id = @user_id OR member.role = @owner_role)
				  )`,
				pgx.StrictNamedArgs{
					"todo_id":    todoID,
					"user_id":    userID,
					"owner_role": todolist.MemberRoleOwner,
				},
			).Scan(&ruleID)
			if err != nil {
				return err
			}

			if setContent {
				validator, err := h.rules.ValidatorTx(r.Context(), tx, ruleID)
				if err != nil {
					return err
				}

				if err := validator.ValidateJSON(req.Content); err != nil {
					return errors.Join(errInvalidTodoContent, err)
				}
			}

			rows, err := tx.Query(
				r.Context(),
				`UPDATE todos
				SET title = CASE WHEN @set_title THEN @title ELSE title END,
				    due_at = CASE WHEN @set_due_at THEN @due_at ELSE due_at END,
				    content = CASE WHEN @set_content THEN @content ELSE content END
				WHERE id = @todo_id
				  AND EXISTS (
					SELECT 1 FROM todo_list_members AS member
					WHERE member.list_id = todos.list_id
					  AND member.user_id = @user_id
					  AND (todos.owner_id = @user_id OR member.role = @owner_role)
				  )
				RETURNING `+todoColumns,
				pgx.StrictNamedArgs{
					"set_title":   setTitle,
					"title":       req.Title,
					"set_due_at":  setDueAt,
					"due_at":      dueAt,
					"set_content": setContent,
					"content":    req.Content,
					"todo_id":    todoID,
					"user_id":    userID,
					"owner_role": todolist.MemberRoleOwner,
				},
			)
			if err != nil {
				return err
			}

			todo, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Todo])
			return err
		},
	)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo not found")
		return
	}
	if errors.Is(err, errInvalidTodoContent) {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid todo content")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) toggleTodoComplete(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var todo Todo

	userID := auth.UserID(r.Context())

	rows, err := h.db.Query(
		r.Context(),
		`UPDATE todos 
		SET completed_at = CASE
			WHEN completed_at IS NULL THEN now()
			ELSE NULL
		END
		WHERE id = @todo_id
		  AND EXISTS (
			SELECT 1 FROM todo_list_members AS member
			WHERE member.list_id = todos.list_id
			  AND member.user_id = @user_id
			  AND (todos.owner_id = @user_id OR member.role = @owner_role)
		  )
		RETURNING `+todoColumns,
		pgx.StrictNamedArgs{
			"todo_id":    todoID,
			"user_id":    userID,
			"owner_role": todolist.MemberRoleOwner,
		},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	todo, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Todo])
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) deleteTodo(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	userID := auth.UserID(r.Context())

	res, err := h.db.Exec(
		r.Context(),
		`DELETE FROM todos
		WHERE id = @todo_id
		  AND EXISTS (
			SELECT 1 FROM todo_list_members AS member
			WHERE member.list_id = todos.list_id
			  AND member.user_id = @user_id
			  AND (todos.owner_id = @user_id OR member.role = @owner_role)
		  )`,
		pgx.StrictNamedArgs{
			"todo_id":    todoID,
			"user_id":    userID,
			"owner_role": todolist.MemberRoleOwner,
		},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	if res.RowsAffected() == 0 {
		httpx.WriteProblem(w, http.StatusNotFound, "todo not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
