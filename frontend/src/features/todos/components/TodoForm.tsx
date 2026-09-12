import {
  useId,
  useRef,
  useState,
  type SubmitEvent,
} from "react"
import {
  useTranslation,
} from "react-i18next"

import type {
  TodoFieldsInput,
} from "../../../api/todos"
import type {
  Todo,
  TodoRuleSchema,
} from "../../../api/types"
import {
  Button,
} from "#components/ui/button"
import {
  FieldError,
} from "#components/ui/field"
import {
  Skeleton,
} from "#components/ui/skeleton"
import {
  TodoDetailsFields,
} from "./TodoDetailsFields"
import {
  TodoTitleField,
} from "./TodoTitleField"
import {
  TodoSchemaForm,
  type TodoSchemaFormHandle,
} from "./schema/TodoSchemaForm"

interface TodoFormProps {
  rule:
    | TodoRuleSchema
    | null
  todo?: Todo
  showTitleInput?: boolean
  isPending?: boolean
  isRulePending?: boolean
  ruleErrorMessage?:
    | string
    | null
  errorMessage?:
    | string
    | null
  submitLabel?: string
  onSubmit: (
    input: TodoFieldsInput,
  ) => void
  onCancel?: () => void
}

function toDateTimeLocal(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ""
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000,
  )

  return localDate
    .toISOString()
    .slice(0, 16)
}

export function TodoForm({
  rule,
  todo,
  showTitleInput = true,
  isPending = false,
  isRulePending = false,
  ruleErrorMessage,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoFormProps) {
  const { t } =
    useTranslation()

  const idPrefix =
    `todo-${useId().replaceAll(
      ":",
      "",
    )}`

  const schemaFormRef =
    useRef<
      TodoSchemaFormHandle
    >(null)

  const originalDueAt =
    toDateTimeLocal(
      todo?.due_at,
    )

  const [title, setTitle] =
    useState(
      todo?.title ?? "",
    )

  const [dueAt, setDueAt] =
    useState(originalDueAt)

  function handleSubmit(
    event:
      SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !rule ||
      isPending ||
      isRulePending ||
      ruleErrorMessage
    ) {
      return
    }

    const content =
      schemaFormRef.current
        ?.validateAndGetData()

    if (!content) {
      return
    }

    onSubmit({
      title,

      due_at:
        todo &&
        dueAt === originalDueAt
          ? todo.due_at
          : dueAt
            ? new Date(
                dueAt,
              ).toISOString()
            : null,

      content,
    })
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
    >
      {showTitleInput && (
        <TodoTitleField
          id={`${idPrefix}-title`}
          value={title}
          onChange={setTitle}
          disabled={isPending}
        />
      )}

      {isRulePending ? (
        <Skeleton className="h-48 w-full" />
      ) : ruleErrorMessage ? (
        <p
          className="text-sm text-destructive"
          role="alert"
        >
          {ruleErrorMessage}
        </p>
      ) : rule ? (
        <TodoSchemaForm
          key={rule.id}
          ref={schemaFormRef}
          idPrefix={`${idPrefix}-content`}
          rule={rule}
          initialContent={
            todo?.content
          }
          disabled={isPending}
        />
      ) : null}

      <TodoDetailsFields
        dueAtId={`${idPrefix}-due-at`}
        dueAt={dueAt}
        onDueAtChange={
          setDueAt
        }
        disabled={isPending}
      />

      {errorMessage && (
        <FieldError>
          {errorMessage}
        </FieldError>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            {t(
              "common.cancel",
            )}
          </Button>
        )}

        <Button
          type="submit"
          disabled={
            isPending ||
            isRulePending ||
            !rule ||
            Boolean(
              ruleErrorMessage,
            )
          }
        >
          {submitLabel ??
            t("common.save")}
        </Button>
      </div>
    </form>
  )
}
