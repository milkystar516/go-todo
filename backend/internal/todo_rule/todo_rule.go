package todorule

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db *pgxpool.Pool
}

type CreateRuleRequest struct {
	Fields []FieldDefinition `json:"fields"`
}

type UpdateRuleRequest struct {
	Fields []FieldDefinition `json:"fields"`
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth func(http.Handler) http.Handler) {
	mux.Handle("POST /todo-rule", requireAuth(http.HandlerFunc(h.createRule)))
	mux.Handle("PUT /todo-rule/{rule_id}", requireAuth(http.HandlerFunc(h.updateRule)))
}

func (h *Handler) createRule(w http.ResponseWriter, r *http.Request) {
	req, err := readUpdateRuleRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	schema, err := Compile(req.Fields)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if _, err := NewContentValidator(schema); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err = h.db.Exec(
		r.Context(),
		`UPDATE todo_rules SET fields = EXCLUDED.fields`,
		req.Fields,
	)
	if err != nil {
		slog.ErrorContext(r.Context(), "update todo rule failed", "error", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateRule(w http.ResponseWriter, r *http.Request) {
	req, err := readUpdateRuleRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	schema, err := Compile(req.Fields)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if _, err := NewContentValidator(schema); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

func readUpdateRuleRequest(r *http.Request) (UpdateRuleRequest, error) {
	var req UpdateRuleRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return UpdateRuleRequest{}, err
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
