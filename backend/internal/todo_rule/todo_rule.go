package todorule

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
)

type Handler struct {
	db *pgxpool.Pool
}

type ruleRequest struct {
	RuleName string            `json:"rule_name" validate:"max=50"`
	Fields   []FieldDefinition `json:"fields"`
}

type ruleResponse struct {
	ID       int64  `json:"id"`
	RuleName string `json:"rule_name"`
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /todo-rule", requireAuth(http.HandlerFunc(h.createRule)))
	mux.Handle("PUT /todo-rule/{rule_id}", requireAuth(http.HandlerFunc(h.updateRule)))
}

func (h *Handler) createRule(w http.ResponseWriter, r *http.Request) {
	req, err := readRuleRequest(r)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var rule ruleResponse

	err = h.db.QueryRow(
		r.Context(),
		`INSERT INTO todo_rule (rule_name, fields)
		VALUES ($1, $2)
		RETURNING rule_name, id`,
		req.RuleName,
		req.Fields,
	).Scan(&ruleID)
	if err != nil {
		slog.ErrorContext(r.Context(), "create todo rule failed", "error", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(map[string]int64{
		"id": ruleID,
	}); err != nil {
		slog.ErrorContext(r.Context(), "encode todo rule response failed", "error", err)
	}
}

func (h *Handler) updateRule(w http.ResponseWriter, r *http.Request) {
	req, err := readRuleRequest(r)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	validator, err := Compile(req.Fields)

	var validationErr *validationError

	if errors.As(err, &validationErr) {
		http.Error(w, validationErr.Error(), http.StatusBadRequest)
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	_, err = h.db.Exec(
		r.Context(),
		`INSERT INTO todo_rule (fields) SET fields = EXCLUDED.fields`,
		req.Fields,
	)
	if err != nil {
		slog.ErrorContext(r.Context(), "update todo rule failed", "error", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func readRuleRequest(r *http.Request) (ruleRequest, error) {
	var req ruleRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		return ruleRequest{}, err
	}

	for i := range req.Fields {
		field := &req.Fields[i]

		field.Key = strings.TrimSpace(field.Key)
		field.Label = strings.TrimSpace(field.Label)
		field.Type = FieldType(strings.TrimSpace(string(field.Type)))

		for j := range field.Options {
			field.Options[j] = strings.TrimSpace(field.Options[j])
		}
	}

	return req, nil
}
