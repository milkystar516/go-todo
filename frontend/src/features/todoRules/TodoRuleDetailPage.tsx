import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"

import { isApiErrorOfType } from "../../api/client"
import { PROBLEM_TYPE, type TodoRuleDetail } from "../../api/types"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { ConfirmActionDialog } from "#components/common/ConfirmActionDialog"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "#components/ui/card"
import { Skeleton } from "#components/ui/skeleton"
import { TodoRulePreview } from "./components/TodoRulePreview"
import { TodoRuleSummaryFields } from "./components/TodoRuleSummaryFields"
import {
  deleteTodoRuleMutationOptions,
  todoRuleQueryOptions,
} from "./queries"

function TodoRuleDetailPage({
  ruleId,
  onDeleted,
}: {
  ruleId: number
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const todoRuleQuery = useQuery(todoRuleQueryOptions(ruleId))

  if (todoRuleQuery.isPending) {
    return <TodoRuleDetailSkeleton />
  }

  if (todoRuleQuery.isError) {
    return (
      <PageHeader
        leading={<BackButton />}
        title={t("admin.todoRules.detail.loadFailed")}
        description={getErrorMessage(
          todoRuleQuery.error,
          t("common.requestFailed"),
        )}
      />
    )
  }

  return (
    <TodoRuleDetailContent
      rule={todoRuleQuery.data}
      onDeleted={onDeleted}
    />
  )
}

export { TodoRuleDetailPage }

function TodoRuleDetailContent({
  rule,
  onDeleted,
}: {
  rule: TodoRuleDetail
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useMutation(
    deleteTodoRuleMutationOptions(queryClient),
  )

  function handleDelete() {
    deleteMutation.mutate(rule.id, {
      onSuccess: () => {
        onDeleted()
        navigate("/admin/todo-rules", { replace: true })
      },
    })
  }

  const deleteErrorMessage = deleteMutation.isError
    ? isApiErrorOfType(
        deleteMutation.error,
        PROBLEM_TYPE.DEFAULT_RULE_PROTECTED,
      )
      ? t("admin.todoRules.delete.defaultProtected")
      : isApiErrorOfType(
            deleteMutation.error,
            PROBLEM_TYPE.RULE_IN_USE,
          )
        ? t("admin.todoRules.delete.ruleInUse")
        : getErrorMessage(
            deleteMutation.error,
            t("common.requestFailed"),
          )
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        leading={<BackButton />}
        title={rule.rule_name}
        description={t("admin.todoRules.detail.description")}
        actions={
          <>
            {deleteMutation.isPending ? (
              <Button type="button" variant="outline" disabled>
                <Pencil />
                {t("common.edit")}
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to={`/admin/todo-rules/${rule.id}/edit`}>
                  <Pencil />
                  {t("common.edit")}
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 />
              {t("common.delete")}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <TodoRuleSummaryFields rule={rule} />

        <TodoRulePreview rule={rule} />
      </div>

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("admin.todoRules.delete.title")}
        description={t("admin.todoRules.delete.description", {
          name: rule.rule_name,
        })}
        confirmLabel={t("common.delete")}
        isPending={deleteMutation.isPending}
        errorMessage={deleteErrorMessage}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function BackButton() {
  const { t } = useTranslation()

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="-ml-3"
    >
      <Link to="/admin/todo-rules">
        <ArrowLeft />
        {t("admin.todoRules.detail.back")}
      </Link>
    </Button>
  )
}

function TodoRuleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        leading={<BackButton />}
        title={<Skeleton className="h-8 w-48" />}
        description={<Skeleton className="h-4 w-72" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <Skeleton key={itemIndex} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}