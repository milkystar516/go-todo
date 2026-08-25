package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteTypedProblem(t *testing.T) {
	tests := []struct {
		name    string
		kind    ProblemKind
		typeURI string
		title   string
		status  int
	}{
		{
			name:    "authentication required",
			kind:    ProblemAuthenticationRequired,
			typeURI: "/problems/authentication-required",
			title:   "Authentication required",
			status:  http.StatusUnauthorized,
		},
		{
			name:    "invalid credentials",
			kind:    ProblemInvalidCredentials,
			typeURI: "/problems/invalid-credentials",
			title:   "Invalid credentials",
			status:  http.StatusUnauthorized,
		},
		{
			name:    "username taken",
			kind:    ProblemUsernameTaken,
			typeURI: "/problems/username-taken",
			title:   "Username already exists",
			status:  http.StatusConflict,
		},
		{
			name:    "validation failed",
			kind:    ProblemValidationFailed,
			typeURI: "/problems/validation-failed",
			title:   "Request validation failed",
			status:  http.StatusUnprocessableEntity,
		},
		{
			name:    "cannot change own role",
			kind:    ProblemCannotChangeOwnRole,
			typeURI: "/problems/cannot-change-own-role",
			title:   "Cannot change own role",
			status:  http.StatusForbidden,
		},
		{
			name:    "rule in use",
			kind:    ProblemRuleInUse,
			typeURI: "/problems/rule-in-use",
			title:   "Todo rule is in use",
			status:  http.StatusConflict,
		},
		{
			name:    "default rule protected",
			kind:    ProblemDefaultRuleProtected,
			typeURI: "/problems/default-rule-protected",
			title:   "Default todo rule is protected",
			status:  http.StatusConflict,
		},
	}

	seenTypes := make(map[string]struct{}, len(tests))

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, exists := seenTypes[tt.typeURI]; exists {
				t.Fatalf("duplicate problem type %q", tt.typeURI)
			}
			seenTypes[tt.typeURI] = struct{}{}

			recorder := httptest.NewRecorder()

			WriteTypedProblem(recorder, tt.kind, "test detail")

			response := recorder.Result()
			defer response.Body.Close()

			if response.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, tt.status)
			}
			if got := response.Header.Get("Content-Type"); got != "application/problem+json" {
				t.Fatalf("Content-Type = %q, want application/problem+json", got)
			}
			if got := response.Header.Get("Content-Language"); got != "en" {
				t.Fatalf("Content-Language = %q, want en", got)
			}

			var got problem
			if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
				t.Fatal(err)
			}

			want := problem{
				Type:   tt.typeURI,
				Title:  tt.title,
				Status: tt.status,
				Detail: "test detail",
			}
			if got != want {
				t.Fatalf("problem = %+v, want %+v", got, want)
			}
		})
	}
}

func TestWriteProblemUsesAboutBlankByOmission(t *testing.T) {
	recorder := httptest.NewRecorder()

	WriteProblem(recorder, http.StatusNotFound, "todo not found")

	response := recorder.Result()
	defer response.Body.Close()

	var got map[string]any
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if _, exists := got["type"]; exists {
		t.Fatal("generic problem must omit type so it resolves to about:blank")
	}
	if got["title"] != http.StatusText(http.StatusNotFound) {
		t.Fatalf("title = %v, want %q", got["title"], http.StatusText(http.StatusNotFound))
	}
	if got["status"] != float64(http.StatusNotFound) {
		t.Fatalf("status = %v, want %d", got["status"], http.StatusNotFound)
	}
}
