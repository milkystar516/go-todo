package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/todo"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

func TestDefaultChecklistRule(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)

	getRuleResp := request(
		t,
		member.client,
		http.MethodGet,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, todorule.DefaultRuleID),
	)
	expectStatus(t, getRuleResp, http.StatusOK)

	var checklistRule todoRuleDetailResponse
	decodeJSON(t, getRuleResp, &checklistRule)
	if checklistRule.RuleName != "Checklist" {
		t.Fatalf("default rule name = %q, want Checklist", checklistRule.RuleName)
	}

	properties, ok := checklistRule.ContentSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("checklist properties = %T, want object", checklistRule.ContentSchema["properties"])
	}
	itemsSchema, ok := properties["items"].(map[string]any)
	if !ok || itemsSchema["type"] != "array" {
		t.Fatalf("checklist items schema = %#v, want array", properties["items"])
	}
	itemSchema, ok := itemsSchema["items"].(map[string]any)
	if !ok || itemSchema["type"] != "object" {
		t.Fatalf("checklist item schema = %#v, want object", itemsSchema["items"])
	}
	itemProperties, ok := itemSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("checklist item properties = %T, want object", itemSchema["properties"])
	}
	completedSchema, ok := itemProperties["completed"].(map[string]any)
	if !ok || completedSchema["type"] != "boolean" {
		t.Fatalf("completed schema = %#v, want boolean", itemProperties["completed"])
	}

	itemsUI, ok := checklistRule.UISchema["items"].(map[string]any)
	if !ok {
		t.Fatalf("checklist items ui schema = %T, want object", checklistRule.UISchema["items"])
	}
	itemUI, ok := itemsUI["items"].(map[string]any)
	if !ok {
		t.Fatalf("checklist item ui schema = %T, want object", itemsUI["items"])
	}
	completedUI, ok := itemUI["completed"].(map[string]any)
	if !ok || completedUI["ui:widget"] != "checkbox" {
		t.Fatalf("completed ui schema = %#v, want checkbox widget", itemUI["completed"])
	}

	deleteDefaultResp := request(
		t,
		adminClient,
		http.MethodDelete,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, todorule.DefaultRuleID),
	)
	expectProblem(
		t,
		deleteDefaultResp,
		http.StatusConflict,
		"/problems/rule-in-use",
		"Todo rule is in use",
	)

	createListResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/lists", map[string]any{
		"name": uniqueValue("default checklist list"),
	})
	expectStatus(t, createListResp, http.StatusCreated)
	var list todoListResponse
	decodeJSON(t, createListResp, &list)
	api.registerTodoListCleanup(t, list.ID)
	if list.DefaultRuleID != todorule.DefaultRuleID {
		t.Fatalf("list default rule = %d, want %d", list.DefaultRuleID, todorule.DefaultRuleID)
	}

	createTodoResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"list_id": list.ID,
		"rule_id": nil,
		"content": map[string]any{
			"title": "Default checklist",
			"items": []map[string]any{
				{"text": "First item", "completed": false},
			},
		},
	})
	expectStatus(t, createTodoResp, http.StatusCreated)
	var createdTodo todo.Todo
	decodeJSON(t, createTodoResp, &createdTodo)
	if createdTodo.RuleID != todorule.DefaultRuleID {
		t.Fatalf("todo rule = %d, want %d", createdTodo.RuleID, todorule.DefaultRuleID)
	}
}

func TestTodoLifecycle(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)
	ruleName := uniqueValue("integration rule")

	contentSchema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type":  "string",
				"title": "Title",
			},
			"priority": map[string]any{
				"type":  "string",
				"title": "Priority",
				"enum":  []string{"high", "low"},
			},
		},
		"required":             []string{"title"},
		"additionalProperties": false,
	}

	createRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
		"rule_name":      ruleName,
		"content_schema": contentSchema,
		"ui_schema":      map[string]any{},
		"list_columns": []map[string]any{
			{"pointer": "/title", "label": "Title"},
		},
	})
	expectStatus(t, createRuleResp, http.StatusCreated)

	var createdRule todoRuleResponse
	decodeJSON(t, createRuleResp, &createdRule)
	api.registerTodoRuleCleanup(t, createdRule.ID)
	if createdRule.ID == 0 {
		t.Fatal("created rule response has no id")
	}
	createdList := api.createTodoList(t, member, createdRule.ID)

	nullRuleResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"list_id": createdList.ID,
		"rule_id": nil,
		"content": map[string]any{
			"title": "Global default overrides list UI default",
			"items": []any{},
		},
	})
	expectStatus(t, nullRuleResp, http.StatusCreated)
	var defaultRuleTodo todo.Todo
	decodeJSON(t, nullRuleResp, &defaultRuleTodo)
	if defaultRuleTodo.RuleID != todorule.DefaultRuleID {
		t.Fatalf("null rule_id selected rule %d, want %d", defaultRuleTodo.RuleID, todorule.DefaultRuleID)
	}

	missingListIDResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"content": map[string]any{"title": "Todo"},
	})
	expectProblem(
		t,
		missingListIDResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	unknownRuleResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"list_id": createdList.ID,
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
		"list_id": createdList.ID,
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
		"list_id": createdList.ID,
		"rule_id": createdRule.ID,
		"content": map[string]any{
			"title":    "테스트 Todo",
			"priority": "high",
		},
	})
	expectStatus(t, createTodoResp, http.StatusCreated)

	var createdTodo todo.Todo
	decodeJSON(t, createTodoResp, &createdTodo)
	if createdTodo.OwnerID != member.user.ID || createdTodo.ListID != createdList.ID || createdTodo.RuleID != createdRule.ID {
		t.Fatalf(
			"created todo owner/list/rule = %d/%s/%d, want %d/%s/%d",
			createdTodo.OwnerID,
			createdTodo.ListID,
			createdTodo.RuleID,
			member.user.ID,
			createdList.ID,
			createdRule.ID,
		)
	}

	adminGetTodoResp := request(t, adminClient, http.MethodGet, fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID))
	expectStatus(t, adminGetTodoResp, http.StatusNotFound)
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
	if len(userTodos) != 0 {
		t.Fatalf("user todos visible to non-member = %+v", userTodos)
	}

	missingUserTodosResp := request(
		t,
		adminClient,
		http.MethodGet,
		fmt.Sprintf("%s/users/%d/todos", api.apiURL, int64(9223372036854775807)),
	)
	expectStatus(t, missingUserTodosResp, http.StatusNotFound)
	missingUserTodosResp.Body.Close()

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
	updatedContentSchema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type":  "string",
				"title": "Title",
			},
		},
		"required":             []string{"title"},
		"additionalProperties": false,
	}
	updatedRuleBody := map[string]any{
		"rule_name":      updatedRuleName,
		"content_schema": updatedContentSchema,
		"ui_schema":      map[string]any{},
		"list_columns": []map[string]any{
			{"pointer": "/title", "label": "Title"},
		},
	}

	updateRuleResp := requestJSON(
		t,
		adminClient,
		http.MethodPut,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		updatedRuleBody,
	)
	expectStatus(t, updateRuleResp, http.StatusOK)
	updateRuleResp.Body.Close()

	prunedTodoResp := request(
		t,
		member.client,
		http.MethodGet,
		fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID),
	)
	expectStatus(t, prunedTodoResp, http.StatusOK)

	var prunedTodo todo.Todo
	decodeJSON(t, prunedTodoResp, &prunedTodo)
	prunedContent := decodeRawObject(t, prunedTodo.Content)
	if _, ok := prunedContent["priority"]; ok {
		t.Fatalf("removed priority field remains in todo content: %v", prunedContent)
	}
	if prunedContent["title"] != "테스트 Todo" {
		t.Fatalf("prune changed retained title: %v", prunedContent["title"])
	}
	if prunedTodo.CompletedAt == nil || !prunedTodo.CompletedAt.Equal(*completedTodo.CompletedAt) {
		t.Fatalf(
			"rule prune changed completed_at: got %v, want %v",
			prunedTodo.CompletedAt,
			completedTodo.CompletedAt,
		)
	}

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
	updatedContent := decodeRawObject(t, updatedTodo.Content)
	if updatedContent["title"] != "수정된 Todo" {
		t.Fatalf("updated title = %v, want %q", updatedContent["title"], "수정된 Todo")
	}
	if updatedTodo.CompletedAt == nil || !updatedTodo.CompletedAt.Equal(*completedTodo.CompletedAt) {
		t.Fatalf(
			"content update changed completed_at: got %v, want %v",
			updatedTodo.CompletedAt,
			completedTodo.CompletedAt,
		)
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

	deleteListResp := request(
		t,
		member.client,
		http.MethodDelete,
		fmt.Sprintf("%s/lists/%s", api.apiURL, createdList.ID),
	)
	expectStatus(t, deleteListResp, http.StatusNoContent)
	deleteListResp.Body.Close()

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

func TestRepeatedRuleUpdatesPruneOnlyRemovedRootFields(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)

	schema := func(properties map[string]any, required ...string) map[string]any {
		return map[string]any{
			"$schema":              "https://json-schema.org/draft/2020-12/schema",
			"type":                 "object",
			"properties":           properties,
			"required":             required,
			"additionalProperties": false,
		}
	}
	ruleBody := func(contentSchema map[string]any) map[string]any {
		return map[string]any{
			"rule_name":      uniqueValue("frequently updated rule"),
			"content_schema": contentSchema,
			"ui_schema":      map[string]any{},
			"list_columns": []map[string]any{
				{"pointer": "/title", "label": "Title"},
			},
		}
	}

	initialSchema := schema(map[string]any{
		"title":    map[string]any{"type": "string"},
		"memo":     map[string]any{"type": "string"},
		"priority": map[string]any{"type": "string"},
	}, "title")
	createRuleResp := requestJSON(
		t,
		adminClient,
		http.MethodPost,
		api.apiURL+"/todo-rules",
		ruleBody(initialSchema),
	)
	expectStatus(t, createRuleResp, http.StatusCreated)

	var createdRule todoRuleResponse
	decodeJSON(t, createRuleResp, &createdRule)
	api.registerTodoRuleCleanup(t, createdRule.ID)
	createdList := api.createTodoList(t, member, createdRule.ID)

	createTodo := func(content map[string]any) todo.Todo {
		resp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
			"list_id": createdList.ID,
			"rule_id": createdRule.ID,
			"content": content,
		})
		expectStatus(t, resp, http.StatusCreated)

		var created todo.Todo
		decodeJSON(t, resp, &created)
		return created
	}

	first := createTodo(map[string]any{
		"title":    "first",
		"memo":     "must be pruned",
		"priority": "high",
	})
	second := createTodo(map[string]any{
		"title": "second",
		"memo":  "also pruned",
	})

	completeResp := request(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todos/%d/complete", api.apiURL, second.ID),
	)
	expectStatus(t, completeResp, http.StatusOK)
	var completedSecond todo.Todo
	decodeJSON(t, completeResp, &completedSecond)

	// Adding a required field is allowed without rewriting old Todos. Removed
	// root properties, however, are pruned from every affected Todo.
	secondSchema := schema(map[string]any{
		"title":    map[string]any{"type": "string", "minLength": 1},
		"deadline": map[string]any{"type": "string", "format": "date"},
	}, "title", "deadline")
	updateResp := requestJSON(
		t,
		adminClient,
		http.MethodPut,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		ruleBody(secondSchema),
	)
	expectStatus(t, updateResp, http.StatusOK)
	updateResp.Body.Close()

	getTodo := func(todoID int64) todo.Todo {
		resp := request(
			t,
			member.client,
			http.MethodGet,
			fmt.Sprintf("%s/todos/%d", api.apiURL, todoID),
		)
		expectStatus(t, resp, http.StatusOK)

		var got todo.Todo
		decodeJSON(t, resp, &got)
		return got
	}

	for _, item := range []todo.Todo{getTodo(first.ID), getTodo(second.ID)} {
		content := decodeRawObject(t, item.Content)
		if _, ok := content["memo"]; ok {
			t.Fatalf("memo remains after rule update for todo %d: %v", item.ID, content)
		}
		if _, ok := content["priority"]; ok {
			t.Fatalf("priority remains after rule update for todo %d: %v", item.ID, content)
		}
		if _, ok := content["deadline"]; ok {
			t.Fatalf("new required field was backfilled for todo %d: %v", item.ID, content)
		}
	}

	prunedSecond := getTodo(second.ID)
	if prunedSecond.CompletedAt == nil || !prunedSecond.CompletedAt.Equal(*completedSecond.CompletedAt) {
		t.Fatalf(
			"repeated rule update changed completed_at: got %v, want %v",
			prunedSecond.CompletedAt,
			completedSecond.CompletedAt,
		)
	}

	// Re-adding a previously removed property, even with a default, must not
	// resurrect or backfill content that was deliberately pruned.
	thirdSchema := schema(map[string]any{
		"title": map[string]any{"type": "string", "minLength": 2},
		"memo":  map[string]any{"type": "string", "default": "new default"},
	}, "title")
	updateResp = requestJSON(
		t,
		adminClient,
		http.MethodPut,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		ruleBody(thirdSchema),
	)
	expectStatus(t, updateResp, http.StatusOK)
	updateResp.Body.Close()

	for _, item := range []todo.Todo{getTodo(first.ID), getTodo(second.ID)} {
		content := decodeRawObject(t, item.Content)
		if _, ok := content["memo"]; ok {
			t.Fatalf("removed memo was resurrected for todo %d: %v", item.ID, content)
		}
		if content["title"] == nil {
			t.Fatalf("retained title was removed for todo %d: %v", item.ID, content)
		}
	}
}
