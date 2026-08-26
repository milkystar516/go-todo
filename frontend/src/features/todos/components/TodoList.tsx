import { TodoListEmpty } from "./TodoListEmpty"
import { TodoItem } from "./TodoItem"
import type { Todo } from "../../../api/types"

type TodoListProps = {
  todos: Todo[]
  onAdd: () => void
}

export function TodoList({
  todos,
  onAdd,
}: TodoListProps) {
  if (todos.length === 0) {
    return <TodoListEmpty onAdd={onAdd} />
  }

  return (
    <ul className="flex flex-col gap-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
        />
      ))}
    </ul>
  )
}