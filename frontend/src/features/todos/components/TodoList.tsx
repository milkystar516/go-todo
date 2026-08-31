import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Todo, TodoRuleDetail } from "../../../api/types";
import { cn } from "#lib/utils";
import { Button } from "#components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible";
import { ItemGroup } from "#components/ui/item";
import { Skeleton } from "#components/ui/skeleton";
import { getTodoListMetadata } from "../lib/listMetadata";
import { TodoItem } from "./TodoItem";
import { TodoListEmpty } from "./TodoListEmpty";

interface TodoListProps {
  activeTodos: Todo[];
  completedTodos: Todo[];
  rulesById: ReadonlyMap<number, TodoRuleDetail>;
  isLoading?: boolean;
  onAdd?: () => void;
  canManage: (todo: Todo) => boolean;
}

function TodoListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex h-14 items-center gap-3 rounded-xl border px-4"
        >
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

interface TodoItemsProps extends Omit<
  TodoListProps,
  "activeTodos" | "completedTodos" | "isLoading" | "onAdd"
> {
  todos: Todo[];
}

function TodoItems({
  todos,
  rulesById,
  canManage,
}: TodoItemsProps) {
  return (
    <ItemGroup className="gap-2">
      {todos.map((todo) => {
        const rule = rulesById.get(todo.rule_id);
        if (!rule) {
          throw new Error(
            `Missing todo rule ${todo.rule_id} for todo ${todo.id}`,
          );
        }

        return (
          <TodoItem
            key={todo.id}
            todo={todo}
            rule={rule}
            metadata={getTodoListMetadata(todo, rule)}
            canManage={canManage(todo)}
          />
        );
      })}
    </ItemGroup>
  );
}

function CompletedTodos(props: TodoItemsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (props.todos.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ChevronDown
            className={cn(
              "transition-transform",
              open ? "rotate-180" : "",
            )}
          />
          {t("todos.completed", { count: props.todos.length })}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <TodoItems {...props} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TodoList({
  activeTodos,
  completedTodos,
  rulesById,
  isLoading = false,
  onAdd,
  canManage,
}: TodoListProps) {
  if (isLoading) {
    return <TodoListSkeleton />;
  }

  if (activeTodos.length === 0 && completedTodos.length === 0) {
    return <TodoListEmpty onAdd={onAdd} />;
  }

  const sharedProps = {
    rulesById,
    canManage,
  };

  return (
    <div className="space-y-4">
      {activeTodos.length > 0 && (
        <TodoItems todos={activeTodos} {...sharedProps} />
      )}
      <CompletedTodos todos={completedTodos} {...sharedProps} />
    </div>
  );
}
