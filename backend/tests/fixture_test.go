package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/httpx"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
	"github.com/milkystar516/go-todo/backend/internal/todo"
	todolist "github.com/milkystar516/go-todo/backend/internal/todo_list"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

type testAPI struct {
	db      *pgxpool.Pool
	apiURL  string
	rootURL string
}

type publicUserResponse struct {
	ID       int64     `json:"id"`
	Username string    `json:"username"`
	Nickname *string   `json:"nickname"`
	Role     auth.Role `json:"role"`
}

type todoRuleResponse struct {
	ID       int64  `json:"id"`
	RuleName string `json:"rule_name"`
}

type todoListResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	DefaultRuleID int64  `json:"default_rule_id"`
}

type todoRuleDetailResponse struct {
	ID            int64                 `json:"id"`
	RuleName      string                `json:"rule_name"`
	ContentSchema map[string]any        `json:"content_schema"`
	UISchema      map[string]any        `json:"ui_schema"`
	ListColumns   []todorule.ListColumn `json:"list_columns"`
}

type authenticatedUser struct {
	client *http.Client
	user   publicUserResponse
}

func newTestAPI(t *testing.T) *testAPI {
	t.Helper()

	if err := godotenv.Load("../../.env"); err != nil {
		t.Fatal(err)
	}

	db, err := postgres.Open(t.Context(), os.Getenv("DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)

	mux := http.NewServeMux()
	apiMux := http.NewServeMux()
	mux.Handle(
		"/api/",
		http.StripPrefix(
			"/api",
			httpx.LimitRequestBody(
				httpx.ProblemFallbackHandler(apiMux),
				httpx.DefaultMaxRequestBodyBytes,
			),
		),
	)

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: os.Getenv("SESSION_COOKIE_NAME"),
		SessionTTL: time.Hour,
		Secure:     false,
	})
	authHandler.RegisterRoutes(apiMux)

	ruleService := todorule.NewService(db)
	listService := todolist.NewService(db)

	todoRuleHandler := todorule.NewHandler(ruleService)
	todoRuleHandler.RegisterRoutes(apiMux, authHandler.RequireAuth, authHandler.RequireAdmin)

	todoListHandler := todolist.NewHandler(listService)
	todoListHandler.RegisterRoutes(apiMux, authHandler.RequireAuth)

	todoHandler := todo.NewHandler(db, ruleService, listService)
	todoHandler.RegisterRoutes(apiMux, authHandler.RequireAuth)

	crossOriginProtection := httpx.NewProblemCrossOriginProtection()
	server := httptest.NewServer(crossOriginProtection.Handler(mux))
	t.Cleanup(server.Close)

	return &testAPI{
		db:      db,
		apiURL:  server.URL + "/api",
		rootURL: server.URL,
	}
}

func (api *testAPI) newAuthenticatedUser(t *testing.T) authenticatedUser {
	t.Helper()

	username := uniqueValue("integration_test")
	password := "test-password"
	client := newClient(t)

	api.registerUserCleanup(t, username)

	signupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", map[string]any{
		"username": username,
		"nickname": "integration-test",
		"password": password,
	})
	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	loginResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/login", map[string]any{
		"username": username,
		"password": password,
	})
	expectStatus(t, loginResp, http.StatusOK)
	loginResp.Body.Close()

	meResp := request(t, client, http.MethodGet, api.apiURL+"/me")
	expectStatus(t, meResp, http.StatusOK)

	var user publicUserResponse
	decodeJSON(t, meResp, &user)

	return authenticatedUser{
		client: client,
		user:   user,
	}
}

func (api *testAPI) newAdminClient(t *testing.T) (*http.Client, publicUserResponse) {
	t.Helper()

	client := newClient(t)
	loginResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/login", map[string]any{
		"username": "testuser",
		"password": "1234",
	})
	expectStatus(t, loginResp, http.StatusOK)
	loginResp.Body.Close()

	meResp := request(t, client, http.MethodGet, api.apiURL+"/me")
	expectStatus(t, meResp, http.StatusOK)

	var user publicUserResponse
	decodeJSON(t, meResp, &user)
	if user.Role != auth.RoleAdmin {
		t.Fatalf("admin role = %q, want %q", user.Role, auth.RoleAdmin)
	}

	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodDelete, api.apiURL+"/logout", nil)
		if err != nil {
			t.Errorf("create admin logout request: %v", err)
			return
		}

		resp, err := client.Do(req)
		if err != nil {
			t.Errorf("admin logout: %v", err)
			return
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusNoContent {
			t.Errorf("admin logout status = %d, want %d", resp.StatusCode, http.StatusNoContent)
		}
	})

	return client, user
}

func (api *testAPI) registerUserCleanup(t *testing.T, username string) {
	t.Helper()

	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := api.db.Exec(ctx, "DELETE FROM users WHERE username = $1", username); err != nil {
			t.Errorf("clean up user %q: %v", username, err)
		}
	})
}

func (api *testAPI) registerTodoRuleCleanup(t *testing.T, ruleID int64) {
	t.Helper()

	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := api.db.Exec(ctx, "DELETE FROM todo_lists WHERE default_rule_id = $1", ruleID); err != nil {
			t.Errorf("clean up todo lists for rule %d: %v", ruleID, err)
			return
		}
		if _, err := api.db.Exec(ctx, "DELETE FROM todos WHERE rule_id = $1", ruleID); err != nil {
			t.Errorf("clean up todos for rule %d: %v", ruleID, err)
			return
		}
		if _, err := api.db.Exec(ctx, "DELETE FROM todo_rule WHERE id = $1", ruleID); err != nil {
			t.Errorf("clean up todo rule %d: %v", ruleID, err)
		}
	})
}

func (api *testAPI) createTodoList(t *testing.T, member authenticatedUser, ruleID int64) todoListResponse {
	t.Helper()

	response := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/lists", map[string]any{
		"name":            uniqueValue("integration list"),
		"default_rule_id": ruleID,
	})
	expectStatus(t, response, http.StatusCreated)

	var list todoListResponse
	decodeJSON(t, response, &list)
	api.registerTodoListCleanup(t, list.ID)
	return list
}

func (api *testAPI) registerTodoListCleanup(t *testing.T, listID string) {
	t.Helper()

	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := api.db.Exec(ctx, "DELETE FROM todo_lists WHERE id = $1", listID); err != nil {
			t.Errorf("clean up todo list %s: %v", listID, err)
		}
	})
}

func uniqueValue(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}

func decodeRawObject(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()

	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()

	var object map[string]any
	if err := decoder.Decode(&object); err != nil {
		t.Fatal(err)
	}

	return object
}
