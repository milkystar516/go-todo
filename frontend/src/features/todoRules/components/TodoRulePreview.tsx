import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { Todo, TodoRuleDetail } from "../../../api/types"
import { TodoItem } from "../../todos/components/TodoItem"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { createExampleContent } from "../lib/schema"

interface TodoRulePreviewProps {
  rule: TodoRuleDetail
  className?: string
}

async function ignoreTodoUpdate() {}
async function ignoreTodoDelete() {}

export function TodoRulePreview({
  rule,
  className,
}: TodoRulePreviewProps) {
  const { t } = useTranslation()
  const previewKey = useMemo(
    () => JSON.stringify([rule.content_schema, rule.ui_schema]),
    [rule.content_schema, rule.ui_schema],
  )
  const todo = useMemo<Todo>(
    () => ({
      id: 0,
      owner_id: 0,
      list_id: "preview",
      rule_id: rule.id,
      title: t("admin.todoRules.form.todoExampleTitle"),
      due_at: null,
      content: createExampleContent(
        rule.content_schema,
        t("admin.todoRules.form.exampleText"),
      ),
      created_at: "2026-08-27T00:00:00.000Z",
      completed_at: null,
    }),
    [rule, t],
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("admin.todoRules.form.todoExample")}</CardTitle>
        <CardDescription>
          {t("admin.todoRules.form.todoExampleDescription")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <TodoItem
          key={previewKey}
          todo={todo}
          rule={rule}
          metadata={[]}
          canManage={false}
          defaultOpen
          showTitleInput={false}
          onToggleCompleted={() => {}}
          onUpdate={ignoreTodoUpdate}
          onDelete={ignoreTodoDelete}
        />
      </CardContent>
    </Card>
  )
}
