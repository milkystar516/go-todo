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
)

type Handler struct {
	db *pgxpool.Pool
}

type Todo struct {
	ID          int64          `json:"id"`
	OwnerID     int64          `json:"owner_id"`
	Content     map[string]any `json:"content"`
	CreatedAt   time.Time      `json:"created_at"`
	CompletedAt *time.Time     `json:"completed_at"`
}

type TodoCreateRequest struct {
	Content map[string]any `json:"content" validate:"required"`
}

type TodoUpdateRequest struct {
	Content map[string]any `json:"content" validate:"required"`
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
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

	err := h.db.QueryRow(
		r.Context(),
		`INSERT INTO todos (owner_id, content) VALUES ($1, $2)
		RETURNING id, owner_id, content, created_at, completed_at`,
		userID,
		req.Content,
	).Scan(
		&todo.ID,
		&todo.OwnerID,
		&todo.Content,
		&todo.CreatedAt,
		&todo.CompletedAt,
	)
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
		`SELECT id, owner_id, content, created_at, completed_at 
		FROM todos WHERE owner_id = $1 
		ORDER BY id`,
		ownerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []Todo

	for rows.Next() {
		var todo Todo

		if err := rows.Scan(
			&todo.ID,
			&todo.OwnerID,
			&todo.Content,
			&todo.CreatedAt,
			&todo.CompletedAt,
		); err != nil {
			return nil, err
		}

		todos = append(todos, todo)
	}

	return todos, rows.Err()
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

	err = h.db.QueryRow(
		r.Context(),
		`UPDATE todos SET content = $1
		WHERE id = $2 AND owner_id = $3
		RETURNING id, owner_id, content, created_at, completed_at`,
		req.Content,
		todoID,
		userID,
	).Scan(
		&todo.ID,
		&todo.OwnerID,
		&todo.Content,
		&todo.CreatedAt,
		&todo.CompletedAt,
	)

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

func (h *Handler) toggleTodoComplete(w http.ResponseWriter, r *http.Request) {
	todoID, err := strconv.ParseInt(r.PathValue("todo_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var todo Todo

	userID := auth.UserID(r.Context())

	err = h.db.QueryRow(
		r.Context(),
		`UPDATE todos 
		SET completed_at = CASE
			WHEN completed_at IS NULL THEN now()
			ELSE NULL
		END
		WHERE id = $1 AND owner_id = $2
		RETURNING id, owner_id, content, created_at, completed_at`,
		todoID,
		userID,
	).Scan(
		&todo.ID,
		&todo.OwnerID,
		&todo.Content,
		&todo.CreatedAt,
		&todo.CompletedAt,
	)

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
		"DELETE FROM todos WHERE id = $1 AND owner_id = $2",
		todoID,
		userID,
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
