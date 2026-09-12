import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import {
  useTranslation,
} from "react-i18next"

import type {
  TodoFieldsInput,
} from "../../../api/todos"
import type {
  TodoRule,
} from "../../../api/types"
import {
  getErrorMessage,
} from "../../../lib/apiError"
import {
  Button,
} from "#components/ui/button"
import {
  todoRuleQueryOptions,
} from "../../todoRules/queries"
import {
  createTodoMutationOptions,
} from "../queries"
import {
  TodoForm,
} from "./TodoForm"

interface TodoQuickAddProps {
  open: boolean
  listId: string
  defaultRuleId:
    | number
    | null
  rules: TodoRule[]
  onOpenChange: (
    open: boolean,
  ) => void
}

type TodoQuickAddEditorProps =
  Omit<
    TodoQuickAddProps,
    "open"
  >

function TodoQuickAddEditor({
  listId,
  defaultRuleId,
  rules,
  onOpenChange,
}: TodoQuickAddEditorProps) {
  const { t } =
    useTranslation()

  const queryClient =
    useQueryClient()

  const [
    selectedRuleId,
    setSelectedRuleId,
  ] = useState(
    defaultRuleId,
  )

  const selectedRuleQuery =
    useQuery({
      ...todoRuleQueryOptions(
        selectedRuleId ?? 0,
      ),

      enabled:
        selectedRuleId !== null,
    })

  const selectedRule =
    selectedRuleQuery.data
      ?.id === selectedRuleId
      ? selectedRuleQuery.data
      : null

  const createMutation =
    useMutation(
      createTodoMutationOptions(
        queryClient,
      ),
    )

  const fallbackError =
    t("common.requestFailed")

  function handleCreate(
    input: TodoFieldsInput,
  ) {
    if (
      selectedRuleId === null
    ) {
      return
    }

    createMutation.mutate(
      {
        ...input,
        list_id: listId,
        rule_id:
          selectedRuleId,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <label className="grid gap-2 text-sm font-medium">
        {t(
          "todos.form.rule",
        )}

        <select
          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          value={
            selectedRuleId ?? ""
          }
          onChange={(event) => {
            createMutation.reset()

            setSelectedRuleId(
              Number(
                event.target.value,
              ),
            )
          }}
          disabled={
            createMutation
              .isPending ||
            rules.length === 0
          }
        >
          {rules.map((rule) => (
            <option
              key={rule.id}
              value={rule.id}
            >
              {rule.rule_name}
            </option>
          ))}
        </select>
      </label>

      <TodoForm
        rule={selectedRule}
        isRulePending={
          selectedRuleId !==
            null &&
          selectedRule === null &&
          selectedRuleQuery
            .isPending
        }
        ruleErrorMessage={
          selectedRuleQuery
            .isError
            ? getErrorMessage(
                selectedRuleQuery
                  .error,
                fallbackError,
              )
            : null
        }
        isPending={
          createMutation
            .isPending
        }
        errorMessage={
          createMutation.isError
            ? getErrorMessage(
                createMutation
                  .error,
                fallbackError,
              )
            : null
        }
        submitLabel={t(
          "todos.form.create",
        )}
        onSubmit={handleCreate}
        onCancel={() =>
          onOpenChange(false)
        }
      />
    </section>
  )
}

export function TodoQuickAdd({
  open,
  listId,
  defaultRuleId,
  rules,
  onOpenChange,
}: TodoQuickAddProps) {
  const { t } =
    useTranslation()

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-12 w-full justify-start gap-3 rounded-lg bg-background px-4 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
        onClick={() =>
          onOpenChange(true)
        }
        disabled={
          rules.length === 0 ||
          defaultRuleId === null
        }
      >
        <Plus className="size-5" />

        <span>
          {t("todos.add")}
        </span>
      </Button>
    )
  }

  return (
    <TodoQuickAddEditor
      listId={listId}
      defaultRuleId={
        defaultRuleId
      }
      rules={rules}
      onOpenChange={
        onOpenChange
      }
    />
  )
}
