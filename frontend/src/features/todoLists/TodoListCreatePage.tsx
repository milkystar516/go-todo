import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { Button } from "#components/ui/button"
import { usersQueryOptions } from "../auth/queries"
import { todoRulesQueryOptions } from "../todoRules/queries"
import {
  TodoListForm,
  type TodoListFormValue,
} from "./components/TodoListForm"
import { createTodoListMutationOptions } from "./queries"

function TodoListCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const usersQuery = useQuery(usersQueryOptions)
  const rulesQuery = useQuery(todoRulesQueryOptions)

  const createMutation = useMutation(
    createTodoListMutationOptions(queryClient),
  )

  function returnToLists() {
    navigate("/")
  }

  function handleCreate(
    value: TodoListFormValue,
  ) {
    createMutation.mutate(
      {
        name: value.name,
        member_ids: value.memberIds,
        default_rule_id: value.defaultRuleId,
      },
      {
        onSuccess: (list) => {
          navigate(`/lists/${list.id}`, {
            replace: true,
          })
        },
      },
    )
  }

  const optionsError =
    usersQuery.isError || rulesQuery.isError

  return (
    <AppPage>
      <PageHeader
        leading={
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-3"
          >
            <Link to="/">
              <ArrowLeft />
              {t("todoLists.create.back")}
            </Link>
          </Button>
        }
        title={t("todoLists.create.title")}
        description={t(
          "todoLists.create.description",
        )}
      />

      {optionsError ? (
        <p
          className="text-sm text-destructive"
          role="alert"
        >
          {getErrorMessage(
            usersQuery.error ?? rulesQuery.error,
            t("common.requestFailed"),
          )}
        </p>
      ) : usersQuery.isPending ||
        rulesQuery.isPending ? (
        <TodoListCreateFormSkeleton />
      ) : (
        <TodoListForm
          users={usersQuery.data}
          rules={rulesQuery.data}
          isPending={createMutation.isPending}
          errorMessage={
            createMutation.isError
              ? getErrorMessage(
                  createMutation.error,
                  t("common.requestFailed"),
                )
              : null
          }
          onSubmit={handleCreate}
          onCancel={returnToLists}
        />
      )}
    </AppPage>
  )
}

function TodoListCreateFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-16 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-md bg-muted" />
      <div className="h-16 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

export { TodoListCreatePage as Component }