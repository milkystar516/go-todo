package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/todo"
	todolist "github.com/milkystar516/go-todo/backend/internal/todo_list"
)

type todoListMemberResponse struct {
	ID       int64               `json:"id"`
	Username string              `json:"username"`
	Nickname *string             `json:"nickname"`
	Role     todolist.MemberRole `json:"role"`
}

func TestTodoListLifecycleAndOwnerAccess(t *testing.T) {
	api := newTestAPI(t)
	creator := api.newAuthenticatedUser(t)
	member := api.newAuthenticatedUser(t)
	leaver := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)

	contentSchema := map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema",
		"type":    "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
		"required":             []string{"title"},
		"additionalProperties": false,
	}

	createRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
		"rule_name":      uniqueValue("list rule"),
		"content_schema": contentSchema,
		"ui_schema":      map[string]any{},
		"list_columns":   []map[string]any{{"pointer": "/title", "label": "Title"}},
	})
	expectStatus(t, createRuleResp, http.StatusCreated)

	var rule todoRuleResponse
	decodeJSON(t, createRuleResp, &rule)
	api.registerTodoRuleCleanup(t, rule.ID)

	unknownRuleResp := requestJSON(t, creator.client, http.MethodPost, api.apiURL+"/lists", map[string]any{
		"name":            "Unknown rule",
		"default_rule_id": 9223372036854775807,
	})
	expectProblem(
		t,
		unknownRuleResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	list := api.createTodoList(t, creator, rule.ID)
	if _, err := todolist.ParseID(list.ID); err != nil {
		t.Fatalf("list id = %q, want UUID: %v", list.ID, err)
	}
	listURL := fmt.Sprintf("%s/lists/%s", api.apiURL, list.ID)

	creatorListsResp := request(t, creator.client, http.MethodGet, api.apiURL+"/lists")
	expectStatus(t, creatorListsResp, http.StatusOK)
	var creatorLists []todoListResponse
	decodeJSON(t, creatorListsResp, &creatorLists)
	if len(creatorLists) != 1 || creatorLists[0].ID != list.ID {
		t.Fatalf("creator lists = %+v, want list %s", creatorLists, list.ID)
	}

	outsiderGetResp := request(t, member.client, http.MethodGet, listURL)
	expectStatus(t, outsiderGetResp, http.StatusNotFound)
	outsiderGetResp.Body.Close()

	outsiderUpdateResp := requestJSON(
		t,
		member.client,
		http.MethodPut,
		listURL,
		map[string]any{"name": "Forbidden", "default_rule_id": rule.ID},
	)
	expectStatus(t, outsiderUpdateResp, http.StatusNotFound)
	outsiderUpdateResp.Body.Close()

	membersURL := listURL + "/members"
	membersResp := request(t, creator.client, http.MethodGet, membersURL)
	expectStatus(t, membersResp, http.StatusOK)
	var members []todoListMemberResponse
	decodeJSON(t, membersResp, &members)
	if len(members) != 1 || members[0].ID != creator.user.ID || members[0].Role != todolist.MemberRoleOwner {
		t.Fatalf("initial members = %+v, want creator owner", members)
	}

	removeSoleOwnerResp := request(
		t,
		creator.client,
		http.MethodDelete,
		fmt.Sprintf("%s/%d", membersURL, creator.user.ID),
	)
	expectStatus(t, removeSoleOwnerResp, http.StatusConflict)
	removeSoleOwnerResp.Body.Close()

	addMemberResp := request(
		t,
		creator.client,
		http.MethodPut,
		fmt.Sprintf("%s/%d", membersURL, member.user.ID),
	)
	expectStatus(t, addMemberResp, http.StatusNoContent)
	addMemberResp.Body.Close()

	memberGetResp := request(t, member.client, http.MethodGet, listURL)
	expectStatus(t, memberGetResp, http.StatusOK)
	memberGetResp.Body.Close()

	memberUpdateResp := requestJSON(
		t,
		member.client,
		http.MethodPut,
		listURL,
		map[string]any{"name": "Forbidden", "default_rule_id": rule.ID},
	)
	expectStatus(t, memberUpdateResp, http.StatusForbidden)
	memberUpdateResp.Body.Close()

	memberDeleteResp := request(t, member.client, http.MethodDelete, listURL)
	expectStatus(t, memberDeleteResp, http.StatusForbidden)
	memberDeleteResp.Body.Close()

	memberAddResp := request(
		t,
		member.client,
		http.MethodPut,
		fmt.Sprintf("%s/%d", membersURL, leaver.user.ID),
	)
	expectStatus(t, memberAddResp, http.StatusForbidden)
	memberAddResp.Body.Close()

	promoteURL := fmt.Sprintf("%s/owners/%d", listURL, member.user.ID)
	memberPromoteResp := request(t, member.client, http.MethodPut, promoteURL)
	expectStatus(t, memberPromoteResp, http.StatusForbidden)
	memberPromoteResp.Body.Close()

	ownerAddLeaverResp := request(
		t,
		creator.client,
		http.MethodPut,
		fmt.Sprintf("%s/%d", membersURL, leaver.user.ID),
	)
	expectStatus(t, ownerAddLeaverResp, http.StatusNoContent)
	ownerAddLeaverResp.Body.Close()

	leaverLeavesResp := request(
		t,
		leaver.client,
		http.MethodDelete,
		fmt.Sprintf("%s/%d", membersURL, leaver.user.ID),
	)
	expectStatus(t, leaverLeavesResp, http.StatusNoContent)
	leaverLeavesResp.Body.Close()

	createTodoResp := requestJSON(t, creator.client, http.MethodPost, api.apiURL+"/todos", map[string]any{
		"list_id": list.ID,
		"content": map[string]any{"title": "Shared todo"},
	})
	expectStatus(t, createTodoResp, http.StatusCreated)
	var createdTodo todo.Todo
	decodeJSON(t, createTodoResp, &createdTodo)
	if createdTodo.RuleID != rule.ID || createdTodo.ListID != list.ID {
		t.Fatalf("created todo = %+v, want list %s and rule %d", createdTodo, list.ID, rule.ID)
	}

	memberTodoResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID))
	expectStatus(t, memberTodoResp, http.StatusOK)
	memberTodoResp.Body.Close()

	listTodosResp := request(t, member.client, http.MethodGet, listURL+"/todos")
	expectStatus(t, listTodosResp, http.StatusOK)
	var listTodos []todo.Todo
	decodeJSON(t, listTodosResp, &listTodos)
	if len(listTodos) != 1 || listTodos[0].ID != createdTodo.ID {
		t.Fatalf("list todos = %+v, want todo %d", listTodos, createdTodo.ID)
	}

	promoteResp := request(t, creator.client, http.MethodPut, promoteURL)
	expectStatus(t, promoteResp, http.StatusNoContent)
	promoteResp.Body.Close()

	removeOriginalOwnerResp := request(
		t,
		creator.client,
		http.MethodDelete,
		fmt.Sprintf("%s/%d", membersURL, creator.user.ID),
	)
	expectStatus(t, removeOriginalOwnerResp, http.StatusNoContent)
	removeOriginalOwnerResp.Body.Close()

	removedOwnerGetResp := request(t, creator.client, http.MethodGet, listURL)
	expectStatus(t, removedOwnerGetResp, http.StatusNotFound)
	removedOwnerGetResp.Body.Close()

	updatedName := uniqueValue("transferred list")
	newOwnerUpdateResp := requestJSON(
		t,
		member.client,
		http.MethodPut,
		listURL,
		map[string]any{"name": "  " + updatedName + "  ", "default_rule_id": rule.ID},
	)
	expectStatus(t, newOwnerUpdateResp, http.StatusOK)
	var updatedList todoListResponse
	decodeJSON(t, newOwnerUpdateResp, &updatedList)
	if updatedList.Name != updatedName {
		t.Fatalf("updated list name = %q, want %q", updatedList.Name, updatedName)
	}

	removeLastOwnerResp := request(
		t,
		member.client,
		http.MethodDelete,
		fmt.Sprintf("%s/%d", membersURL, member.user.ID),
	)
	expectStatus(t, removeLastOwnerResp, http.StatusConflict)
	removeLastOwnerResp.Body.Close()

	deleteListResp := request(t, member.client, http.MethodDelete, listURL)
	expectStatus(t, deleteListResp, http.StatusNoContent)
	deleteListResp.Body.Close()

	deletedTodoResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/todos/%d", api.apiURL, createdTodo.ID))
	expectStatus(t, deletedTodoResp, http.StatusNotFound)
	deletedTodoResp.Body.Close()
}
