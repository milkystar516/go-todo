import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import type { TodoRule as TodoRuleData } from "../../../api/types"
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
import { TodoRule } from "./TodoRule"
import { TodoRuleEmpty } from "./TodoRuleEmpty"

export interface TodoRuleTableColumn {
  id: string
  header: string
  cell: (
    rule: TodoRuleData,
    onSelect: () => void,
  ) => ReactNode
}

interface TodoRuleTableProps {
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

export function TodoRuleTable({
  selectedRuleId,
  onSelectRule,
}: TodoRuleTableProps) {
  const { t, i18n } = useTranslation()

  const todoRulesQuery =
    useQuery(todoRulesQueryOptions)

  const updatedAtFormatter = new Intl.DateTimeFormat(
    i18n.language,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  )

  const columns: TodoRuleTableColumn[] = [
    {
      id: "name",
      header: t("admin.todoRules.name"),
      cell: (rule, onSelect) => (
        <button
          type="button"
          className="rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t(
            "admin.todoRules.detail.open",
            {
              name: rule.rule_name,
            },
          )}
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
        >
          {rule.rule_name}
        </button>
      ),
    },
    {
      id: "updated-at",
      header: t("admin.todoRules.updatedAt"),
      cell: (rule) =>
        updatedAtFormatter.format(
          new Date(rule.updated_at),
        ),
    },
    {
      id: "updated-by",
      header: t("admin.todoRules.updatedBy"),
      cell: (rule) =>
        rule.updated_by
          ? rule.updated_by.nickname ??
            rule.updated_by.username
          : "—",
    },
  ]

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
        <TodoRuleTableSkeleton
          columns={columns}
        />
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
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {todoRulesQuery.data.map((rule) => (
                <TodoRule
                  key={rule.id}
                  rule={rule}
                  columns={columns}
                  selected={
                    rule.id === selectedRuleId
                  }
                  onSelect={() =>
                    onSelectRule(rule.id)
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

interface TodoRuleTableSkeletonProps {
  columns: TodoRuleTableColumn[]
}

function TodoRuleTableSkeleton({
  columns,
}: TodoRuleTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: 3 }).map(
            (_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  )
}