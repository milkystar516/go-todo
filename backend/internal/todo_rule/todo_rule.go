package todorule

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/milkystar516/go-todo/backend/internal/httpx"
	"github.com/milkystar516/go-todo/backend/internal/validation"
)

type Handler struct {
	rules *Service
}

type ruleRequest struct {
	RuleName string            `json:"rule_name" validate:"required,max=50"`
	Fields   []FieldDefinition `json:"fields"`
}

type ruleTitleRequest struct {
	RuleName string `json:"rule_name" validate:"required,max=50"`
}

type ruleResponse struct {
	ID       int64  `json:"id" db:"id"`
	RuleName string `json:"rule_name" db:"rule_name"`
}

type ruleDetailResponse struct {
	ID       int64             `json:"id" db:"id"`
	RuleName string            `json:"rule_name" db:"rule_name"`
	Fields   []FieldDefinition `json:"fields" db:"fields"`
	Schema   JSONSchema        `json:"schema" db:"-"`
}

const ruleResponseColumns = `
	id,
	rule_name
`

const ruleDetailResponseColumns = `
	id,
	rule_name,
	fields
`

func NewHandler(rules *Service) *Handler {
	return &Handler{rules: rules}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, requireAuth, requireAdmin func(http.Handler) http.Handler) {
	mux.Handle("POST /todo-rules", requireAuth(requireAdmin(http.HandlerFunc(h.createRule))))
	mux.Handle("GET /todo-rules", requireAuth(http.HandlerFunc(h.todosRulesList)))
	mux.Handle("GET /todo-rules/{rule_id}", requireAuth(http.HandlerFunc(h.getTodoRule)))
	mux.Handle("PUT /todo-rules/{rule_id}", requireAuth(requireAdmin(http.HandlerFunc(h.updateRule))))
	mux.Handle("PATCH /todo-rules/{rule_id}", requireAuth(requireAdmin(http.HandlerFunc(h.updateRuleTitle))))
	mux.Handle("DELETE /todo-rules/{rule_id}", requireAuth(requireAdmin(http.HandlerFunc(h.deleteRule))))
}

func (h *Handler) createRule(w http.ResponseWriter, r *http.Request) {
	req, err := readRuleRequest(r)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid rule request")
		return
	}

	rule, err := h.rules.CreateTodoRule(r.Context(), req.RuleName, req.Fields)

	if validationErr, ok := errors.AsType[*validationError](err); ok {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, validationErr.Error())
		return
	}

	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Location", "/api/todo-rules/"+strconv.FormatInt(rule.ID, 10))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rule)
}

func (h *Handler) getTodoRule(w http.ResponseWriter, r *http.Request) {
	ruleID, err := strconv.ParseInt(r.PathValue("rule_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	rule, err := h.rules.GetTodoRule(r.Context(), ruleID)
	if errors.Is(err, ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo rule not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}

func (h *Handler) todosRulesList(w http.ResponseWriter, r *http.Request) {
	rules, err := h.rules.ListTodoRules(r.Context())
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}

func (h *Handler) updateRule(w http.ResponseWriter, r *http.Request) {
	ruleID, err := strconv.ParseInt(r.PathValue("rule_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	req, err := readRuleRequest(r)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid rule request")
		return
	}

	rule, err := h.rules.UpdateTodoRule(r.Context(), ruleID, req.RuleName, req.Fields)

	if validationErr, ok := errors.AsType[*validationError](err); ok {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, validationErr.Error())
		return
	}
	if errors.Is(err, ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo rule not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}

func (h *Handler) updateRuleTitle(w http.ResponseWriter, r *http.Request) {
	ruleID, err := strconv.ParseInt(r.PathValue("rule_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	var req ruleTitleRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	req.RuleName = strings.TrimSpace(req.RuleName)

	if err := validation.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid rule request")
		return
	}

	rule, err := h.rules.UpdateTodoRuleTitle(r.Context(), ruleID, req.RuleName)
	if errors.Is(err, ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo rule not found")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}

func (h *Handler) deleteRule(w http.ResponseWriter, r *http.Request) {
	ruleID, err := strconv.ParseInt(r.PathValue("rule_id"), 10, 64)
	if err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	err = h.rules.DeleteTodoRule(r.Context(), ruleID)
	if errors.Is(err, ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo rule not found")
		return
	}
	if errors.Is(err, ErrRuleInUse) {
		httpx.WriteProblem(w, http.StatusConflict, "todo rule is in use")
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func readRuleRequest(r *http.Request) (ruleRequest, error) {
	var req ruleRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
		return ruleRequest{}, err
	}

	req.RuleName = strings.TrimSpace(req.RuleName)

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
