package todo

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db *pgxpool.Pool
}

type Todo struct {
	ID        int64     `json:"id"`
	OwnerID   int64     `json:"owner_id"`
	Title     string    `json:"title"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TodoCreateRequest struct {
	Title string `json:"title"`
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}
