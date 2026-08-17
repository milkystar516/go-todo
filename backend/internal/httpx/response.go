package httpx

import (
	"log/slog"
	"net/http"
)

func ServerError(w http.ResponseWriter, r *http.Request, err error) {
	slog.ErrorContext(r.Context(), "request failed", "error", err)
	http.Error(w, "server error", http.StatusInternalServerError)
}
