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
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

type Handler struct {
	db    *pgxpool.Pool
	rules *todorule.Service
}

type Todo struct {
	ID          int64          `json:"id" db:"id"`
	OwnerID     int64          `json:"owner_id" db:"owner_id"`
	RuleID      int64          `json:"rule_id" db:"rule_id"`
	Content     map[string]any `json:"content" db:"content"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
	CompletedAt *time.Time     `json:"completed_at" db:"completed_at"`
}

const todoColumns = `
	id,
	owner_id,
	rule_id,
	content,
	created_at,
	completed_at
`

type TodoCreateRequest struct {
	RuleID  int64          `json:"rule_id" validate:"gt=0"`
	Content map[string]any `json:"content" validate:"required"`
}

type TodoUpdateRequest struct {
	Content map[string]any `json:"content" validate:"required"`
}

var errInvalidTodoContent = errors.New("invalid todo content")

func NewHandler(db *pgxpool.Pool, rules *todorule.Service) *Handler {
	return &Handler{db: db, rules: rules}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /todos", requireAuth(http.HandlerFunc(h.createTodo)))
	mux.Handle("GET /todos", requireAuth(http.HandlerFunc(h.todosList)))
	mux.Handle("PATCH /todos/{todo_id}", requireAuth(http.HandlerFunc(h.updateTodo)))
	mux.Handle("PATCH /todos/{todo_id}/complete", requireAuth(http.HandlerFunc(h.toggleTodoComplete)))
	mux.Handle("DELETE /todos/{todo_id}", requireAuth(http.HandlerFunc(h.deleteTodo)))
}

func (h *Handler) createTodo(w http.ResponseWriter, r *http.Request) {
	var req TodoCreateRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid todo request")
		return
	}

	userID := auth.UserID(r.Context())

	var todo Todo

	err := pgx.BeginFunc(
		r.Context(),
		h.db,
		func(tx pgx.Tx) error {
			validator, err := h.rules.ValidatorTx(
				r.Context(),
				tx,
				req.RuleID,
			)
			if err != nil {
				return err
			}

			if err := validator.Validate(req.Content); err != nil {
				return errors.Join(errInvalidTodoContent, err)
			}

			rows, err := tx.Query(
				r.Context(),
				`INSERT INTO todos (owner_id, rule_id, content)
				VALUES (@owner_id, @rule_id, @content)
				RETURNING `+todoColumns,
				pgx.StrictNamedArgs{
					"owner_id": userID,
					"rule_id":  req.RuleID,
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
	if errors.Is(err, todorule.ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "unknown rule_id")
		return
	}
	if errors.Is(err, errInvalidTodoContent) {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid todo content")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Location", "/todos/"+strconv.FormatInt(todo.ID, 10))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) todosList(w http.ResponseWriter, r *http.Request) {
	ownerID := auth.UserID(r.Context())

	todos, err := h.getTodos(r.Context(), ownerID)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func (h *Handler) getTodos(ctx context.Context, ownerID int64) ([]Todo, error) {
	rows, err := h.db.Query(
		ctx,
		`SELECT `+todoColumns+
			`FROM todos WHERE owner_id = @owner_id
		ORDER BY id`,
		pgx.StrictNamedArgs{
			"owner_id": ownerID,
		},
	)
	if err != nil {
		return nil, err
	}

	return pgx.CollectRows(rows, pgx.RowToStructByName[Todo])
}

func (h *Handler) updateTodo(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var req TodoUpdateRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid todo request")
		return
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
				"SELECT rule_id FROM todos WHERE id = @todo_id AND owner_id = @owner_id",
				pgx.StrictNamedArgs{
					"todo_id":  todoID,
					"owner_id": userID,
				},
			).Scan(&ruleID)
			if err != nil {
				return err
			}

			validator, err := h.rules.ValidatorTx(r.Context(), tx, ruleID)
			if err != nil {
				return err
			}

			if err := validator.Validate(req.Content); err != nil {
				return errors.Join(errInvalidTodoContent, err)
			}

			rows, err := tx.Query(
				r.Context(),
				`UPDATE todos SET content = @content
				WHERE id = @todo_id AND owner_id = @owner_id
				RETURNING `+todoColumns,
				pgx.StrictNamedArgs{
					"content":  req.Content,
					"todo_id":  todoID,
					"owner_id": userID,
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
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid todo content")
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
		WHERE id = @todo_id AND owner_id = @owner_id
		RETURNING `+todoColumns,
		pgx.StrictNamedArgs{
			"todo_id":  todoID,
			"owner_id": userID,
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
		"DELETE FROM todos WHERE id = @todo_id AND owner_id = @owner_id",
		pgx.StrictNamedArgs{
			"todo_id":  todoID,
			"owner_id": userID,
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
