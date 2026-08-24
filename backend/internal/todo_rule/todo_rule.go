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
	RuleName      string          `json:"rule_name" validate:"required,max=50"`
	ContentSchema json.RawMessage `json:"content_schema" validate:"required"`
	UISchema      json.RawMessage `json:"ui_schema" validate:"required"`
	ListColumns   []ListColumn    `json:"list_columns" validate:"dive"`
}

type ruleTitleRequest struct {
	RuleName string `json:"rule_name" validate:"required,max=50"`
}

type ruleResponse struct {
	ID       int64  `json:"id" db:"id"`
	RuleName string `json:"rule_name" db:"rule_name"`
}

type ruleDetailResponse struct {
	ID            int64           `json:"id" db:"id"`
	RuleName      string          `json:"rule_name" db:"rule_name"`
	ContentSchema json.RawMessage `json:"content_schema" db:"content_schema"`
	UISchema      json.RawMessage `json:"ui_schema" db:"ui_schema"`
	ListColumns   []ListColumn    `json:"list_columns" db:"list_columns"`
}

func (r ruleDetailResponse) definition() RuleDefinition {
	return RuleDefinition{
		ContentSchema: r.ContentSchema,
		UISchema:      r.UISchema,
		ListColumns:   r.ListColumns,
	}
}

const ruleResponseColumns = `
	id,
	rule_name
`

const ruleDetailResponseColumns = `
	id,
	rule_name,
	content_schema,
	ui_schema,
	list_columns
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
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid rule request")
		return
	}

	rule, err := h.rules.CreateTodoRule(r.Context(), req.RuleName, req.definition())

	if validationErr, ok := errors.AsType[*validationError](err); ok {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, validationErr.Error())
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
		httpx.WriteDecodeProblem(w, err)
		return
	}

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid rule request")
		return
	}

	rule, err := h.rules.UpdateTodoRule(r.Context(), ruleID, req.RuleName, req.definition())

	if validationErr, ok := errors.AsType[*validationError](err); ok {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, validationErr.Error())
		return
	}
	if errors.Is(err, ErrRuleNotFound) {
		httpx.WriteProblem(w, http.StatusNotFound, "todo rule not found")
		return
	}
	if errors.Is(err, ErrRuleSchemaConflict) {
		httpx.WriteTypedProblem(w, httpx.ProblemRuleSchemaConflict, "todo rule schema conflicts with existing todos")
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
		httpx.WriteDecodeProblem(w, err)
		return
	}

	req.RuleName = strings.TrimSpace(req.RuleName)

	if err := validation.Validate(req); err != nil {
		httpx.WriteTypedProblem(w, httpx.ProblemValidationFailed, "invalid rule request")
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
		httpx.WriteTypedProblem(w, httpx.ProblemRuleInUse, "todo rule is in use")
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

	for i := range req.ListColumns {
		column := &req.ListColumns[i]
		column.Pointer = strings.TrimSpace(column.Pointer)
		column.Label = strings.TrimSpace(column.Label)
	}

	return req, nil
}

func (r ruleRequest) definition() RuleDefinition {
	return RuleDefinition{
		ContentSchema: r.ContentSchema,
		UISchema:      r.UISchema,
		ListColumns:   r.ListColumns,
	}
}
