import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { getErrorMessage } from "../../../lib/apiError"
import { useIsMobile } from "#hooks/use-mobile"
import { TodoRuleDetailPanel } from "../../todoRules/components/TodoRuleDetailPanel"
import { todoRulesQueryOptions } from "../../todoRules/queries"

import { Button } from "#components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#components/ui/resizable"
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
  const isMobile = useIsMobile()
  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)
  const todoRulesQuery = useQuery(todoRulesQueryOptions)

  function openCreatePage() {
    navigate("/admin/todo-rules/new")
  }

  function openDetailPage(ruleId: number) {
    navigate(`/admin/todo-rules/${ruleId}`)
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
      ) : selectedRuleId === null ? (
        <div className="overflow-hidden rounded-lg border">
          <TodoRulesTable
            rules={todoRulesQuery.data}
            selectedRuleId={selectedRuleId}
            onSelect={setSelectedRuleId}
          />
        </div>
      ) : (
        <ResizablePanelGroup
          orientation={isMobile ? "vertical" : "horizontal"}
          className="min-h-[36rem] overflow-hidden rounded-lg border"
        >
          <ResizablePanel
            id="todo-rules-list"
            defaultSize={isMobile ? "45" : "58"}
            minSize={isMobile ? "25" : "35"}
          >
            <div className="h-full overflow-auto">
              <TodoRulesTable
                rules={todoRulesQuery.data}
                selectedRuleId={selectedRuleId}
                onSelect={setSelectedRuleId}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="todo-rule-detail"
            defaultSize={isMobile ? "55" : "42"}
            minSize={isMobile ? "35" : "30"}
            maxSize={isMobile ? "75" : "65"}
          >
            <TodoRuleDetailPanel
              ruleId={selectedRuleId}
              onExpand={() => openDetailPage(selectedRuleId)}
              onClose={() => setSelectedRuleId(null)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </section>
  )
}

interface TodoRulesTableProps {
  rules: Array<{ id: number; rule_name: string }>
  selectedRuleId: number | null
  onSelect: (ruleId: number) => void
}

function TodoRulesTable({
  rules,
  selectedRuleId,
  onSelect,
}: TodoRulesTableProps) {
  const { t } = useTranslation()

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>{t("admin.todoRules.name")}</TableHead>
          <TableHead>{t("admin.todoRules.id")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rules.map((todoRule) => (
          <TableRow
            key={todoRule.id}
            className="cursor-pointer"
            data-state={
              selectedRuleId === todoRule.id ? "selected" : undefined
            }
            onClick={() => onSelect(todoRule.id)}
          >
            <TableCell>
              <button
                type="button"
                className="rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("admin.todoRules.detail.open", {
                  name: todoRule.rule_name,
                })}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(todoRule.id)
                }}
              >
                {todoRule.rule_name}
              </button>
            </TableCell>

            <TableCell>{todoRule.id}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
