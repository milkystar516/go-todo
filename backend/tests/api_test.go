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
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
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

	ruleSerivce := todorule.NewService(db)

	todoRuleHandler := todorule.NewHandler(ruleSerivce)
	todoRuleHandler.RegisterRoutes(mux, authHandler.RequireAuth)

	todoHandler := todo.NewHandler(db, ruleSerivce)
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

	var firstTodoID int64

	// 3. create 10 todos
	for i := 1; i <= 10; i++ {
		title := fmt.Sprintf("테스트 Todo %02d", i)

		resp := postJSON(
			t,
			client,
			server.URL+"/todos",
			map[string]any{
				"content": map[string]any{
					"title": title,
				},
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

		if i == 1 {
			firstTodoID = created.ID
		}

		if created.Content["title"] != title {
			t.Fatalf(
				"created content.title = %v, want %q",
				created.Content["title"],
				title,
			)
		}

		if created.CompletedAt != nil {
			t.Fatalf(
				"created completed_at = %v, want nil",
				created.CompletedAt,
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

		if got.Content["title"] != wantTitle {
			t.Errorf(
				"todos[%d].content.title = %v, want %q",
				i,
				got.Content["title"],
				wantTitle,
			)
		}

		if got.CompletedAt != nil {
			t.Errorf(
				"todos[%d].completed_at = %v, want nil",
				i,
				got.CompletedAt,
			)
		}
	}

	// 5. update first todo content
	updateResp := patchJSON(
		t,
		client,
		fmt.Sprintf("%s/todos/%d", server.URL, firstTodoID),
		map[string]any{
			"content": map[string]any{
				"title":    "수정된 Todo",
				"priority": "high",
			},
		},
	)

	expectStatus(t, updateResp, http.StatusOK)

	var updated todo.Todo

	if err := json.NewDecoder(updateResp.Body).Decode(&updated); err != nil {
		updateResp.Body.Close()
		t.Fatal(err)
	}
	updateResp.Body.Close()

	if updated.Content["title"] != "수정된 Todo" {
		t.Fatalf(
			"updated content.title = %v, want %q",
			updated.Content["title"],
			"수정된 Todo",
		)
	}

	if updated.Content["priority"] != "high" {
		t.Fatalf(
			"updated content.priority = %v, want %q",
			updated.Content["priority"],
			"high",
		)
	}

	if updated.CompletedAt != nil {
		t.Fatalf(
			"updated completed_at = %v, want nil",
			updated.CompletedAt,
		)
	}

	// 6. complete first todo
	completeReq, err := http.NewRequest(
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", server.URL, firstTodoID),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	completeResp, err := client.Do(completeReq)
	if err != nil {
		t.Fatal(err)
	}

	expectStatus(t, completeResp, http.StatusOK)

	var completed todo.Todo

	if err := json.NewDecoder(completeResp.Body).Decode(&completed); err != nil {
		completeResp.Body.Close()
		t.Fatal(err)
	}
	completeResp.Body.Close()

	if completed.CompletedAt == nil {
		t.Fatal("completed_at is nil after completing todo")
	}

	completedAt := *completed.CompletedAt

	// 7. update content while completed
	updateCompletedResp := patchJSON(
		t,
		client,
		fmt.Sprintf("%s/todos/%d", server.URL, firstTodoID),
		map[string]any{
			"content": map[string]any{
				"title":    "완료 후 수정",
				"priority": "high",
			},
		},
	)

	expectStatus(t, updateCompletedResp, http.StatusOK)

	var updatedCompleted todo.Todo

	if err := json.NewDecoder(updateCompletedResp.Body).Decode(&updatedCompleted); err != nil {
		updateCompletedResp.Body.Close()
		t.Fatal(err)
	}
	updateCompletedResp.Body.Close()

	if updatedCompleted.Content["title"] != "완료 후 수정" {
		t.Fatalf(
			"updated content.title = %v, want %q",
			updatedCompleted.Content["title"],
			"완료 후 수정",
		)
	}

	if updatedCompleted.CompletedAt == nil {
		t.Fatal("content update cleared completed_at")
	}

	if !updatedCompleted.CompletedAt.Equal(completedAt) {
		t.Fatalf(
			"content update changed completed_at: got %v, want %v",
			updatedCompleted.CompletedAt,
			completedAt,
		)
	}

	// 8. toggle first todo back to incomplete
	uncompleteReq, err := http.NewRequest(
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", server.URL, firstTodoID),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	uncompleteResp, err := client.Do(uncompleteReq)
	if err != nil {
		t.Fatal(err)
	}

	expectStatus(t, uncompleteResp, http.StatusOK)

	var uncompleted todo.Todo

	if err := json.NewDecoder(uncompleteResp.Body).Decode(&uncompleted); err != nil {
		uncompleteResp.Body.Close()
		t.Fatal(err)
	}
	uncompleteResp.Body.Close()

	if uncompleted.CompletedAt != nil {
		t.Fatalf(
			"completed_at = %v after toggling incomplete, want nil",
			uncompleted.CompletedAt,
		)
	}

	// 9. delete first todo
	deleteReq, err := http.NewRequest(
		http.MethodDelete,
		fmt.Sprintf("%s/todos/%d", server.URL, firstTodoID),
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}

	deleteResp, err := client.Do(deleteReq)
	if err != nil {
		t.Fatal(err)
	}

	expectStatus(t, deleteResp, http.StatusNoContent)
	deleteResp.Body.Close()

	// 10. verify deleted todo is gone
	finalResp, err := client.Get(server.URL + "/todos")
	if err != nil {
		t.Fatal(err)
	}

	expectStatus(t, finalResp, http.StatusOK)

	var remainingTodos []todo.Todo

	if err := json.NewDecoder(finalResp.Body).Decode(&remainingTodos); err != nil {
		finalResp.Body.Close()
		t.Fatal(err)
	}
	finalResp.Body.Close()

	if len(remainingTodos) != 9 {
		t.Fatalf(
			"got %d todos after delete, want 9",
			len(remainingTodos),
		)
	}

	for _, got := range remainingTodos {
		if got.ID == firstTodoID {
			t.Fatalf(
				"deleted todo %d is still returned",
				firstTodoID,
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

func patchJSON(t *testing.T, client *http.Client, url string, body any) *http.Response {
	t.Helper()

	var buf bytes.Buffer

	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(
		http.MethodPatch,
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
