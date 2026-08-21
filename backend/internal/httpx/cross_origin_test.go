package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCrossOriginRejectionUsesProblemDetails(t *testing.T) {
	handler := NewProblemCrossOriginProtection().Handler(http.HandlerFunc(
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		},
	))
	request := httptest.NewRequest(http.MethodPost, "https://api.example.test/login", nil)
	request.Header.Set("Origin", "https://other.example.test")
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	response := recorder.Result()
	defer response.Body.Close()

	if response.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusForbidden)
	}
	if got := response.Header.Get("Content-Type"); got != "application/problem+json" {
		t.Fatalf("Content-Type = %q, want application/problem+json", got)
	}

	var got problem
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	want := problem{
		Title:  "Forbidden",
		Status: http.StatusForbidden,
		Detail: "forbidden",
	}
	if got != want {
		t.Fatalf("problem = %+v, want %+v", got, want)
	}
}
