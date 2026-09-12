import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query"

import {
  createTodoRule,
  deleteTodoRule,
  getTodoRule,
  listTodoRules,
  updateTodoRule,
  type TodoRuleWriteInput,
} from "../../api/todoRules"
import type {
  TodoRuleDetail,
} from "../../api/types"
import {
  todoQueryKeys,
} from "../todos/queries"

export const todoRuleQueryKeys = {
  all: [
    "todo-rules",
  ] as const,

  list: () =>
    [
      ...todoRuleQueryKeys.all,
      "list",
    ] as const,

  detail: (
    ruleId: number,
  ) =>
    [
      ...todoRuleQueryKeys.all,
      "detail",
      ruleId,
    ] as const,
}

export const todoRulesQueryOptions =
  queryOptions({
    queryKey:
      todoRuleQueryKeys.list(),

    queryFn: ({ signal }) =>
      listTodoRules(signal),
  })

export function todoRuleQueryOptions(
  ruleId: number,
) {
  return queryOptions({
    queryKey:
      todoRuleQueryKeys.detail(
        ruleId,
      ),

    queryFn: ({ signal }) =>
      getTodoRule(
        ruleId,
        signal,
      ),
  })
}

export function createTodoRuleMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationFn:
      createTodoRule,

    onSuccess: async () => {
      await queryClient
        .invalidateQueries({
          queryKey:
            todoRuleQueryKeys
              .list(),
        })
    },
  })
}

interface UpdateTodoRuleVariables {
  ruleId: number
  input: TodoRuleWriteInput
}

export function updateTodoRuleMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationFn: ({
      ruleId,
      input,
    }: UpdateTodoRuleVariables) =>
      updateTodoRule(
        ruleId,
        input,
      ),

    onSuccess: async (
      todoRule,
      {
        ruleId,
        input,
      },
    ) => {
      queryClient
        .setQueryData<
          TodoRuleDetail
        >(
          todoRuleQueryKeys
            .detail(ruleId),

          (current) =>
            current
              ? {
                  ...current,
                  ...todoRule,

                  content_schema:
                    input
                      .content_schema,

                  ui_schema:
                    input.ui_schema,

                  list_columns:
                    input
                      .list_columns,
                }
              : current,
        )

      await Promise.all([
        queryClient
          .invalidateQueries({
            queryKey:
              todoRuleQueryKeys
                .list(),
          }),

        queryClient
          .invalidateQueries({
            queryKey:
              todoQueryKeys.all,
          }),
      ])
    },
  })
}

export function deleteTodoRuleMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationFn: (
      ruleId: number,
    ) =>
      deleteTodoRule(
        ruleId,
      ),

    onSuccess: async (
      _data,
      ruleId,
    ) => {
      queryClient.removeQueries({
        queryKey:
          todoRuleQueryKeys
            .detail(ruleId),

        exact: true,
      })

      await queryClient
        .invalidateQueries({
          queryKey:
            todoRuleQueryKeys
              .list(),
        })
    },
  })
}
