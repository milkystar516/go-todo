package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
	"github.com/milkystar516/go-todo/backend/internal/todo"
)

func TestSignupLoginCreateAndGetTodos(t *testing.T) {
	if err := godotenv.Load("../../.env"); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	db, err := postgres.Open(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: os.Getenv("SESSION_COOKIE_NAME"),
		SessionTTL: time.Hour,
		Secure:     false,
	})
	authHandler.RegisterRoutes(mux)

	todoHandler := todo.NewHandler(db)
	todoHandler.RegisterRoutes(mux, authHandler.RequireAuth)

	server := httptest.NewServer(mux)
	defer server.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}

	client := &http.Client{
		Jar: jar,
	}

	username := fmt.Sprintf(
		"integration_test_%d",
		time.Now().UnixNano(),
	)
	password := "test-password"

	t.Cleanup(func() {
		_, err := db.Exec(
			context.Background(),
			"DELETE FROM users WHERE username = $1",
			username,
		)
		if err != nil {
			t.Logf("test cleanup failed: %v", err)
		}
	})

	// 1. signup
	signupResp := postJSON(
		t,
		client,
		server.URL+"/signup",
		map[string]any{
			"username": username,
			"nickname": "integration-test",
			"password": password,
		},
	)

	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	// 2. login
	loginResp := postJSON(
		t,
		client,
		server.URL+"/login",
		map[string]any{
			"username": username,
			"password": password,
		},
	)

	expectStatus(t, loginResp, http.StatusOK)
	loginResp.Body.Close()

	// 3. create 10 todos
	for i := 1; i <= 10; i++ {
		title := fmt.Sprintf("테스트 Todo %02d", i)

		resp := postJSON(
			t,
			client,
			server.URL+"/todos",
			map[string]any{
				"title": title,
			},
		)

		expectStatus(t, resp, http.StatusCreated)

		var created todo.Todo

		if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
			resp.Body.Close()
			t.Fatal(err)
		}
		resp.Body.Close()

		if created.ID == 0 {
			t.Fatal("created todo has no id")
		}

		if created.OwnerID == 0 {
			t.Fatal("created todo has no owner_id")
		}

		if created.Title != title {
			t.Fatalf(
				"created title = %q, want %q",
				created.Title,
				title,
			)
		}
	}

	// 4. get todos
	resp, err := client.Get(server.URL + "/todos")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	expectStatus(t, resp, http.StatusOK)

	var todos []todo.Todo

	if err := json.NewDecoder(resp.Body).Decode(&todos); err != nil {
		t.Fatal(err)
	}

	if len(todos) != 10 {
		t.Fatalf(
			"got %d todos, want 10",
			len(todos),
		)
	}

	for i, got := range todos {
		wantTitle := fmt.Sprintf("테스트 Todo %02d", i+1)

		if got.Title != wantTitle {
			t.Errorf(
				"todos[%d].title = %q, want %q",
				i,
				got.Title,
				wantTitle,
			)
		}
	}
}

func postJSON(t *testing.T, client *http.Client, url string, body any) *http.Response {
	t.Helper()

	var buf bytes.Buffer

	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(
		http.MethodPost,
		url,
		&buf,
	)
	if err != nil {
		t.Fatal(err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}

	return resp
}

func expectStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()

	if resp.StatusCode == want {
		return
	}

	body, _ := io.ReadAll(resp.Body)

	t.Fatalf(
		"status = %d, want %d; body = %s",
		resp.StatusCode,
		want,
		string(body),
	)
}
