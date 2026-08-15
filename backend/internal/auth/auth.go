package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
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
	Username string  `json:"username"`
	Nickname *string `json:"nickname"`
	Password string  `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
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
}

func (h *Handler) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(h.cfg.CookieName)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := findSessionUser(r.Context(), h.db, cookie.Value)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
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
	req, err := readSignupRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if err := createUser(r.Context(), h.db, req); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	user, err := findUser(r.Context(), h.db, req.Username)
	if err != nil {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	if err := checkPassword(user, req.Password); err != nil {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	token, err := createSession(r.Context(), h.db, user.ID, h.cfg.SessionTTL)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
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

func createSession(ctx context.Context, db *pgxpool.Pool, userID int64, ttl time.Duration) (string, error) {
	token, err := generateSessionToken()
	if err != nil {
		return "", err
	}

	expiresAt := time.Now().Add(ttl)

	_, err = db.Exec(
		ctx,
		"INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
		token,
		userID,
		expiresAt,
	)

	return token, err
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

func generateSessionToken() (string, error) {
	bytes := make([]byte, 32)

	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(bytes), nil
}
