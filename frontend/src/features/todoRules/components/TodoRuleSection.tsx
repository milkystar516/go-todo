import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import type { TodoRule } from "../../../api/types"
import { getErrorMessage } from "../../../lib/apiError"

import { Button } from "#components/ui/button"
import { Skeleton } from "#components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import { todoRulesQueryOptions } from "../queries"
import { TodoRuleEmpty } from "./TodoRuleEmpty"

interface TodoRuleSectionProps {
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

export function TodoRuleSection({
  selectedRuleId,
  onSelectRule,
}: TodoRuleSectionProps) {
  const { t } = useTranslation()
  const todoRulesQuery = useQuery(todoRulesQueryOptions)

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
                {t("admin.todoRules.create.action")}
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
        <div className="overflow-hidden rounded-lg border">
          <TodoRuleTable
            rules={todoRulesQuery.data}
            selectedRuleId={selectedRuleId}
            onSelectRule={onSelectRule}
          />
        </div>
      )}
    </section>
  )
}

interface TodoRuleTableProps {
  rules: readonly TodoRule[]
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

function TodoRuleTable({
  rules,
  selectedRuleId,
  onSelectRule,
}: TodoRuleTableProps) {
  const { t } = useTranslation()

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>
            {t("admin.todoRules.name")}
          </TableHead>

          <TableHead>
            {t("admin.todoRules.id")}
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rules.map((todoRule) => {
          const isSelected =
            selectedRuleId === todoRule.id

          return (
            <TableRow
                key={todoRule.id}
                className="cursor-pointer"
                data-state={
                    isSelected ? "selected" : undefined
                }
                data-keep-rule-detail-open
                onClick={() => onSelectRule(todoRule.id)}
            >
              <TableCell>
                <button
                  type="button"
                  className="rounded-xs text-left font-medium underline-offset-4 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t(
                    "admin.todoRules.detail.open",
                    {
                      name: todoRule.rule_name,
                    },
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectRule(todoRule.id)
                  }}
                >
                  {todoRule.rule_name}
                </button>
              </TableCell>

              <TableCell>
                {todoRule.id}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function TodoRuleTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>

            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: 3 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>

              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}