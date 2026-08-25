import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { apiJson, apiRequest } from "./client";
import type { ListColumn, TodoRule, TodoRuleDetail } from "./types";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export interface TodoRuleWriteInput {
  rule_name: string;
  content_schema: RJSFSchema;
  ui_schema: UiSchema;
  list_columns: ListColumn[];
}

export function listTodoRules(
  signal?: AbortSignal,
): Promise<TodoRule[]> {
  return apiJson<TodoRule[]>("/todo-rules", { signal });
}

export function getTodoRule(
  ruleId: number,
  signal?: AbortSignal,
): Promise<TodoRuleDetail> {
  return apiJson<TodoRuleDetail>(`/todo-rules/${ruleId}`, { signal });
}

export function createTodoRule(
  input: TodoRuleWriteInput,
): Promise<TodoRule> {
  return apiJson<TodoRule>("/todo-rules", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function updateTodoRule(
  ruleId: number,
  input: TodoRuleWriteInput,
): Promise<TodoRule> {
  return apiJson<TodoRule>(`/todo-rules/${ruleId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function updateTodoRuleTitle(
  ruleId: number,
  ruleName: string,
): Promise<TodoRule> {
  return apiJson<TodoRule>(`/todo-rules/${ruleId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ rule_name: ruleName }),
  });
}

export async function deleteTodoRule(
  ruleId: number,
): Promise<void> {
  await apiRequest(`/todo-rules/${ruleId}`, {
    method: "DELETE",
  });
}