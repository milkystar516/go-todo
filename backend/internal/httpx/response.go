package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type problem struct {
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
}

func WriteProblem(w http.ResponseWriter, status int, detail string) {
	title := http.StatusText(status)

	if status == http.StatusUnprocessableEntity {
		title = "Unprocessable Content"
	}

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(problem{
		Title:  title,
		Status: status,
		Detail: detail,
	})
}

func ServerError(w http.ResponseWriter, r *http.Request, err error) {
	slog.ErrorContext(r.Context(), "request failed", "error", err)
	WriteProblem(w, http.StatusInternalServerError, "server error")
}
