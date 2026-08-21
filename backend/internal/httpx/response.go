package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type problem struct {
	Type   string `json:"type,omitempty"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
}

func WriteProblem(w http.ResponseWriter, status int, detail string) {
	writeProblem(w, problem{
		Title:  http.StatusText(status),
		Status: status,
		Detail: detail,
	})
}

func WriteTypedProblem(w http.ResponseWriter, kind ProblemKind, detail string) {
	definition, ok := kind.definition()
	if !ok {
		slog.Error("unknown problem kind", "kind", kind)
		WriteProblem(w, http.StatusInternalServerError, "server error")
		return
	}

	writeProblem(w, problem{
		Type:   definition.typeURI,
		Title:  definition.title,
		Status: definition.status,
		Detail: detail,
	})
}

func writeProblem(w http.ResponseWriter, value problem) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("Content-Language", "en")
	w.WriteHeader(value.Status)

	_ = json.NewEncoder(w).Encode(value)
}

func ServerError(w http.ResponseWriter, r *http.Request, err error) {
	slog.ErrorContext(r.Context(), "request failed", "error", err)
	WriteProblem(w, http.StatusInternalServerError, "server error")
}
