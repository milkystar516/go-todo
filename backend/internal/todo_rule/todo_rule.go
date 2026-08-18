package todorule

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/milkystar516/go-todo/backend/internal/httpx"
)

type Handler struct {
	rules *Service
}

type ruleRequest struct {
	RuleName string            `json:"rule_name" validate:"max=50"`
	Fields   []FieldDefinition `json:"fields"`
}

type ruleResponse struct {
	ID       int64  `json:"id"`
	RuleName string `json:"rule_name"`
}

func NewHandler(rules *Service) *Handler {
	return &Handler{rules: rules}
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

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, "invalid rule request")
		return
	}

	_, err = Compile(req.Fields)

	var validationErr *validationError

	if errors.As(err, &validationErr) {
		httpx.WriteProblem(
			w,
			http.StatusUnprocessableEntity,
			validationErr.Error(),
		)
		return
	}

	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	rule, err := h.rules.CreateTodoRule(r.Context(), req.RuleName, req.Fields)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Location", "/todo-rule/"+strconv.FormatInt(rule.ID, 10))
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rule)
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

	if err := httpx.Validate(req); err != nil {
		httpx.WriteProblem(w, http.StatusBadRequest, "bad request")
		return
	}

	_, err = Compile(req.Fields)

	var validationErr *validationError

	if errors.As(err, &validationErr) {
		httpx.WriteProblem(w, http.StatusUnprocessableEntity, validationErr.Error())
		return
	}
	if err != nil {
		httpx.ServerError(w, r, err)
		return
	}

	err = h.rules.UpdateTodoRule(r.Context(), ruleID, req.RuleName, req.Fields)

	w.WriteHeader(http.StatusNoContent)
}

func readRuleRequest(r *http.Request) (ruleRequest, error) {
	var req ruleRequest

	if err := httpx.DecodeJSON(r, &req); err != nil {
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
