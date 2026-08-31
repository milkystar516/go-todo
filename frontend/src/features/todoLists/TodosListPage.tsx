import {
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

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
  listTodosQueryOptions,
  ownerTodosQueryOptions,
} from "../todos/queries";

function TodosPage() {
  const { t } = useTranslation();
  const { listId } = useParams<{ listId: string }>();
  const listAccess = useOptionalListAccess();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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

  const todosQuery = listId ? listTodosQuery : ownerTodosQuery;
  const todos = todosQuery.data ?? [];
  const ruleIds = useMemo(
    () => [...new Set(todos.map((todo) => todo.rule_id))],
    [todos],
  );
  const ruleQueryState = useQueries({
    queries: ruleIds.map((ruleId) => todoRuleQueryOptions(ruleId)),
    combine: (queries) => ({
      rulesById: new Map(
        queries.flatMap((query) =>
          query.data
            ? [[query.data.id, query.data] as const]
            : [],
        ),
      ),
      isPending: queries.some((query) => query.isPending),
      error:
        queries.find((query) => query.isError)?.error ?? null,
    }),
  });

  const activeTodos = todos.filter((todo) => todo.completed_at === null);
  const completedTodos = todos.filter((todo) => todo.completed_at !== null);
  const fallbackError = t("common.requestFailed");

  function canManage(todo: Todo) {
    return (
      todo.owner_id === currentUserQuery.data?.id ||
      Boolean(listId && listAccess?.membership.role === "owner")
    );
  }

  if (
    currentUserQuery.isError ||
    todosQuery.isError ||
    listQuery.isError ||
    ruleQueryState.error
  ) {
    const error =
      currentUserQuery.error ??
      todosQuery.error ??
      listQuery.error ??
      ruleQueryState.error;

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
    ruleQueryState.isPending;

  return (
    <AppPage>
      <PageHeader
        title={listQuery.data?.name ?? t("todos.mine")}
        description={t("todos.count", { count: todos.length })}
      />

      {listId && listQuery.data && (
        <TodoQuickAdd
          key={listQuery.data.id}
          open={quickAddOpen}
          listId={listId}
          defaultRuleId={listQuery.data.default_rule_id}
          rules={availableRulesQuery.data ?? []}
          onOpenChange={setQuickAddOpen}
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
        rulesById={ruleQueryState.rulesById}
        isLoading={isLoading}
        onAdd={listId ? () => setQuickAddOpen(true) : undefined}
        canManage={canManage}
      />
    </AppPage>
  );
}

export { TodosPage as Component }
