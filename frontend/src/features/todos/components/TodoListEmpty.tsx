import { ListTodo, Plus } from "lucide-react"
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

type TodoListEmptyProps = {
  onAdd?: () => void
}

export function TodoListEmpty({
  onAdd,
}: TodoListEmptyProps) {
  const { t } = useTranslation()

  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListTodo />
        </EmptyMedia>

        <EmptyTitle>{t("todos.empty.title")}</EmptyTitle>

        <EmptyDescription>
          {t("todos.empty.description")}
        </EmptyDescription>
      </EmptyHeader>

      {onAdd && (
        <EmptyContent>
          <Button type="button" onClick={onAdd}>
            <Plus />
            {t("todos.add")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
