package tests

import (
	"fmt"
	"net/http"
	"testing"

	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

func TestTodoRuleLifecycle(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, _ := api.newAdminClient(t)
	ruleName := uniqueValue("integration rule")

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

	forbiddenCreateResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todo-rules", ruleBody)
	expectStatus(t, forbiddenCreateResp, http.StatusForbidden)
	forbiddenCreateResp.Body.Close()

	invalidRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
		"rule_name": "   ",
		"fields":    fields,
	})
	expectProblem(
		t,
		invalidRuleResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	createRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", ruleBody)
	expectStatus(t, createRuleResp, http.StatusCreated)

	var createdRule todoRuleResponse
	decodeJSON(t, createRuleResp, &createdRule)
	api.registerTodoRuleCleanup(t, createdRule.ID)

	if createdRule.ID == 0 {
		t.Fatal("created rule response has no id")
	}
	if createdRule.RuleName != ruleName {
		t.Fatalf("created rule name = %q, want %q", createdRule.RuleName, ruleName)
	}

	listRulesResp := request(t, member.client, http.MethodGet, api.apiURL+"/todo-rules")
	expectStatus(t, listRulesResp, http.StatusOK)

	var rules []todoRuleResponse
	decodeJSON(t, listRulesResp, &rules)

	foundRule := false
	for _, rule := range rules {
		if rule.ID == createdRule.ID {
			foundRule = true
			break
		}
	}
	if !foundRule {
		t.Fatalf("created todo rule %d is missing from list", createdRule.ID)
	}

	getRuleResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID))
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
	if ruleDetail.Schema["$schema"] != "https://json-schema.org/draft/2020-12/schema" {
		t.Fatalf("unexpected schema draft: %v", ruleDetail.Schema["$schema"])
	}

	properties, ok := ruleDetail.Schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("schema properties = %T, want object", ruleDetail.Schema["properties"])
	}
	prioritySchema, ok := properties["priority"].(map[string]any)
	if !ok {
		t.Fatalf("priority schema = %T, want object", properties["priority"])
	}
	options, ok := prioritySchema["enum"].([]any)
	if !ok {
		t.Fatalf("priority enum = %T, want array", prioritySchema["enum"])
	}
	if len(options) != 2 || options[0] != "high" || options[1] != "low" {
		t.Fatalf("priority enum = %v, want [high low]", options)
	}

	forbiddenPatchResp := requestJSON(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		map[string]any{"rule_name": "forbidden"},
	)
	expectStatus(t, forbiddenPatchResp, http.StatusForbidden)
	forbiddenPatchResp.Body.Close()

	forbiddenPutResp := requestJSON(
		t,
		member.client,
		http.MethodPut,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		ruleBody,
	)
	expectStatus(t, forbiddenPutResp, http.StatusForbidden)
	forbiddenPutResp.Body.Close()

	forbiddenDeleteResp := request(
		t,
		member.client,
		http.MethodDelete,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
	)
	expectStatus(t, forbiddenDeleteResp, http.StatusForbidden)
	forbiddenDeleteResp.Body.Close()

	updatedRuleName := ruleName + " updated"
	updateTitleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/todo-rules/%d", api.apiURL, createdRule.ID),
		map[string]any{"rule_name": "  " + updatedRuleName + "  "},
	)
	expectStatus(t, updateTitleResp, http.StatusOK)

	var titledRule todoRuleResponse
	decodeJSON(t, updateTitleResp, &titledRule)
	if titledRule.RuleName != updatedRuleName {
		t.Fatalf("updated rule name = %q, want %q", titledRule.RuleName, updatedRuleName)
	}

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
