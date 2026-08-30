import { useQuery } from "@tanstack/react-query"
import { Maximize2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getErrorMessage } from "../../../lib/apiError"
import { Button } from "#components/ui/button"
import { Skeleton } from "#components/ui/skeleton"
import { TodoRuleSummaryFields } from "./TodoRuleSummaryFields"
import { todoRuleQueryOptions } from "../queries"

interface TodoRuleDetailPanelProps {
  ruleId: number
  onExpand: () => void
  onClose: () => void
}

export function TodoRuleDetailPanel({
  ruleId,
  onExpand,
  onClose,
}: TodoRuleDetailPanelProps) {
  const { t } = useTranslation()
  const todoRuleQuery = useQuery(todoRuleQueryOptions(ruleId))
  const headingId = `todo-rule-panel-title-${ruleId}`

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-background [view-transition-name:todo-rule-detail]"
      aria-labelledby={headingId}
      data-todo-rule-transition-fallback={
        typeof document.startViewTransition === "function"
          ? undefined
          : "panel"
      }
    >
      <header className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0 space-y-1">
          {todoRuleQuery.isPending ? (
            <>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-52" />
            </>
          ) : (
            <>
              <h2
                id={headingId}
                className="truncate text-lg font-semibold"
              >
                {todoRuleQuery.isSuccess
                  ? todoRuleQuery.data.rule_name
                  : t("admin.todoRules.detail.loadFailed")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("admin.todoRules.detail.panelDescription")}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("admin.todoRules.detail.expand")}
            onClick={onExpand}
          >
            <Maximize2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("admin.todoRules.detail.closePanel")}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {todoRuleQuery.isPending && <TodoRulePanelSkeleton />}

        {todoRuleQuery.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getErrorMessage(
              todoRuleQuery.error,
              t("common.requestFailed"),
            )}
          </p>
        )}

        {todoRuleQuery.isSuccess && (
          <TodoRuleSummaryFields rule={todoRuleQuery.data} />
        )}
      </div>
    </aside>
  )
}

function TodoRulePanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}
