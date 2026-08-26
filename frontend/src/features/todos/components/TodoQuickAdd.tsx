import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { TodoUpdateInput } from "../../../api/todos";
import type { TodoRule, TodoRuleDetail } from "../../../api/types";
import { Button } from "#components/ui/button";
import { Skeleton } from "#components/ui/skeleton";
import { TodoForm } from "./TodoForm";

type TodoQuickAddProps = {
  open: boolean;
  rules: TodoRule[];
  selectedRuleId: number | null;
  selectedRule?: TodoRuleDetail;
  isRulePending?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  onRuleChange: (ruleId: number) => void;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: TodoUpdateInput) => Promise<void>;
};

export function TodoQuickAdd({
  open,
  rules,
  selectedRuleId,
  selectedRule,
  isRulePending = false,
  isPending = false,
  errorMessage,
  onRuleChange,
  onOpenChange,
  onCreate,
}: TodoQuickAddProps) {
  const { t } = useTranslation();

  async function handleCreate(input: TodoUpdateInput) {
    try {
      await onCreate(input);
      onOpenChange(false);
    } catch {
      // The mutation error remains visible in the open form.
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
            onChange={(event) => onRuleChange(Number(event.target.value))}
            disabled={isPending || rules.length === 0}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.rule_name}
              </option>
            ))}
          </select>
        </label>

        {isRulePending && <Skeleton className="h-48 w-full" />}

        {!isRulePending && selectedRule && (
          <TodoForm
            key={selectedRule.id}
            rule={selectedRule}
            isPending={isPending}
            errorMessage={errorMessage}
            submitLabel={t("todos.form.create")}
            onSubmit={handleCreate}
            onCancel={() => onOpenChange(false)}
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
      onClick={() => onOpenChange(true)}
      disabled={rules.length === 0 || selectedRuleId === null}
    >
      <Plus className="size-5" />
      <span>{t("todos.add")}</span>
    </Button>
  );
}
