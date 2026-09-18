import {
  useMemo,
} from "react"
import {
  useTranslation,
} from "react-i18next"

import type {
  TodoRuleSchema,
} from "../../../api/types"
import {
  TodoReadView,
  type TodoViewData,
} from "../../todos/components/TodoReadView"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  createExampleContent,
} from "../lib/schema"

interface TodoRulePreviewProps {
  rule: TodoRuleSchema
  className?: string
}

export function TodoRulePreview({
  rule,
  className,
}: TodoRulePreviewProps) {
  const { t } = useTranslation()

  const previewTodo =
    useMemo<TodoViewData>(
      () => ({
        title: t(
          "admin.todoRules.form.todoExampleTitle",
        ),

        due_at: new Date(
          2099,
          11,
          31,
          12,
          0,
          0,
        ).toISOString(),

        content:
          createExampleContent(
            rule.content_schema,
            t(
              "admin.todoRules.form.exampleText",
            ),
          ),
      }),
      [
        rule.content_schema,
        t,
      ],
    )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {t(
            "admin.todoRules.form.todoExample",
          )}
        </CardTitle>

        <CardDescription>
          {t(
            "admin.todoRules.form.todoExampleDescription",
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <TodoReadView
          todo={previewTodo}
          rule={rule}
        />
      </CardContent>
    </Card>
  )
}