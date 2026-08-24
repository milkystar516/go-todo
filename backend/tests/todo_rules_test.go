package tests

import (
	"fmt"
	"net/http"
	"testing"
)

func TestTodoRuleLifecycle(t *testing.T) {
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
	ruleBody := map[string]any{
		"rule_name":      "  " + ruleName + "  ",
		"content_schema": contentSchema,
		"ui_schema": map[string]any{
			"priority": map[string]any{"ui:widget": "radio"},
		},
		"list_columns": []map[string]any{
			{"pointer": " /title ", "label": " Title "},
		},
	}

	forbiddenCreateResp := requestJSON(t, member.client, http.MethodPost, api.apiURL+"/todo-rules", ruleBody)
	expectStatus(t, forbiddenCreateResp, http.StatusForbidden)
	forbiddenCreateResp.Body.Close()

	invalidRuleResp := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
		"rule_name":      "   ",
		"content_schema": contentSchema,
		"ui_schema":      map[string]any{},
		"list_columns":   []any{},
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

	if ruleDetail.ContentSchema["$schema"] != "https://json-schema.org/draft/2020-12/schema" {
		t.Fatalf("unexpected schema draft: %v", ruleDetail.ContentSchema["$schema"])
	}

	properties, ok := ruleDetail.ContentSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("schema properties = %T, want object", ruleDetail.ContentSchema["properties"])
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
	if len(ruleDetail.ListColumns) != 1 || ruleDetail.ListColumns[0].Pointer != "/title" || ruleDetail.ListColumns[0].Label != "Title" {
		t.Fatalf("list columns were not normalized: %+v", ruleDetail.ListColumns)
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

func TestTodoRuleRejectsInvalidDefinitions(t *testing.T) {
	api := newTestAPI(t)
	adminClient, _ := api.newAdminClient(t)

	validRoot := func(properties map[string]any) map[string]any {
		return map[string]any{
			"$schema":              "https://json-schema.org/draft/2020-12/schema",
			"type":                 "object",
			"properties":           properties,
			"additionalProperties": false,
		}
	}

	tests := []struct {
		name        string
		content     any
		uiSchema    any
		listColumns any
	}{
		{
			name: "invalid schema keyword value",
			content: validRoot(map[string]any{
				"amount": map[string]any{"type": "number", "multipleOf": 0},
			}),
			uiSchema:    map[string]any{},
			listColumns: []any{},
		},
		{
			name: "external reference",
			content: validRoot(map[string]any{
				"value": map[string]any{"$ref": "https://example.com/value.json"},
			}),
			uiSchema:    map[string]any{},
			listColumns: []any{},
		},
		{
			name:        "non-object ui schema",
			content:     validRoot(map[string]any{}),
			uiSchema:    []any{},
			listColumns: []any{},
		},
		{
			name:     "duplicate list pointer",
			content:  validRoot(map[string]any{}),
			uiSchema: map[string]any{},
			listColumns: []map[string]any{
				{"pointer": "/title", "label": "Title"},
				{"pointer": "/title", "label": "Duplicate"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := requestJSON(t, adminClient, http.MethodPost, api.apiURL+"/todo-rules", map[string]any{
				"rule_name":      uniqueValue("invalid rule"),
				"content_schema": tt.content,
				"ui_schema":      tt.uiSchema,
				"list_columns":   tt.listColumns,
			})

			expectProblem(
				t,
				response,
				http.StatusUnprocessableEntity,
				"/problems/validation-failed",
				"Request validation failed",
			)
		})
	}
}
