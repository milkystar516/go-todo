package auth

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
	"github.com/milkystar516/go-todo/backend/internal/validation"
	"golang.org/x/crypto/bcrypt"
)

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

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
	Username string  `json:"username" validate:"required,max=50,username"`
	Nickname *string `json:"nickname" validate:"omitempty,max=50"`
	Password string  `json:"password" validate:"required"`
}

type LoginRequest struct {
	Username string `json:"username" validate:"required,max=50"`
	Password string `json:"password" validate:"required"`
}

type updateUserRequest struct {
	Role Role `json:"role" validate:"required,oneof=user admin"`
}

type loginUser struct {
	ID           int64
	PasswordHash string
}

type publicUserResponse struct {
	ID       int64   `json:"id" db:"id"`
	Username string  `json:"username" db:"username"`
	Nickname *string `json:"nickname" db:"nickname"`
	Role     Role    `json:"role" db:"role"`
}

const publicUserColumns = `
	id,
	username,
	nickname,
	role
`

type contextKey string

const userIDKey contextKey = "userID"

var errUsernameExists = errors.New("username already exists")

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
	mux.Handle("GET /me", h.RequireAuth(http.HandlerFunc(h.me)))
	mux.Handle("GET /users/{user_id}", h.RequireAuth(http.HandlerFunc(h.getUser)))
	mux.Handle("PATCH /users/{user_id}", h.RequireAuth(h.RequireAdmin(http.HandlerFunc(h.updateUser))))
}

func (h *Handler) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(h.cfg.CookieName)
		if err != nil {
			httpx.WriteTypedProblem(w, httpx.ProblemAuthenticationRequired, "unauthorized")
			return
		}

		userID, err := findSessionUser(r.Context(), h.db, cookie.Value)
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.WriteTypedProblem(w, httpx.ProblemAuthenticationRequired, "unauthorized")
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

func (h *Handler) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := h.findPublicUser(r.Context(), UserID(r.Context()))
		if err != nil {
			httpx.ServerError(w, r, err)
			return
		}

		if user.Role != RoleAdmin {
			httpx.WriteProblem(w, http.StatusForbidden, "forbidden")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func UserID(ctx context.Context) int64 {
	return ctx.Value(userIDKey).(int64)
}

func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid signup request")
		return
	}

	err := createUser(r.Context(), h.db, req)
	switch {
	case errors.Is(err, errUsernameExists):
		httpx.WriteTypedProblem(w, httpx.ProblemUsernameTaken, "username already exists")
		return

	case errors.Is(err, bcrypt.ErrPasswordTooLong):
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "password is too long")
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
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid login request")
		return
	}

	user, err := findUser(r.Context(), h.db, req.Username)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteTypedProblem(w, httpx.ProblemInvalidCredentials, "invalid username or password")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	err = checkPassword(user, req.Password)
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		httpx.WriteTypedProblem(w, httpx.ProblemInvalidCredentials, "invalid username or password")
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

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	user, err := h.findPublicUser(r.Context(), UserID(r.Context()))
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) getUser(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(r.PathValue("user_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	user, err := h.findPublicUser(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.ParseInt(r.PathValue("user_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var req updateUserRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid user request")
		return
	}

	if userID == UserID(r.Context()) {
		httpx.WriteTypedProblem(w, httpx.ProblemCannotChangeOwnRole, "cannot change own role")
		return
	}

	rows, err := h.db.Query(
		r.Context(),
		`UPDATE users SET role = @role
		WHERE id = @user_id
		RETURNING `+publicUserColumns,
		pgx.StrictNamedArgs{
			"role":    req.Role,
			"user_id": userID,
		},
	)
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	user, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[publicUserResponse])
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteProblem(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) findPublicUser(ctx context.Context, userID int64) (publicUserResponse, error) {
	rows, err := h.db.Query(
		ctx,
		"SELECT "+publicUserColumns+" FROM users WHERE id = @user_id",
		pgx.StrictNamedArgs{
			"user_id": userID,
		},
	)
	if err != nil {
		return publicUserResponse{}, err
	}

	return pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[publicUserResponse])
}

func createUser(ctx context.Context, db *pgxpool.Pool, req SignupRequest) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	result, err := db.Exec(
		ctx,
		`INSERT INTO users (username, nickname, password_hash) VALUES ($1, $2, $3)
		ON CONFLICT (username) DO NOTHING`,
		req.Username,
		req.Nickname,
		string(hash),
	)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	if result.RowsAffected() == 0 {
		return errUsernameExists
	}

	return nil
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
