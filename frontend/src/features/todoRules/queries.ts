import { queryOptions } from "@tanstack/react-query";

import {
  getTodoRule,
  listTodoRules,
} from "../../api/todoRules";

export const todoRuleQueryKeys = {
  all: ["todo-rules"] as const,
  list: () => [...todoRuleQueryKeys.all, "list"] as const,
  detail: (ruleId: number) =>
    [...todoRuleQueryKeys.all, "detail", ruleId] as const,
};

export const todoRulesQueryOptions = queryOptions({
  queryKey: todoRuleQueryKeys.list(),
  queryFn: ({ signal }) => listTodoRules(signal),
});

export function todoRuleQueryOptions(ruleId: number) {
  return queryOptions({
    queryKey: todoRuleQueryKeys.detail(ruleId),
    queryFn: ({ signal }) => getTodoRule(ruleId, signal),
  });
}
