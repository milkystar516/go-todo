import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"

import { isApiErrorOfType } from "../../api/client"
import { PROBLEM_TYPE, type TodoRuleDetail } from "../../api/types"
import { AppPage } from "../../app/components/AppPage"
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

export function TodoRuleDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { ruleId: ruleIdParam } = useParams()
  const ruleId = Number(ruleIdParam)
  const hasValidRuleId = Number.isSafeInteger(ruleId) && ruleId > 0
  const todoRuleQuery = useQuery({
    ...todoRuleQueryOptions(ruleId),
    enabled: hasValidRuleId,
  })

  function returnToAdmin() {
    navigate("/admin")
  }

  if (!hasValidRuleId) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToAdmin} />}
          title={t("admin.todoRules.detail.invalidTitle")}
          description={t("admin.todoRules.detail.invalidDescription")}
        />
      </AppPage>
    )
  }

  if (todoRuleQuery.isPending) {
    return <TodoRuleDetailSkeleton onBack={returnToAdmin} />
  }

  if (todoRuleQuery.isError) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToAdmin} />}
          title={t("admin.todoRules.detail.loadFailed")}
          description={getErrorMessage(
            todoRuleQuery.error,
            t("common.requestFailed"),
          )}
        />
      </AppPage>
    )
  }

  return (
    <TodoRuleDetailContent
      rule={todoRuleQuery.data}
      onBack={returnToAdmin}
    />
  )
}

interface TodoRuleDetailContentProps {
  rule: TodoRuleDetail
  onBack: () => void
}

function TodoRuleDetailContent({
  rule,
  onBack,
}: TodoRuleDetailContentProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useMutation(
    deleteTodoRuleMutationOptions(queryClient),
  )

  function openEditPage() {
    navigate(`/admin/todo-rules/${rule.id}/edit`)
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(rule.id)
    navigate("/admin", { replace: true })
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
    <AppPage
      size="wide"
      data-todo-rule-transition-fallback={
        typeof document.startViewTransition === "function"
          ? undefined
          : "page"
      }
      style={{ viewTransitionName: "todo-rule-detail" }}
    >
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={rule.rule_name}
        description={t("admin.todoRules.detail.description")}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={openEditPage}
              disabled={deleteMutation.isPending}
            >
              <Pencil />
              {t("common.edit")}
            </Button>
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
    </AppPage>
  )
}

interface BackButtonProps {
  onClick: () => void
}

function BackButton({ onClick }: BackButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={onClick}
    >
      <ArrowLeft />
      {t("admin.todoRules.detail.back")}
    </Button>
  )
}

function TodoRuleDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <AppPage size="wide">
      <PageHeader
        leading={<BackButton onClick={onBack} />}
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
    </AppPage>
  )
}
