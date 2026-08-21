package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/todo"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

func TestTodoLifecycle(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)
	ruleName := uniqueValue("integration rule")

	fields := []todorule.FieldDefinition{
		{
			Key:        "title",
			Label:      "Title",
			Type:       todorule.FieldShortText,
			Required:   true,
			ShowInList: true,
		},
		{
			Key:     "priority",
			Label:   "Priority",
			Type:    todorule.FieldSingleSelect,
			Options: []string{"high", "low"},
		},
	}

	createRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
		"rule_name": ruleName,
		"fields":    fields,
	})
	expectStatus(t, createRuleResp, http.StatusCreated)

	var createdRule todoRuleResponse
	decodeJSON(t, createRuleResp, &createdRule)
	api.registerTodoRuleCleanup(t, createdRule.ID)
	if createdRule.ID == 0 {
		t.Fatal("created rule response has no id")
	}

	missingRuleIDResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"content": map[string]any{"title": "Todo"},
	})
	expectProblem(
		t,
		missingRuleIDResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	unknownRuleResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"rule_id": 9223372036854775807,
		"content": map[string]any{"title": "Todo"},
	})
	expectProblem(
		t,
		unknownRuleResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	invalidContentResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"rule_id": createdRule.ID,
		"content": map[string]any{"unknown": true},
	})
	expectProblem(
		t,
		invalidContentResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	createTodoResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"rule_id": createdRule.ID,
		"content": map[string]any{
			"title":    "테스트 Todo",
			"priority": "high",
		},
	})
	expectStatus(t, createTodoResp, http.StatusCreated)

	var createdTodo todo.Todo
	decodeJSON(t, createTodoResp, &createdTodo)
	if createdTodo.OwnerID != member.user.ID || createdTodo.RuleID != createdRule.ID {
		t.Fatalf(
			"created todo owner/rule = %d/%d, want %d/%d",
			createdTodo.OwnerID,
			createdTodo.RuleID,
			member.user.ID,
			createdRule.ID,
		)
	}

	adminGetTodoResp := request(t, adminClient, http.MethodGet, fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID))
	expectStatus(t, adminGetTodoResp, http.StatusOK)
	adminGetTodoResp.Body.Close()

	adminListTodosResp := request(
		t,
		adminClient,
		http.MethodGet,
		fmt.Sprintf("%s/users/%d/todos", api.apiURL, member.user.ID),
	)
	expectStatus(t, adminListTodosResp, http.StatusOK)

	var userTodos []todo.Todo
	decodeJSON(t, adminListTodosResp, &userTodos)
	if len(userTodos) != 1 || userTodos[0].ID != createdTodo.ID {
		t.Fatalf("user todos = %+v, want todo %d", userTodos, createdTodo.ID)
	}

	adminUpdateTodoResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
		map[string]any{"content": createdTodo.Content},
	)
	expectStatus(t, adminUpdateTodoResp, http.StatusNotFound)
	adminUpdateTodoResp.Body.Close()

	adminDeleteTodoResp := request(
		t,
		adminClient,
		http.MethodDelete,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, adminDeleteTodoResp, http.StatusNotFound)
	adminDeleteTodoResp.Body.Close()

	adminToggleResp := request(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, adminToggleResp, http.StatusNotFound)
	adminToggleResp.Body.Close()

	toggleResp := request(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, toggleResp, http.StatusOK)

	var completedTodo todo.Todo
	decodeJSON(t, toggleResp, &completedTodo)
	if completedTodo.CompletedAt == nil {
		t.Fatal("completed_at is nil after completing todo")
	}

	updatedRuleName := ruleName + " updated"
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
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		map[string]any{
			"rule_name": updatedRuleName,
			"fields":    updatedFields,
		},
	)
	expectStatus(t, updateRuleResp, http.StatusOK)
	updateRuleResp.Body.Close()

	prunedTodoResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID))
	expectStatus(t, prunedTodoResp, http.StatusOK)

	var prunedTodo todo.Todo
	decodeJSON(t, prunedTodoResp, &prunedTodo)
	if _, ok := prunedTodo.Content["priority"]; ok {
		t.Fatalf("removed priority field remains in todo content: %v", prunedTodo.Content)
	}

	invalidUpdateResp := requestJSON(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
		map[string]any{
			"content": map[string]any{
				"title":    "수정된 Todo",
				"priority": "high",
			},
		},
	)
	expectProblem(
		t,
		invalidUpdateResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	updateTodoResp := requestJSON(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
		map[string]any{"content": map[string]any{"title": "수정된 Todo"}},
	)
	expectStatus(t, updateTodoResp, http.StatusOK)

	var updatedTodo todo.Todo
	decodeJSON(t, updateTodoResp, &updatedTodo)
	if updatedTodo.Content["title"] != "수정된 Todo" {
		t.Fatalf("updated title = %v, want %q", updatedTodo.Content["title"], "수정된 Todo")
	}
	if updatedTodo.CompletedAt == nil || !updatedTodo.CompletedAt.Equal(*completedTodo.CompletedAt) {
		t.Fatalf(
			"content update changed completed_at: got %v, want %v",
			updatedTodo.CompletedAt,
			completedTodo.CompletedAt,
		)
	}

	uncompleteResp := request(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, uncompleteResp, http.StatusOK)

	var uncompletedTodo todo.Todo
	decodeJSON(t, uncompleteResp, &uncompletedTodo)
	if uncompletedTodo.CompletedAt != nil {
		t.Fatalf("completed_at = %v after toggling incomplete, want nil", uncompletedTodo.CompletedAt)
	}

	conflictDeleteRuleResp := request(
		t,
		adminClient,
		http.MethodDelete,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
	)
	expectProblem(
		t,
		conflictDeleteRuleResp,
		http.StatusConflict,
		"/problems/rule-in-use",
		"Todo rule is in use",
	)

	deleteTodoResp := request(
		t,
		member.client,
		http.MethodDelete,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, deleteTodoResp, http.StatusNoContent)
	deleteTodoResp.Body.Close()

	deleteRuleResp := request(
		t,
		adminClient,
		http.MethodDelete,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
	)
	expectStatus(t, deleteRuleResp, http.StatusNoContent)
	deleteRuleResp.Body.Close()

	missingRuleResp := request(
		t,
		member.client,
		http.MethodGet,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
	)
	expectStatus(t, missingRuleResp, http.StatusNotFound)
	missingRuleResp.Body.Close()
}
