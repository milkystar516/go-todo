import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { getErrorMessage } from "../../../lib/apiError"
import { todoRulesQueryOptions } from "../../todoRules/queries"

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

import { TodoRulesEmpty } from "./TodoRulesEmpty"

export function TodoRulesSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const todoRulesQuery = useQuery(todoRulesQueryOptions)

  function openCreatePage() {
    navigate("/admin/todo-rules/new")
  }

  if (todoRulesQuery.isPending) {
    return <TodoRulesTableSkeleton />
  }

  if (todoRulesQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {getErrorMessage(
          todoRulesQuery.error,
          t("common.requestFailed"),
        )}
      </p>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">
            {t("admin.todoRules.title")}
          </h2>

          <p className="text-sm text-muted-foreground">
            {t("admin.todoRules.description")}
          </p>
        </div>

        {todoRulesQuery.data.length > 0 && (
          <Button type="button" onClick={openCreatePage}>
            <Plus />
            {t("admin.todoRules.create.action")}
          </Button>
        )}
      </div>

      {todoRulesQuery.data.length === 0 ? (
        <TodoRulesEmpty onCreate={openCreatePage} />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
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
              {todoRulesQuery.data.map((todoRule) => (
                <TableRow key={todoRule.id}>
                  <TableCell className="font-medium">
                    {todoRule.rule_name}
                  </TableCell>

                  <TableCell>{todoRule.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function TodoRulesTableSkeleton() {
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
          {Array.from({ length: 3 }).map((_, index) => (
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
