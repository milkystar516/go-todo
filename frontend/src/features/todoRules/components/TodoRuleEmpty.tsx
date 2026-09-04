import { FileJson, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "#components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty"

export function TodoRuleEmpty() {
  const { t } = useTranslation()

  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileJson />
        </EmptyMedia>

        <EmptyTitle>
          {t("admin.todoRules.empty.title")}
        </EmptyTitle>

        <EmptyDescription>
          {t("admin.todoRules.empty.description")}
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <Button asChild>
          <Link to="/admin/todo-rules/new">
            <Plus />
            {t("admin.todoRules.create.action")}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
