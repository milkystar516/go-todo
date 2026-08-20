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

type todoRuleDetailResponse struct {
	ID       int64                      `json:"id"`
	RuleName string                     `json:"rule_name"`
	Fields   []todorule.FieldDefinition `json:"fields"`
}

func TestAPI(t *testing.T) {
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
	apiMux := http.NewServeMux()
	mux.Handle("/api/", http.StripPrefix("/api", apiMux))

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: os.Getenv("SESSION_COOKIE_NAME"),
		SessionTTL: time.Hour,
		Secure:     false,
	})
	authHandler.RegisterRoutes(apiMux)

	ruleService := todorule.NewService(db)

	todoRuleHandler := todorule.NewHandler(ruleService)
	todoRuleHandler.RegisterRoutes(apiMux, authHandler.RequireAuth, authHandler.RequireAdmin)

	todoHandler := todo.NewHandler(db, ruleService)
	todoHandler.RegisterRoutes(apiMux, authHandler.RequireAuth)

	server := httptest.NewServer(mux)
	defer server.Close()

	apiURL := server.URL + "/api"
	username := fmt.Sprintf("integration_test_%d", time.Now().UnixNano())
	ruleName := fmt.Sprintf("integration rule %d", time.Now().UnixNano())
	password := "test-password"

	var ruleID int64

	defer func() {
		if _, err := db.Exec(context.Background(), "DELETE FROM users WHERE username = $1", username); err != nil {
			t.Logf("user cleanup failed: %v", err)
		}

		if ruleID != 0 {
			if _, err := db.Exec(context.Background(), "DELETE FROM todo_rule WHERE id = $1", ruleID); err != nil {
				t.Logf("todo rule cleanup failed: %v", err)
			}
		}
	}()

	client := newClient(t)
	adminClient := newClient(t)

	rootMeResp := request(t, client, http.MethodGet, server.URL+"/me")
	expectStatus(t, rootMeResp, http.StatusNotFound)
	rootMeResp.Body.Close()

	unauthorizedMeResp := request(t, client, http.MethodGet, apiURL+"/me")
	expectStatus(t, unauthorizedMeResp, http.StatusUnauthorized)
	unauthorizedMeResp.Body.Close()

	invalidSignupResp := requestJSON(t, client, http.MethodPost, apiURL+"/signup", map[string]any{})
	expectStatus(t, invalidSignupResp, http.StatusUnprocessableEntity)
	invalidSignupResp.Body.Close()

	signupBody := map[string]any{
		"username": username,
		"nickname": "integration-test",
		"password": password,
	}

	signupResp := requestJSON(t, client, http.MethodPost, apiURL+"/signup", signupBody)
	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	duplicateSignupResp := requestJSON(t, client, http.MethodPost, apiURL+"/signup", signupBody)
	expectStatus(t, duplicateSignupResp, http.StatusConflict)
	duplicateSignupResp.Body.Close()

	invalidLoginResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/login",
		map[string]any{
			"username": username,
			"password": "wrong-password",
		},
	)
	expectStatus(t, invalidLoginResp, http.StatusUnauthorized)
	invalidLoginResp.Body.Close()

	loginResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/login",
		map[string]any{
			"username": username,
			"password": password,
		},
	)
	expectStatus(t, loginResp, http.StatusOK)

	loginCookies := loginResp.Cookies()
	loginResp.Body.Close()

	if len(loginCookies) != 1 {
		t.Fatalf("login set %d cookies, want 1", len(loginCookies))
	}
	if loginCookies[0].Path != "/" {
		t.Fatalf("login cookie path = %q, want %q", loginCookies[0].Path, "/")
	}

	meResp := request(t, client, http.MethodGet, apiURL+"/me")
	expectStatus(t, meResp, http.StatusOK)

	var user publicUserResponse
	decodeJSON(t, meResp, &user)

	if user.ID == 0 {
		t.Fatal("me response has no id")
	}
	if user.Username != username {
		t.Fatalf("me username = %q, want %q", user.Username, username)
	}
	if user.Nickname == nil || *user.Nickname != "integration-test" {
		t.Fatalf("me nickname = %v, want %q", user.Nickname, "integration-test")
	}
	if user.Role != auth.RoleUser {
		t.Fatalf("me role = %q, want %q", user.Role, auth.RoleUser)
	}
	if cookies := meResp.Cookies(); len(cookies) != 0 {
		t.Fatalf("me response set %d cookies, want 0", len(cookies))
	}

	userResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/users/%d", apiURL, user.ID))
	expectStatus(t, userResp, http.StatusOK)

	var foundUser publicUserResponse
	decodeJSON(t, userResp, &foundUser)

	if foundUser.ID != user.ID || foundUser.Username != user.Username || foundUser.Role != user.Role {
		t.Fatalf("user response = %+v, want %+v", foundUser, user)
	}
	if foundUser.Nickname == nil || *foundUser.Nickname != *user.Nickname {
		t.Fatalf("user nickname = %v, want %v", foundUser.Nickname, user.Nickname)
	}

	adminLoginResp := requestJSON(
		t,
		adminClient,
		http.MethodPost,
		apiURL+"/login",
		map[string]any{
			"username": "testuser",
			"password": "1234",
		},
	)
	expectStatus(t, adminLoginResp, http.StatusOK)
	adminLoginResp.Body.Close()

	defer func() {
		req, err := http.NewRequest(http.MethodDelete, apiURL+"/logout", nil)
		if err != nil {
			t.Logf("admin logout request failed: %v", err)
			return
		}

		resp, err := adminClient.Do(req)
		if err != nil {
			t.Logf("admin logout failed: %v", err)
			return
		}
		resp.Body.Close()
	}()

	adminMeResp := request(t, adminClient, http.MethodGet, apiURL+"/me")
	expectStatus(t, adminMeResp, http.StatusOK)

	var adminUser publicUserResponse
	decodeJSON(t, adminMeResp, &adminUser)

	if adminUser.Role != auth.RoleAdmin {
		t.Fatalf("admin role = %q, want %q", adminUser.Role, auth.RoleAdmin)
	}

	publicAdminResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/users/%d", apiURL, adminUser.ID))
	expectStatus(t, publicAdminResp, http.StatusOK)
	publicAdminResp.Body.Close()

	forbiddenGrantResp := request(t, client, http.MethodPost, fmt.Sprintf("%s/users/%d/grant-admin", apiURL, user.ID))
	expectStatus(t, forbiddenGrantResp, http.StatusForbidden)
	forbiddenGrantResp.Body.Close()

	selfRevokeResp := request(t, adminClient, http.MethodPost, fmt.Sprintf("%s/users/%d/revoke-admin", apiURL, adminUser.ID))
	expectStatus(t, selfRevokeResp, http.StatusForbidden)
	selfRevokeResp.Body.Close()

	grantResp := request(t, adminClient, http.MethodPost, fmt.Sprintf("%s/users/%d/grant-admin", apiURL, user.ID))
	expectStatus(t, grantResp, http.StatusOK)

	var grantedUser publicUserResponse
	decodeJSON(t, grantResp, &grantedUser)

	if grantedUser.Role != auth.RoleAdmin {
		t.Fatalf("granted role = %q, want %q", grantedUser.Role, auth.RoleAdmin)
	}

	conflictGrantResp := request(t, adminClient, http.MethodPost, fmt.Sprintf("%s/users/%d/grant-admin", apiURL, user.ID))
	expectStatus(t, conflictGrantResp, http.StatusConflict)
	conflictGrantResp.Body.Close()

	revokeResp := request(t, adminClient, http.MethodPost, fmt.Sprintf("%s/users/%d/revoke-admin", apiURL, user.ID))
	expectStatus(t, revokeResp, http.StatusOK)

	var revokedUser publicUserResponse
	decodeJSON(t, revokeResp, &revokedUser)

	if revokedUser.Role != auth.RoleUser {
		t.Fatalf("revoked role = %q, want %q", revokedUser.Role, auth.RoleUser)
	}

	conflictRevokeResp := request(t, adminClient, http.MethodPost, fmt.Sprintf("%s/users/%d/revoke-admin", apiURL, user.ID))
	expectStatus(t, conflictRevokeResp, http.StatusConflict)
	conflictRevokeResp.Body.Close()

	missingUserResp := request(t, adminClient, http.MethodPost, apiURL+"/users/9223372036854775807/grant-admin")
	expectStatus(t, missingUserResp, http.StatusNotFound)
	missingUserResp.Body.Close()

	fields := []todorule.FieldDefinition{
		{
			Key:        " title ",
			Label:      " Title ",
			Type:       todorule.FieldShortText,
			Required:   true,
			ShowInList: true,
		},
		{
			Key:     " priority ",
			Label:   " Priority ",
			Type:    todorule.FieldSingleSelect,
			Options: []string{" high ", " low "},
		},
	}
	ruleBody := map[string]any{
		"rule_name": "  " + ruleName + "  ",
		"fields":    fields,
	}

	forbiddenCreateRuleResp := requestJSON(t, client, http.MethodPost, apiURL+"/todo-rules", ruleBody)
	expectStatus(t, forbiddenCreateRuleResp, http.StatusForbidden)
	forbiddenCreateRuleResp.Body.Close()

	invalidRuleResp := requestJSON(
		t,
		adminClient,
		http.MethodPost,
		apiURL+"/todo-rules",
		map[string]any{
			"rule_name": "   ",
			"fields":    fields,
		},
	)
	expectStatus(t, invalidRuleResp, http.StatusUnprocessableEntity)
	invalidRuleResp.Body.Close()

	createRuleResp := requestJSON(t, adminClient, http.MethodPost, apiURL+"/todo-rules", ruleBody)
	expectStatus(t, createRuleResp, http.StatusCreated)

	var createdRule todoRuleResponse
	decodeJSON(t, createRuleResp, &createdRule)
	ruleID = createdRule.ID

	if createdRule.RuleName != ruleName {
		t.Fatalf("created rule name = %q, want %q", createdRule.RuleName, ruleName)
	}

	listRulesResp := request(t, client, http.MethodGet, apiURL+"/todo-rules")
	expectStatus(t, listRulesResp, http.StatusOK)

	var rules []todoRuleResponse
	decodeJSON(t, listRulesResp, &rules)

	foundRule := false
	for _, rule := range rules {
		if rule.ID == ruleID {
			foundRule = true
			break
		}
	}
	if !foundRule {
		t.Fatalf("created todo rule %d is missing from list", ruleID)
	}

	getRuleResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID))
	expectStatus(t, getRuleResp, http.StatusOK)

	var ruleDetail todoRuleDetailResponse
	decodeJSON(t, getRuleResp, &ruleDetail)

	if len(ruleDetail.Fields) != 2 {
		t.Fatalf("todo rule field count = %d, want 2", len(ruleDetail.Fields))
	}
	if len(ruleDetail.Fields[1].Options) != 2 {
		t.Fatalf("todo rule option count = %d, want 2", len(ruleDetail.Fields[1].Options))
	}
	if ruleDetail.Fields[0].Key != "title" || ruleDetail.Fields[1].Options[0] != "high" {
		t.Fatalf("todo rule fields were not trimmed: %+v", ruleDetail.Fields)
	}

	forbiddenPatchRuleResp := requestJSON(
		t,
		client,
		http.MethodPatch,
		fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID),
		map[string]any{"rule_name": "forbidden"},
	)
	expectStatus(t, forbiddenPatchRuleResp, http.StatusForbidden)
	forbiddenPatchRuleResp.Body.Close()

	forbiddenPutRuleResp := requestJSON(t, client, http.MethodPut, fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID), ruleBody)
	expectStatus(t, forbiddenPutRuleResp, http.StatusForbidden)
	forbiddenPutRuleResp.Body.Close()

	forbiddenDeleteRuleResp := request(t, client, http.MethodDelete, fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID))
	expectStatus(t, forbiddenDeleteRuleResp, http.StatusForbidden)
	forbiddenDeleteRuleResp.Body.Close()

	updatedRuleName := ruleName + " updated"
	updateTitleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID),
		map[string]any{"rule_name": "  " + updatedRuleName + "  "},
	)
	expectStatus(t, updateTitleResp, http.StatusOK)

	var titledRule todoRuleResponse
	decodeJSON(t, updateTitleResp, &titledRule)

	if titledRule.RuleName != updatedRuleName {
		t.Fatalf("updated rule name = %q, want %q", titledRule.RuleName, updatedRuleName)
	}

	missingRuleIDResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/todos",
		map[string]any{"content": map[string]any{"title": "Todo"}},
	)
	expectStatus(t, missingRuleIDResp, http.StatusUnprocessableEntity)
	missingRuleIDResp.Body.Close()

	unknownRuleResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/todos",
		map[string]any{
			"rule_id": 9223372036854775807,
			"content": map[string]any{"title": "Todo"},
		},
	)
	expectStatus(t, unknownRuleResp, http.StatusUnprocessableEntity)
	unknownRuleResp.Body.Close()

	invalidContentResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/todos",
		map[string]any{
			"rule_id": ruleID,
			"content": map[string]any{"unknown": true},
		},
	)
	expectStatus(t, invalidContentResp, http.StatusUnprocessableEntity)
	invalidContentResp.Body.Close()

	createTodoResp := requestJSON(
		t,
		client,
		http.MethodPost,
		apiURL+"/todos",
		map[string]any{
			"rule_id": ruleID,
			"content": map[string]any{
				"title":    "테스트 Todo",
				"priority": "high",
			},
		},
	)
	expectStatus(t, createTodoResp, http.StatusCreated)

	var createdTodo todo.Todo
	decodeJSON(t, createTodoResp, &createdTodo)

	if createdTodo.OwnerID != user.ID || createdTodo.RuleID != ruleID {
		t.Fatalf("created todo owner/rule = %d/%d, want %d/%d", createdTodo.OwnerID, createdTodo.RuleID, user.ID, ruleID)
	}

	adminGetTodoResp := request(t, adminClient, http.MethodGet, fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID))
	expectStatus(t, adminGetTodoResp, http.StatusOK)
	adminGetTodoResp.Body.Close()

	adminListTodosResp := request(t, adminClient, http.MethodGet, fmt.Sprintf("%s/users/%d/todos", apiURL, user.ID))
	expectStatus(t, adminListTodosResp, http.StatusOK)

	var userTodos []todo.Todo
	decodeJSON(t, adminListTodosResp, &userTodos)

	if len(userTodos) != 1 || userTodos[0].ID != createdTodo.ID {
		t.Fatalf("user todos = %+v, want todo %d", userTodos, createdTodo.ID)
	}

	forbiddenUpdateTodoResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID),
		map[string]any{"content": createdTodo.Content},
	)
	expectStatus(t, forbiddenUpdateTodoResp, http.StatusNotFound)
	forbiddenUpdateTodoResp.Body.Close()

	forbiddenDeleteTodoResp := request(t, adminClient, http.MethodDelete, fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID))
	expectStatus(t, forbiddenDeleteTodoResp, http.StatusNotFound)
	forbiddenDeleteTodoResp.Body.Close()

	forbiddenToggleResp := request(t, adminClient, http.MethodPatch, fmt.Sprintf("%s/todos/%d/complete", apiURL, createdTodo.ID))
	expectStatus(t, forbiddenToggleResp, http.StatusNotFound)
	forbiddenToggleResp.Body.Close()

	toggleResp := request(t, client, http.MethodPatch, fmt.Sprintf("%s/todos/%d/complete", apiURL, createdTodo.ID))
	expectStatus(t, toggleResp, http.StatusOK)

	var completedTodo todo.Todo
	decodeJSON(t, toggleResp, &completedTodo)

	if completedTodo.CompletedAt == nil {
		t.Fatal("completed_at is nil after completing todo")
	}

	updatedFields := []todorule.FieldDefinition{
		{
			Key:        "title",
			Label:      "Title",
			Type:       todorule.FieldShortText,
			Required:   true,
			ShowInList: true,
		},
	}
	updateRuleResp := requestJSON(
		t,
		adminClient,
		http.MethodPut,
		fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID),
		map[string]any{
			"rule_name": updatedRuleName,
			"fields":    updatedFields,
		},
	)
	expectStatus(t, updateRuleResp, http.StatusOK)
	updateRuleResp.Body.Close()

	prunedTodoResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID))
	expectStatus(t, prunedTodoResp, http.StatusOK)

	var prunedTodo todo.Todo
	decodeJSON(t, prunedTodoResp, &prunedTodo)

	if _, ok := prunedTodo.Content["priority"]; ok {
		t.Fatalf("removed priority field remains in todo content: %v", prunedTodo.Content)
	}

	invalidUpdateResp := requestJSON(
		t,
		client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID),
		map[string]any{
			"content": map[string]any{
				"title":    "수정된 Todo",
				"priority": "high",
			},
		},
	)
	expectStatus(t, invalidUpdateResp, http.StatusUnprocessableEntity)
	invalidUpdateResp.Body.Close()

	updateTodoResp := requestJSON(
		t,
		client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID),
		map[string]any{"content": map[string]any{"title": "수정된 Todo"}},
	)
	expectStatus(t, updateTodoResp, http.StatusOK)

	var updatedTodo todo.Todo
	decodeJSON(t, updateTodoResp, &updatedTodo)

	if updatedTodo.Content["title"] != "수정된 Todo" {
		t.Fatalf("updated title = %v, want %q", updatedTodo.Content["title"], "수정된 Todo")
	}
	if updatedTodo.CompletedAt == nil || !updatedTodo.CompletedAt.Equal(*completedTodo.CompletedAt) {
		t.Fatalf("content update changed completed_at: got %v, want %v", updatedTodo.CompletedAt, completedTodo.CompletedAt)
	}

	uncompleteResp := request(t, client, http.MethodPatch, fmt.Sprintf("%s/todos/%d/complete", apiURL, createdTodo.ID))
	expectStatus(t, uncompleteResp, http.StatusOK)

	var uncompletedTodo todo.Todo
	decodeJSON(t, uncompleteResp, &uncompletedTodo)

	if uncompletedTodo.CompletedAt != nil {
		t.Fatalf("completed_at = %v after toggling incomplete, want nil", uncompletedTodo.CompletedAt)
	}

	conflictDeleteRuleResp := request(t, adminClient, http.MethodDelete, fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID))
	expectStatus(t, conflictDeleteRuleResp, http.StatusConflict)
	conflictDeleteRuleResp.Body.Close()

	deleteTodoResp := request(t, client, http.MethodDelete, fmt.Sprintf("%s/todos/%d", apiURL, createdTodo.ID))
	expectStatus(t, deleteTodoResp, http.StatusNoContent)
	deleteTodoResp.Body.Close()

	deleteRuleResp := request(t, adminClient, http.MethodDelete, fmt.Sprintf("%s/todo-rules/%d", apiURL, ruleID))
	expectStatus(t, deleteRuleResp, http.StatusNoContent)
	deleteRuleResp.Body.Close()
	ruleID = 0

	missingRuleResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/todo-rules/%d", apiURL, createdRule.ID))
	expectStatus(t, missingRuleResp, http.StatusNotFound)
	missingRuleResp.Body.Close()

	logoutResp := request(t, client, http.MethodDelete, apiURL+"/logout")
	expectStatus(t, logoutResp, http.StatusNoContent)
	logoutResp.Body.Close()

	loggedOutMeResp := request(t, client, http.MethodGet, apiURL+"/me")
	expectStatus(t, loggedOutMeResp, http.StatusUnauthorized)
	loggedOutMeResp.Body.Close()
}

func newClient(t *testing.T) *http.Client {
	t.Helper()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}

	return &http.Client{Jar: jar}
}

func request(t *testing.T, client *http.Client, method, url string) *http.Response {
	t.Helper()

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		t.Fatal(err)
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}

	return resp
}

func requestJSON(t *testing.T, client *http.Client, method, url string, body any) *http.Response {
	t.Helper()

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest(method, url, &buf)
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

func decodeJSON(t *testing.T, resp *http.Response, dst any) {
	t.Helper()
	defer resp.Body.Close()

	if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
		t.Fatal(err)
	}
}

func expectStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()

	if resp.StatusCode == want {
		return
	}

	body, _ := io.ReadAll(resp.Body)
	t.Fatalf("status = %d, want %d; body = %s", resp.StatusCode, want, string(body))
}
