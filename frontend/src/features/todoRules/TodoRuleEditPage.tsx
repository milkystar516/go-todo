import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import type { TodoRuleWriteInput } from "../../api/todoRules"
import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { Button } from "#components/ui/button"
import { TodoRuleForm } from "./components/TodoRuleForm"
import { createTodoRuleMutationOptions } from "./queries"

export function TodoRuleCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useMutation(
    createTodoRuleMutationOptions(queryClient),
  )

  function returnToAdmin() {
    navigate("/admin")
  }

  async function handleUpdate(input: TodoRuleWriteInput) {
    const todoRule = await createMutation.mutateAsync(input)
    navigate(`/admin/todo-rules/${todoRule.id}`, { replace: true })
  }

  return (
    <AppPage size="wide">
      <PageHeader
        leading={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={returnToAdmin}
          >
            <ArrowLeft />
            {t("admin.todoRules.edit.back")}
          </Button>
        }
        title={t("admin.todoRules.edit.title")}
        description={t(
          "admin.todoRules.edit.description",
        )}
      />

      <TodoRuleForm
        isPending={createMutation.isPending}
        errorMessage={
          createMutation.isError
            ? getErrorMessage(
                createMutation.error,
                t("common.requestFailed"),
              )
            : null
        }
        submitLabel={t("admin.todoRules.edit.submit")}
        onSubmit={handleUpdate}
        onCancel={returnToAdmin}
      />
    </AppPage>
  )
}
