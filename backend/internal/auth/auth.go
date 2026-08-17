package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
	"golang.org/x/crypto/bcrypt"
)

var errUsernameExists = errors.New("username already exists")

type Config struct {
	CookieName string
	SessionTTL time.Duration
	Secure     bool
}

type Handler struct {
	db  *pgxpool.Pool
	cfg Config
}

type SignupRequest struct {
	Username string  `json:"username" validate:"max=50"`
	Nickname *string `json:"nickname" validate:"omitempty,max=50"`
	Password string  `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username" validate:"max=50"`
	Password string `json:"password"`
}

type loginUser struct {
	ID           int64
	PasswordHash string
}

type contextKey string

const userIDKey contextKey = "userID"

func NewHandler(db *pgxpool.Pool, cfg Config) *Handler {
	return &Handler{
		db:  db,
		cfg: cfg,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /signup", h.signup)
	mux.HandleFunc("POST /login", h.login)
	mux.HandleFunc("DELETE /logout", h.logout)
}

func (h *Handler) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(h.cfg.CookieName)
		if err != nil {
			httpx.WriteProblem(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		userID, err := findSessionUser(r.Context(), h.db, cookie.Value)
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.WriteProblem(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		if err != nil {
			httpx.ServerError(w, r, err)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserID(ctx context.Context) int64 {
	return ctx.Value(userIDKey).(int64)
}

func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid signup request")
		return
	}

	err := createUser(r.Context(), h.db, req)
	switch {
	case errors.Is(err, errUsernameExists):
		httpx.WriteProblem(w, http.StatusConflict, "username already exists")
		return

	case errors.Is(err, bcrypt.ErrPasswordTooLong):
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "password is too long")
		return

	case err != nil:
		httpx.ServerError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid login request")
		return
	}

	user, err := findUser(r.Context(), h.db, req.Username)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	err = checkPassword(user, req.Password)
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		httpx.WriteProblem(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	token, err := createSession(r.Context(), h.db, user.ID, h.cfg.SessionTTL)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.CookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.Secure,
		Expires:  time.Now().Add(h.cfg.SessionTTL),
	})

	w.WriteHeader(http.StatusOK)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cfg.CookieName)
	if err == nil {
		if err := deleteSession(r.Context(), h.db, cookie.Value); err != nil {
			httpx.ServerError(w, r, err)
			return
		}
	}

	c := &http.Cookie{
		Name:     h.cfg.CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.Secure,
		Expires:  time.Now(),
	}

	http.SetCookie(w, c)
	w.WriteHeader(http.StatusNoContent)
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

	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) &&
		pgErr.Code == "23505" &&
		pgErr.ConstraintName == "users_username_key" {

		return errUsernameExists
	}

	return fmt.Errorf("insert user: %w", err)
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

func createSession(ctx context.Context, db *pgxpool.Pool, userID int64, ttl time.Duration) (string, error) {
	token := rand.Text()
	expiresAt := time.Now().Add(ttl)

	_, err := db.Exec(
		ctx,
		"INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
		token,
		userID,
		expiresAt,
	)

	return token, err
}

func deleteSession(ctx context.Context, db *pgxpool.Pool, token string) error {
	_, err := db.Exec(
		ctx,
		"DELETE FROM sessions WHERE token = $1",
		token,
	)

	return err
}

func findSessionUser(ctx context.Context, db *pgxpool.Pool, token string) (int64, error) {
	var userID int64

	err := db.QueryRow(
		ctx,
		"SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
		token,
	).Scan(&userID)

	return userID, err
}

func checkPassword(user loginUser, password string) error {
	return bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(password),
	)
}
