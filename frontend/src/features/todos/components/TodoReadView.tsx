import { useTranslation } from "react-i18next"

import type {
  TodoRuleSchema,
} from "../../../api/types"
import {
  TodoContentView,
} from "./TodoContentView"

export interface TodoViewData {
  title: string
  due_at: string | null
  content: Record<string, unknown>
}

interface TodoReadViewProps {
  todo: TodoViewData
  rule: TodoRuleSchema
  showTitle?: boolean
}

function formatDateTime(
  value: string,
  language: string,
) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    language,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date)
}

export function TodoReadView({
  todo,
  rule,
  showTitle = true,
}: TodoReadViewProps) {
  const { t, i18n } =
    useTranslation()

  const dueAt = todo.due_at
    ? formatDateTime(
        todo.due_at,
        i18n.language,
      )
    : null

  return (
    <div className="space-y-4">
      {showTitle && (
        <p className="text-sm font-medium">
          {todo.title}
        </p>
      )}

      <TodoContentView
        rule={rule}
        content={todo.content}
      />

      {dueAt && (
        <div className="flex items-baseline justify-between gap-4 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            {t("todos.form.dueAt")}
          </span>

          <span>{dueAt}</span>
        </div>
      )}
    </div>
  )
}