import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TodoUpdateInput } from "../../../api/todos";
import type { TodoRule } from "../../../api/types";
import { getErrorMessage } from "../../../lib/apiError";
import { Button } from "#components/ui/button";
import { Skeleton } from "#components/ui/skeleton";
import { todoRuleQueryOptions } from "../../todoRules/queries";
import { createTodoMutationOptions } from "../queries";
import { TodoForm } from "./TodoForm";

type TodoQuickAddProps = {
  open: boolean;
  listId: string;
  defaultRuleId: number | null;
  rules: TodoRule[];
  onOpenChange: (open: boolean) => void;
};

export function TodoQuickAdd({
  open,
  listId,
  defaultRuleId,
  rules,
  onOpenChange,
}: TodoQuickAddProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedRuleId, setSelectedRuleId] = useState(defaultRuleId);
  const selectedRuleQuery = useQuery({
    ...todoRuleQueryOptions(selectedRuleId ?? 0),
    enabled: selectedRuleId !== null,
  });
  const createMutation = useMutation(createTodoMutationOptions(queryClient));
  const fallbackError = t("common.requestFailed");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedRuleId(defaultRuleId);
      createMutation.reset();
    }

    onOpenChange(nextOpen);
  }

  async function handleCreate(input: TodoUpdateInput) {
    if (selectedRuleId === null) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...input,
        list_id: listId,
        rule_id: selectedRuleId,
      });
      onOpenChange(false);
    } catch {
    }
  }

  if (open) {
    return (
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-medium">
          {t("todos.form.rule")}
          <select
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={selectedRuleId ?? ""}
            onChange={(event) => {
              createMutation.reset();
              setSelectedRuleId(Number(event.target.value));
            }}
            disabled={createMutation.isPending || rules.length === 0}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.rule_name}
              </option>
            ))}
          </select>
        </label>

        {selectedRuleQuery.isPending && <Skeleton className="h-48 w-full" />}

        {selectedRuleQuery.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getErrorMessage(selectedRuleQuery.error, fallbackError)}
          </p>
        )}

        {selectedRuleQuery.isSuccess && (
          <TodoForm
            key={selectedRuleQuery.data.id}
            rule={selectedRuleQuery.data}
            isPending={createMutation.isPending}
            errorMessage={
              createMutation.isError
                ? getErrorMessage(createMutation.error, fallbackError)
                : null
            }
            submitLabel={t("todos.form.create")}
            onSubmit={handleCreate}
            onCancel={() => handleOpenChange(false)}
          />
        )}
      </section>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-12 w-full justify-start gap-3 rounded-lg bg-background px-4 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
      onClick={() => handleOpenChange(true)}
      disabled={rules.length === 0 || defaultRuleId === null}
    >
      <Plus className="size-5" />
      <span>{t("todos.add")}</span>
    </Button>
  );
}
