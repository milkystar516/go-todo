package todo

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/auth"
)

type Handler struct {
	db *pgxpool.Pool
}

type Todo struct {
	ID          int64     `json:"id"`
	OwnerID     int64     `json:"owner_id"`
	Title       string    `json:"title"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt time.Time `json:"completed_at"`
}

type TodoCreateRequest struct {
	Title string `json:"title"`
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /todos", requireAuth(http.HandlerFunc(h.createTodo)))
	mux.Handle("GET /todos", requireAuth(http.HandlerFunc(h.todosList)))
}

func (h *Handler) createTodo(w http.ResponseWriter, r *http.Request) {
	var req TodoCreateRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	userID := auth.UserID(r.Context())

	var todo Todo

	err := h.db.QueryRow(
		r.Context(),
		`INSERT INTO todos (owner_id, title) VALUES ($1, $2)
		RETURNING id, owner_id, title, created_at, completed_at`,
		userID,
		req.Title,
	).Scan(
		&todo.ID,
		&todo.OwnerID,
		&todo.Title,
		&todo.CreatedAt,
		&todo.CompletedAt,
	)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(todo)
}

func (h *Handler) todosList(w http.ResponseWriter, r *http.Request) {
	ownerID := auth.UserID(r.Context())

	todos, err := h.getTodos(r.Context(), h.db, ownerID)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func (h *Handler) getTodos(ctx context.Context, db *pgxpool.Pool, ownerID int64) ([]Todo, error) {
	rows, err := db.Query(
		ctx,
		"SELECT * FROM todos WHERE owner_id = $1 ORDER BY id",
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
			&todo.Title,
			&todo.CreatedAt,
			&todo.CompletedAt,
		); err != nil {
			return nil, err
		}

		todos = append(todos, todo)
	}

	return todos, rows.Err()
}
