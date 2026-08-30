import {
  useMutation,
  useMutationState,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import type { TodoUpdateInput } from "../../api/todos";
import type { Todo } from "../../api/types";
import { AppPage } from "../../app/components/AppPage";
import { PageHeader } from "../../app/components/PageHeader";
import { getErrorMessage } from "../../lib/apiError";
import { currentUserQueryOptions } from "../auth/queries";
import { useOptionalListAccess } from "../guards/ListAccessGuards";
import { todoListQueryOptions } from "./queries";
import {
  todoRuleQueryOptions,
  todoRulesQueryOptions,
} from "../todoRules/queries";
import { TodoList } from "../todos/components/TodoList";
import { TodoQuickAdd } from "../todos/components/TodoQuickAdd";
import {
  createTodoMutationOptions,
  deleteTodoMutationOptions,
  listTodosQueryOptions,
  ownerTodosQueryOptions,
  todoMutationKeys,
  toggleTodoMutationOptions,
  updateTodoMutationOptions,
} from "../todos/queries";

interface TodoMutationState {
  todoId: number;
  action: "update" | "toggle" | "delete";
  status: "idle" | "pending" | "success" | "error";
  error: unknown;
  submittedAt: number;
}

function latestTodoMutation(
  states: TodoMutationState[],
  todoId: number,
) {
  return states.reduce<TodoMutationState | undefined>(
    (latest, state) =>
      state.todoId === todoId &&
      (!latest || state.submittedAt >= latest.submittedAt)
        ? state
        : latest,
    undefined,
  );
}

function TodosPage() {
  const { t } = useTranslation();
  const { listId } = useParams<{ listId: string }>();
  const listAccess = useOptionalListAccess();
  const queryClient = useQueryClient();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);

  const currentUserQuery = useQuery(currentUserQueryOptions);
  const listQuery = useQuery({
    ...todoListQueryOptions(listId ?? ""),
    enabled: Boolean(listId),
  });
  const ownerTodosQuery = useQuery({
    ...ownerTodosQueryOptions(currentUserQuery.data?.id ?? 0),
    enabled: !listId && Boolean(currentUserQuery.data),
  });
  const listTodosQuery = useQuery({
    ...listTodosQueryOptions(listId ?? ""),
    enabled: Boolean(listId),
  });
  const availableRulesQuery = useQuery({
    ...todoRulesQueryOptions,
    enabled: Boolean(listId),
  });
  const selectedRuleQuery = useQuery({
    ...todoRuleQueryOptions(selectedRuleId ?? 0),
    enabled: Boolean(listId && selectedRuleId),
  });

  const todosQuery = listId ? listTodosQuery : ownerTodosQuery;
  const todos = todosQuery.data ?? [];
  const ruleIds = useMemo(
    () => [...new Set(todos.map((todo) => todo.rule_id))],
    [todos],
  );
  const ruleQueries = useQueries({
    queries: ruleIds.map((ruleId) => todoRuleQueryOptions(ruleId)),
  });
  const rulesById = new Map(
    ruleQueries.flatMap((query) =>
      query.data ? [[query.data.id, query.data] as const] : [],
    ),
  );

  const createMutation = useMutation(createTodoMutationOptions(queryClient));
  const updateMutation = useMutation(updateTodoMutationOptions(queryClient));
  const toggleMutation = useMutation(toggleTodoMutationOptions(queryClient));
  const deleteMutation = useMutation(deleteTodoMutationOptions(queryClient));
  const todoMutationStates = useMutationState<TodoMutationState>({
    filters: {
      mutationKey: todoMutationKeys.items,
    },
    select: (mutation) => {
      const mutationKey = mutation.options.mutationKey ?? [];

      return {
        todoId: (
          mutation.state.variables as { todoId: number }
        ).todoId,
        action: mutationKey.at(-1) as TodoMutationState["action"],
        status: mutation.state.status,
        error: mutation.state.error,
        submittedAt: mutation.state.submittedAt,
      };
    },
  });

  useEffect(() => {
    setSelectedRuleId(listQuery.data?.default_rule_id ?? null);
    setQuickAddOpen(false);
  }, [listQuery.data?.id, listQuery.data?.default_rule_id]);

  const activeTodos = todos.filter((todo) => todo.completed_at === null);
  const completedTodos = todos.filter((todo) => todo.completed_at !== null);
  const fallbackError = t("common.requestFailed");

  function canManage(todo: Todo) {
    return (
      todo.owner_id === currentUserQuery.data?.id ||
      Boolean(listId && listAccess?.membership.role === "owner")
    );
  }

  function isTodoPending(todoId: number) {
    return (
      latestTodoMutation(todoMutationStates, todoId)?.status ===
      "pending"
    );
  }

  function getTodoError(todoId: number) {
    const failedState = latestTodoMutation(
      todoMutationStates,
      todoId,
    );

    if (failedState?.status === "error") {
      return getErrorMessage(failedState.error, fallbackError);
    }

    return null;
  }

  function getTodoDeleteError(todoId: number) {
    const latestState = latestTodoMutation(
      todoMutationStates,
      todoId,
    );

    if (
      latestState?.action === "delete" &&
      latestState.status === "error"
    ) {
      return getErrorMessage(latestState.error, fallbackError);
    }

    return null;
  }

  async function handleCreate(input: TodoUpdateInput) {
    if (!listId || selectedRuleId === null) {
      return;
    }

    await createMutation.mutateAsync({
      ...input,
      list_id: listId,
      rule_id: selectedRuleId,
    });
  }

  async function handleUpdate(todoId: number, input: TodoUpdateInput) {
    await updateMutation.mutateAsync({ todoId, input });
  }

  async function handleDelete(todoId: number) {
    await deleteMutation.mutateAsync({ todoId });
  }

  if (currentUserQuery.isError || todosQuery.isError || listQuery.isError) {
    const error =
      currentUserQuery.error ?? todosQuery.error ?? listQuery.error;

    return (
      <AppPage>
        <p className="text-sm text-destructive" role="alert">
          {getErrorMessage(error, fallbackError)}
        </p>
      </AppPage>
    );
  }

  const isLoading =
    currentUserQuery.isPending ||
    todosQuery.isPending ||
    (Boolean(listId) && listQuery.isPending) ||
    ruleQueries.some((query) => query.isPending);

  return (
    <AppPage>
      <PageHeader
        title={listQuery.data?.name ?? t("todos.mine")}
        description={t("todos.count", { count: todos.length })}
      />

      {listId && (
        <TodoQuickAdd
          open={quickAddOpen}
          rules={availableRulesQuery.data ?? []}
          selectedRuleId={selectedRuleId}
          selectedRule={selectedRuleQuery.data}
          isRulePending={selectedRuleQuery.isPending}
          ruleErrorMessage={
            selectedRuleQuery.isError
              ? getErrorMessage(selectedRuleQuery.error, fallbackError)
              : null
          }
          isPending={createMutation.isPending}
          errorMessage={
            createMutation.isError
              ? getErrorMessage(createMutation.error, fallbackError)
              : null
          }
          onRuleChange={setSelectedRuleId}
          onOpenChange={setQuickAddOpen}
          onCreate={handleCreate}
        />
      )}

      {availableRulesQuery.isError && listId && (
        <p className="text-sm text-destructive" role="alert">
          {getErrorMessage(availableRulesQuery.error, fallbackError)}
        </p>
      )}

      <TodoList
        activeTodos={activeTodos}
        completedTodos={completedTodos}
        rulesById={rulesById}
        isLoading={isLoading}
        onAdd={listId ? () => setQuickAddOpen(true) : undefined}
        canManage={canManage}
        isTodoPending={isTodoPending}
        getTodoError={getTodoError}
        getTodoDeleteError={getTodoDeleteError}
        onToggleCompleted={(todoId) =>
          toggleMutation.mutate({ todoId })
        }
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </AppPage>
  );
}

export { TodosPage as Component }
