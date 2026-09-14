import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router"

import type { TodoRuleWriteInput } from "../../api/todoRules"
import type { TodoRuleDetail } from "../../api/types"
import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { Button } from "#components/ui/button"
import { Skeleton } from "#components/ui/skeleton"
import { TodoRuleForm } from "./components/TodoRuleForm"
import { createTodoRuleFormInitialValue } from "./lib/fieldDefinitions"
import {
  todoRuleQueryOptions,
  updateTodoRuleMutationOptions,
} from "./queries"

function TodoRuleEditPage() {
  const { t } = useTranslation()
  const { ruleId: ruleIdParam } = useParams()
  const ruleId = Number(ruleIdParam)
  const hasValidRuleId = Number.isSafeInteger(ruleId) && ruleId > 0
  const todoRuleQuery = useQuery({
    ...todoRuleQueryOptions(ruleId),
    enabled: hasValidRuleId,
  })

  if (!hasValidRuleId) {
    return (
      <AppPage>
        <PageHeader
          title={t("admin.todoRules.detail.invalidTitle")}
          description={t("admin.todoRules.detail.invalidDescription")}
        />
      </AppPage>
    )
  }

  if (todoRuleQuery.isPending) {
    return (
      <AppPage size="wide">
        <PageHeader
          leading={<BackButton to={`/admin/todo-rules/${ruleId}`} />}
          title={<Skeleton className="h-8 w-56" />}
          description={<Skeleton className="h-4 w-80" />}
        />
        <Skeleton className="h-96 w-full" />
      </AppPage>
    )
  }

  if (todoRuleQuery.isError) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton to={`/admin/todo-rules/${ruleId}`} />}
          title={t("admin.todoRules.detail.loadFailed")}
          description={getErrorMessage(
            todoRuleQuery.error,
            t("common.requestFailed"),
          )}
        />
      </AppPage>
    )
  }

  return <TodoRuleEditContent rule={todoRuleQuery.data} />
}

function TodoRuleEditContent({ rule }: { rule: TodoRuleDetail }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const initialValue = useMemo(
    () => createTodoRuleFormInitialValue(rule),
    [rule],
  )
  const updateMutation = useMutation(
    updateTodoRuleMutationOptions(queryClient),
  )

  function returnToDetail() {
    navigate(`/admin/todo-rules/${rule.id}`)
  }

  function handleUpdate(input: TodoRuleWriteInput) {
    updateMutation.mutate(
      {
        ruleId: rule.id,
        input: {
          ...input,
          list_columns: rule.list_columns,
        },
      },
      {
        onSuccess: () => {
          navigate(`/admin/todo-rules/${rule.id}`, { replace: true })
        },
      },
    )
  }

  if (!initialValue) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton to={`/admin/todo-rules/${rule.id}`} />}
          title={t("admin.todoRules.edit.unsupportedTitle")}
          description={t("admin.todoRules.edit.unsupportedDescription")}
        />
      </AppPage>
    )
  }

  return (
    <AppPage size="wide">
      <PageHeader
        leading={<BackButton to={`/admin/todo-rules/${rule.id}`} />}
        title={t("admin.todoRules.edit.title")}
        description={t(
          "admin.todoRules.edit.description",
        )}
      />

      <TodoRuleForm
        key={rule.id}
        initialValue={initialValue}
        isPending={updateMutation.isPending}
        errorMessage={
          updateMutation.isError
            ? getErrorMessage(
                updateMutation.error,
                t("common.requestFailed"),
              )
            : null
        }
        submitLabel={t("admin.todoRules.edit.submit")}
        onSubmit={handleUpdate}
        onCancel={returnToDetail}
      />
    </AppPage>
  )
}

export { TodoRuleEditPage as Component }

function BackButton({ to }: { to: string }) {
  const { t } = useTranslation()

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="-ml-3"
    >
      <Link to={to}>
        <ArrowLeft />
        {t("admin.todoRules.edit.back")}
      </Link>
    </Button>
  )
}
