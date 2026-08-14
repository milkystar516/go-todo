package auth

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type SignupRequest struct {
	Username string  `json:"username"`
	Nickname *string `json:"nickname"`
	Password string  `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginUser struct {
	ID           string
	PasswordHash string
}

func RegisterRoutes(mux *http.ServeMux, db *pgxpool.Pool) {
	mux.HandleFunc("POST /signup", func(w http.ResponseWriter, r *http.Request) {
		signup(w, r, db)
	})

	mux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		login(w, r, db)
	})
}

func signup(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool) {
	req, err := readSignupRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if err := createUser(r.Context(), db, req); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func login(w http.ResponseWriter, r *http.Request, db *pgxpool.Pool) {
	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	user, err := findUser(r.Context(), db, req.Username)
	if err != nil {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	if err := checkPassword(user, req.Password); err != nil {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func readSignupRequest(r *http.Request) (SignupRequest, error) {
	var req SignupRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	return req, err
}

func createUser(ctx context.Context, db *pgxpool.Pool, req SignupRequest) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = db.Exec(
		ctx,
		"INSERT INTO users (username, nickname, password_hash) VALUES ($1, $2, $3)",
		req.Username,
		req.Nickname,
		string(hash),
	)

	return err
}

func findUser(ctx context.Context, db *pgxpool.Pool, username string) (loginUser, error) {
	var user loginUser

	err := db.QueryRow(
		ctx,
		"SELECT id, password_hash FROM users WHERE username = $1",
		username,
	).Scan(
		&user.ID,
		&user.PasswordHash,
	)

	return user, err
}

func checkPassword(user loginUser, password string) error {
	return bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(password),
	)
}
