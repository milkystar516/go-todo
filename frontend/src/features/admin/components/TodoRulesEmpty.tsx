import { FileJson, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "#components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty"

interface TodoRulesEmptyProps {
  onCreate: () => void
}

export function TodoRulesEmpty({
  onCreate,
}: TodoRulesEmptyProps) {
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
        <Button type="button" onClick={onCreate}>
          <Plus />
          {t("admin.todoRules.create.action")}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
