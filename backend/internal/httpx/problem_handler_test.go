package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProblemFallbackHandler(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	handler := ProblemFallbackHandler(mux)

	tests := []struct {
		name      string
		method    string
		path      string
		status    int
		wantTitle string
		wantAllow string
	}{
		{
			name:      "not found",
			method:    http.MethodGet,
			path:      "/missing",
			status:    http.StatusNotFound,
			wantTitle: "Not Found",
		},
		{
			name:      "method not allowed",
			method:    http.MethodPut,
			path:      "/login",
			status:    http.StatusMethodNotAllowed,
			wantTitle: "Method Not Allowed",
			wantAllow: http.MethodPost,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(tt.method, tt.path, nil)

			handler.ServeHTTP(recorder, request)

			response := recorder.Result()
			defer response.Body.Close()

			if response.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, tt.status)
			}
			if got := response.Header.Get("Content-Type"); got != "application/problem+json" {
				t.Fatalf("Content-Type = %q, want application/problem+json", got)
			}
			if got := response.Header.Get("Allow"); got != tt.wantAllow {
				t.Fatalf("Allow = %q, want %q", got, tt.wantAllow)
			}

			var got problem
			if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
				t.Fatal(err)
			}
			if got.Type != "" {
				t.Fatalf("type = %q, want omission for about:blank", got.Type)
			}
			if got.Title != tt.wantTitle || got.Status != tt.status {
				t.Fatalf("problem = %+v, want title %q and status %d", got, tt.wantTitle, tt.status)
			}
		})
	}
}

func TestProblemFallbackHandlerPreservesExistingProblem(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /todos/{todo_id}", func(w http.ResponseWriter, _ *http.Request) {
		WriteProblem(w, http.StatusNotFound, "todo not found")
	})
	handler := ProblemFallbackHandler(mux)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/todos/1", nil))

	response := recorder.Result()
	defer response.Body.Close()

	var got problem
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got.Detail != "todo not found" {
		t.Fatalf("detail = %q, want %q", got.Detail, "todo not found")
	}
}
