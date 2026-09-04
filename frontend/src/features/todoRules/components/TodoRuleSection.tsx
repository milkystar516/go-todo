import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { getErrorMessage } from "../../../lib/apiError"
import { Button } from "#components/ui/button"

import { todoRulesQueryOptions } from "../queries"
import { TodoRuleEmpty } from "./TodoRuleEmpty"
import {
  TodoRuleTable,
  TodoRuleTableSkeleton,
} from "./TodoRuleTable"

interface TodoRuleSectionProps {
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

export function TodoRuleSection({
  selectedRuleId,
  onSelectRule,
}: TodoRuleSectionProps) {
  const { t } = useTranslation()

  const todoRulesQuery =
    useQuery(todoRulesQueryOptions)

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">
            {t("admin.todoRules.title")}
          </h2>

          <p className="text-sm text-muted-foreground">
            {t("admin.todoRules.description")}
          </p>
        </div>

        {todoRulesQuery.isSuccess &&
          todoRulesQuery.data.length > 0 && (
            <Button asChild>
              <Link to="/admin/todo-rules/new">
                <Plus />

                {t(
                  "admin.todoRules.create.action",
                )}
              </Link>
            </Button>
          )}
      </div>

      {todoRulesQuery.isPending ? (
        <TodoRuleTableSkeleton />
      ) : todoRulesQuery.isError ? (
        <p
          className="text-sm text-destructive"
          role="alert"
        >
          {getErrorMessage(
            todoRulesQuery.error,
            t("common.requestFailed"),
          )}
        </p>
      ) : todoRulesQuery.data.length === 0 ? (
        <TodoRuleEmpty />
      ) : (
        <TodoRuleTable
          rules={todoRulesQuery.data}
          selectedRuleId={selectedRuleId}
          onSelectRule={onSelectRule}
        />
      )}
    </section>
  )
}