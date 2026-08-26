import { ListTodo, Plus } from "lucide-react"

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
  onAdd: () => void
}

export function TodoListEmpty({
  onAdd,
}: TodoListEmptyProps) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListTodo />
        </EmptyMedia>

        <EmptyTitle>아직 할 일이 없어요</EmptyTitle>

        <EmptyDescription>
          첫 번째 할 일을 추가해 보세요.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <Button type="button" onClick={onAdd}>
          <Plus />
          할 일 추가
        </Button>
      </EmptyContent>
    </Empty>
  )
}