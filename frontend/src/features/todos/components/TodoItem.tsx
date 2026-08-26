import { useState, type ReactNode } from "react"
import {
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "#components/ui/button"
import { Checkbox } from "#components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"

type TodoItemProps = {
  id: string
  label: string
  completed: boolean
  metadata?: ReactNode
  children?: ReactNode

  onToggleCompleted: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void

  disabled?: boolean
}

export function TodoItem({
  id,
  label,
  completed,
  metadata,
  children,
  onToggleCompleted,
  onEdit,
  onDelete,
  disabled = false,
}: TodoItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={[
          "group rounded-lg border bg-card",
          "transition-colors hover:bg-accent/40",
          completed ? "opacity-60" : "",
        ].join(" ")}
      >
        <div className="flex min-h-12 items-center gap-3 px-3">
          <Checkbox
            checked={completed}
            disabled={disabled}
            aria-label={
              completed
                ? "할 일을 미완료로 변경"
                : "할 일을 완료"
            }
            onCheckedChange={() => onToggleCompleted(id)}
          />

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div
                  className={[
                    "truncate text-sm font-medium",
                    completed
                      ? "text-muted-foreground line-through"
                      : "",
                  ].join(" ")}
                >
                  {label}
                </div>

                {metadata && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {metadata}
                  </div>
                )}
              </div>

              {children && (
                <ChevronDown
                  className={[
                    "size-4 shrink-0 text-muted-foreground",
                    "transition-transform",
                    open ? "rotate-180" : "",
                  ].join(" ")}
                />
              )}
            </button>
          </CollapsibleTrigger>

          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="할 일 메뉴"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(id)}
                  >
                    <Pencil className="size-4" />
                    수정
                  </DropdownMenuItem>
                )}

                {onEdit && onDelete && (
                  <DropdownMenuSeparator />
                )}

                {onDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 className="size-4" />
                    삭제
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {children && (
          <CollapsibleContent>
            <div className="border-t px-4 py-4">
              {children}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}