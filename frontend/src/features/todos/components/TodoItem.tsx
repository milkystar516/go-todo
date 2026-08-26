import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import type { TodoUpdateInput } from "../../../api/todos";
import type { Todo, TodoRuleDetail } from "../../../api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog";
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
import { TodoForm } from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  rule?: TodoRuleDetail;
  metadata: TodoListMetadataItem[];
  canManage: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  onToggleCompleted: (todoId: number) => void;
  onUpdate: (
    todoId: number,
    input: TodoUpdateInput,
  ) => Promise<void>;
  onDelete: (todoId: number) => Promise<void>;
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

export function TodoItem({
  todo,
  rule,
  metadata,
  canManage,
  isPending = false,
  errorMessage,
  onToggleCompleted,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const completed = todo.completed_at !== null;
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
          disabled={!canManage || isPending}
          aria-label={
            completed
              ? t("todos.actions.markIncomplete")
              : t("todos.actions.markComplete")
          }
          onCheckedChange={() => onToggleCompleted(todo.id)}
        />

        <ItemContent className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <span className="min-w-0 flex-1">
                <span
                  className={[
                    "block truncate text-sm font-medium",
                    completed
                      ? "text-muted-foreground line-through"
                      : "",
                  ].join(" ")}
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
                className={[
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  open ? "rotate-180" : "",
                ].join(" ")}
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
                  disabled={isPending}
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
          {rule ? (
            <TodoForm
              rule={rule}
              todo={todo}
              readOnly={!canManage}
              isPending={isPending}
              onSubmit={
                canManage
                  ? (input) => onUpdate(todo.id, input)
                  : undefined
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("todos.ruleUnavailable")}
            </p>
          )}
        </div>
      </CollapsibleContent>

      {errorMessage && (
        <p className="mt-2 px-2 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("todos.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("todos.delete.description", { title: todo.title })}
            </AlertDialogDescription>
            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void onDelete(todo.id)
                  .then(() => setDeleteDialogOpen(false))
                  .catch(() => undefined);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}
