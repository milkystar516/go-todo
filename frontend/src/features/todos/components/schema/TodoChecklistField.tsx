import { useRef } from "react"
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from "lucide-react"
import {
  getUiOptions,
  type FieldProps,
  type UiSchema,
} from "@rjsf/utils"
import { useTranslation } from "react-i18next"

import { Button } from "#components/ui/button"
import { Checkbox } from "#components/ui/checkbox"
import {
  Field,
  FieldError,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"

import { getItemSchema } from "../../../../lib/schema/todoContentSchema"

interface ChecklistItem {
  text: string
  completed: boolean
}

function normalizeChecklistItem(value: unknown): ChecklistItem {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {
      text: "",
      completed: false,
    }
  }

  const item = value as Record<string, unknown>

  return {
    text: typeof item.text === "string" ? item.text : "",
    completed: item.completed === true,
  }
}

function getChecklistItemUiSchema(
  uiSchema?: UiSchema,
): UiSchema | undefined {
  const items = uiSchema?.items

  if (
    typeof items !== "object" ||
    items === null ||
    Array.isArray(items)
  ) {
    return undefined
  }

  return items as UiSchema
}

export function TodoChecklistField({
  schema,
  uiSchema,
  formData,
  errorSchema,
  fieldPathId,
  disabled = false,
  readonly = false,
  registry,
  onChange,
  onBlur,
}: FieldProps) {
  const { t } = useTranslation()

  const items = Array.isArray(formData)
  ? formData.map(normalizeChecklistItem)
  : []

  const nextRowKeyRef = useRef(items.length)
  const rowKeysRef = useRef<string[] | null>(null)

  if (rowKeysRef.current === null) {
    rowKeysRef.current = items.map(
      (_, index) => `${fieldPathId.$id}-row-${index}`,
    )
  }

  const rowKeys = rowKeysRef.current

  const itemSchema = getItemSchema(schema)
  const itemUiSchema = getChecklistItemUiSchema(uiSchema)
  const textUiSchema = itemUiSchema?.text as
    | UiSchema
    | undefined

  const { placeholder } = getUiOptions(textUiSchema)
  const {
    addable = true,
    orderable = true,
    removable = true,
  } = getUiOptions(
    uiSchema,
    registry.globalUiOptions,
  )

  const locked = disabled || readonly

  const canAdd =
    !locked &&
    addable !== false &&
    (schema.maxItems === undefined ||
      items.length < schema.maxItems)

  const canRemove =
    !locked &&
    removable !== false &&
    (schema.minItems === undefined ||
      items.length > schema.minItems)

  const canReorder =
    !locked &&
    orderable !== false &&
    items.length > 1
    
  function createRowKey() {
    const key =
      `${fieldPathId.$id}-row-${nextRowKeyRef.current}`

    nextRowKeyRef.current += 1

    return key
  }

  function updateItems(nextItems: ChecklistItem[]) {
    onChange(nextItems, fieldPathId.path)
  }

  function updateItem(
    index: number,
    patch: Partial<ChecklistItem>,
  ) {
    updateItems(
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    )
  }

  function addItem() {
    const defaultItem = itemSchema
      ? registry.schemaUtils.getDefaultFormState(
          itemSchema,
        )
      : undefined
    
    rowKeysRef.current = [
      ...rowKeys,
      createRowKey(),
    ]

    updateItems([
      ...items,
      normalizeChecklistItem(defaultItem),
    ])
  }

  function removeItem(index: number) {
    if (!canRemove) {
        return
    }

    rowKeysRef.current = rowKeys.filter(
        (_, itemIndex) => itemIndex !== index,
    )

    updateItems(
        items.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  function moveItem(
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex = index + direction

    if (
      !canReorder ||
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return
    }

    const nextItems = [...items]
    const [item] = nextItems.splice(index, 1)

    nextItems.splice(targetIndex, 0, item)

    const nextRowKeys = [...rowKeys]
    const [rowKey] = nextRowKeys.splice(index, 1)

    nextRowKeys.splice(targetIndex, 0, rowKey)
    rowKeysRef.current = nextRowKeys

    updateItems(nextItems)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const itemErrors = errorSchema?.[index]
        const errorMessages = [
          ...(itemErrors?.__errors ?? []),
          ...(itemErrors?.text?.__errors ?? []),
          ...(itemErrors?.completed?.__errors ?? []),
        ]

        const invalid = errorMessages.length > 0

        return (
          <Field
            key={rowKeys[index]}
            data-invalid={invalid}
            className="gap-1"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Checkbox
                checked={item.completed}
                disabled={disabled || readonly}
                aria-label={t(
                  "todos.form.checklist.completed",
                  { number: index + 1 },
                )}
                onCheckedChange={(checked) =>
                  updateItem(index, {
                    completed: checked === true,
                  })
                }
                onBlur={() =>
                  onBlur(
                    `${fieldPathId.$id}_${index}_completed`,
                    item.completed,
                  )
                }
              />

              <Input
                value={item.text}
                disabled={disabled}
                readOnly={readonly}
                placeholder={
                  typeof placeholder === "string"
                    ? placeholder
                    : undefined
                }
                aria-label={t(
                  "todos.form.checklist.item",
                  { number: index + 1 },
                )}
                aria-invalid={invalid || undefined}
                className={cn(
                  "h-8 flex-1 rounded-none border-0 bg-transparent px-1 shadow-none",
                  "focus-visible:border-transparent focus-visible:ring-0",
                  item.completed &&
                    "text-muted-foreground line-through",
                )}
                onChange={(event) =>
                  updateItem(index, {
                    text: event.target.value,
                  })
                }
                onBlur={() =>
                  onBlur(
                    `${fieldPathId.$id}_${index}_text`,
                    item.text,
                  )
                }
              />

              {!locked && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {orderable !== false && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={!canReorder || index === 0}
                        aria-label={t(
                          "todos.form.checklist.moveUp",
                          { number: index + 1 },
                        )}
                        onClick={() =>
                          moveItem(index, -1)
                        }
                      >
                        <ChevronUp />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={
                          !canReorder ||
                          index === items.length - 1
                        }
                        aria-label={t(
                          "todos.form.checklist.moveDown",
                          { number: index + 1 },
                        )}
                        onClick={() =>
                          moveItem(index, 1)
                        }
                      >
                        <ChevronDown />
                      </Button>
                    </>
                  )}

                  {removable !== false && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={!canRemove}
                      aria-label={t(
                        "todos.form.checklist.remove",
                        { number: index + 1 },
                      )}
                      onClick={() =>
                        removeItem(index)
                      }
                    >
                      <X />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {invalid && (
              <FieldError>
                {errorMessages.join(" ")}
              </FieldError>
            )}
          </Field>
        )
      })}

      {canAdd && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={addItem}
        >
          <Plus />
          {t("todos.form.checklist.addItem")}
        </Button>
      )}
    </div>
  )
}