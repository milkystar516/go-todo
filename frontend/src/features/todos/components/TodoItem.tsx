import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import type {
  TodoFieldsInput,
  TodoUpdateInput,
} from "../../../api/todos";
import type { Todo, TodoRuleDetail } from "../../../api/types";
import { getErrorMessage } from "../../../lib/apiError";
import { cn } from "#lib/utils";
import { ConfirmActionDialog } from "#components/common/ConfirmActionDialog";
import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
} from "#components/ui/item";
import type { TodoListMetadataItem } from "../lib/listMetadata";
import {
  deleteTodoMutationOptions,
  toggleTodoMutationOptions,
  updateTodoMutationOptions,
} from "../queries";
import { TodoForm } from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  rule: TodoRuleDetail;
  metadata: TodoListMetadataItem[];
  canManage: boolean;
  defaultOpen?: boolean;
  showTitleInput?: boolean;
}

function formatMetadataValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "✓" : "–";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function changedTodoFields(
  todo: Todo,
  input: TodoFieldsInput,
): TodoUpdateInput {
  const changes: TodoUpdateInput = {};

  if (input.title !== todo.title) {
    changes.title = input.title;
  }
  if (input.due_at !== todo.due_at) {
    changes.due_at = input.due_at;
  }
  if (JSON.stringify(input.content) !== JSON.stringify(todo.content)) {
    changes.content = input.content;
  }

  return changes;
}

export function TodoItem({
  todo,
  rule,
  metadata,
  canManage,
  defaultOpen = false,
  showTitleInput = true,
}: TodoItemProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const mutationScope = { id: `todo:${todo.id}` };
  const updateMutation = useMutation({
    ...updateTodoMutationOptions(queryClient),
    scope: mutationScope,
  });
  const toggleMutation = useMutation({
    ...toggleTodoMutationOptions(queryClient),
    scope: mutationScope,
  });
  const deleteMutation = useMutation({
    ...deleteTodoMutationOptions(queryClient),
    scope: mutationScope,
  });
  const completed = todo.completed_at !== null;
  const fallbackError = t("common.requestFailed");
  const toggleErrorMessage = toggleMutation.isError
    ? getErrorMessage(toggleMutation.error, fallbackError)
    : null;
  const updateErrorMessage = updateMutation.isError
    ? getErrorMessage(updateMutation.error, fallbackError)
    : null;
  const deleteErrorMessage = deleteMutation.isError
    ? getErrorMessage(deleteMutation.error, fallbackError)
    : null;
  const dueAt = todo.due_at
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
      }).format(new Date(todo.due_at))
    : null;

  return (
    <Collapsible
      role="listitem"
      open={open}
      onOpenChange={setOpen}
    >
      <Item
        variant="outline"
        size="sm"
        className={completed ? "opacity-60" : undefined}
      >
        <Checkbox
          checked={completed}
          disabled={
            !canManage ||
            toggleMutation.isPending ||
            deleteMutation.isPending
          }
          aria-label={
            completed
              ? t("todos.actions.markIncomplete")
              : t("todos.actions.markComplete")
          }
          onCheckedChange={() => toggleMutation.mutate({ todoId: todo.id })}
        />

        <ItemContent className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm font-medium",
                    completed
                      ? "text-muted-foreground line-through"
                      : "",
                  )}
                >
                  {todo.title}
                </span>

                {(dueAt || metadata.length > 0) && (
                  <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {dueAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {dueAt}
                      </span>
                    )}
                    {metadata.map((item, index) => (
                      <span key={`${item.label}-${index}`}>
                        {item.label}: {formatMetadataValue(item.value)}
                      </span>
                    ))}
                  </span>
                )}
              </span>

              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open ? "rotate-180" : "",
                )}
              />
            </button>
          </CollapsibleTrigger>
        </ItemContent>

        {canManage && (
          <ItemActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("todos.actions.menu")}
                  disabled={deleteMutation.isPending}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpen(true)}>
                  <Pencil />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={
                    updateMutation.isPending || toggleMutation.isPending
                  }
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        )}
      </Item>

      <CollapsibleContent>
        <div className="mt-2 rounded-xl border bg-card p-4">
          <TodoForm
            key={`${todo.id}:${rule.id}`}
            rule={rule}
            todo={todo}
            readOnly={!canManage}
            showTitleInput={showTitleInput}
            isPending={updateMutation.isPending || deleteMutation.isPending}
            errorMessage={updateErrorMessage}
            onSubmit={
              canManage
                ? (input) => {
                    const changes = changedTodoFields(todo, input);
                    if (Object.keys(changes).length === 0) {
                      return;
                    }

                    updateMutation.mutate({
                      todoId: todo.id,
                      input: changes,
                    });
                  }
                : undefined
            }
          />
        </div>
      </CollapsibleContent>

      {toggleErrorMessage && (
        <p className="mt-2 px-2 text-sm text-destructive" role="alert">
          {toggleErrorMessage}
        </p>
      )}

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("todos.delete.title")}
        description={t("todos.delete.description", { title: todo.title })}
        confirmLabel={t("common.delete")}
        isPending={deleteMutation.isPending}
        errorMessage={deleteErrorMessage}
        onConfirm={() => {
          deleteMutation.mutate(
            { todoId: todo.id },
            {
              onSuccess: () => {
                setDeleteDialogOpen(false);
              },
            },
          );
        }}
      />
    </Collapsible>
  );
}
