import {
  buttonId,
  getUiOptions,
  toFieldPathId,
  TranslatableString,
  type ArrayFieldItemTemplateProps,
  type FieldProps,
  type UiSchema,
} from "@rjsf/utils"
import { useTranslation } from "react-i18next"

import { Checkbox } from "#components/ui/checkbox"
import { FieldError } from "#components/ui/field"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"

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

export function TodoChecklistItemTemplate({
  children,
  buttonsProps,
  displayLabel,
  hasDescription,
  hasToolbar,
  index,
}: ArrayFieldItemTemplateProps) {
  const { t } = useTranslation()

  const {
    disabled = false,
    fieldPathId,
    hasCopy,
    hasMoveDown,
    hasMoveUp,
    hasRemove,
    onCopyItem,
    onMoveDownItem,
    onMoveUpItem,
    onRemoveItem,
    readonly = false,
    registry,
    uiSchema,
  } = buttonsProps

  const {
    ClearButton,
    CopyButton,
    MoveDownButton,
    MoveUpButton,
  } = registry.templates.ButtonTemplates

  const margin = hasDescription ? -6 : 22
  const removeLabel = registry.translateString(
    TranslatableString.RemoveButton,
  )

  return (
    <div>
      <div className="mb-2 flex flex-row flex-wrap items-start">
        <div className="grow shrink">
          {children}
        </div>

        {!disabled && !readonly && hasToolbar && (
          <div className="flex items-start justify-end p-0.5">
            <div
              className="flex gap-2"
              style={{
                marginLeft: "5px",
                marginTop: displayLabel
                  ? `${margin}px`
                  : undefined,
              }}
            >
              {(hasMoveUp || hasMoveDown) && (
                <MoveUpButton
                  id={buttonId(fieldPathId, "moveUp")}
                  className="rjsf-array-item-move-up"
                  disabled={!hasMoveUp}
                  aria-label={t(
                    "todos.form.checklist.moveUp",
                    { number: index + 1 },
                  )}
                  onClick={onMoveUpItem}
                  uiSchema={uiSchema}
                  registry={registry}
                />
              )}

              {(hasMoveUp || hasMoveDown) && (
                <MoveDownButton
                  id={buttonId(fieldPathId, "moveDown")}
                  className="rjsf-array-item-move-down"
                  disabled={!hasMoveDown}
                  aria-label={t(
                    "todos.form.checklist.moveDown",
                    { number: index + 1 },
                  )}
                  onClick={onMoveDownItem}
                  uiSchema={uiSchema}
                  registry={registry}
                />
              )}

              {hasCopy && (
                <CopyButton
                  id={buttonId(fieldPathId, "copy")}
                  className="rjsf-array-item-copy"
                  aria-label="Copy"
                  onClick={onCopyItem}
                  uiSchema={uiSchema}
                  registry={registry}
                />
              )}

              {hasRemove && (
                <ClearButton
                  id={buttonId(fieldPathId, "remove")}
                  className="rjsf-array-item-remove"
                  title={removeLabel}
                  aria-label={t(
                    "todos.form.checklist.remove",
                    { number: index + 1 },
                  )}
                  onClick={onRemoveItem}
                  uiSchema={uiSchema}
                  registry={registry}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function TodoChecklistField({
  uiSchema,
  formData,
  errorSchema,
  rawErrors = [],
  fieldPathId,
  disabled = false,
  readonly = false,
  registry,
  onChange,
  onBlur,
  onFocus,
}: FieldProps) {
  const { t } = useTranslation()

  const item = normalizeChecklistItem(formData)

  const textUiSchema = uiSchema?.text as
    | UiSchema
    | undefined

  const { placeholder } = getUiOptions(
    textUiSchema,
    registry.globalUiOptions,
  )

  const pathPart =
    fieldPathId.path[fieldPathId.path.length - 1]

  const itemNumber =
    typeof pathPart === "number"
      ? pathPart + 1
      : 1

  const textFieldPathId = toFieldPathId(
    "text",
    registry.globalFormOptions,
    fieldPathId,
  )

  const completedFieldPathId = toFieldPathId(
    "completed",
    registry.globalFormOptions,
    fieldPathId,
  )

  const textErrors =
    errorSchema?.text?.__errors ?? []

  const completedErrors =
    errorSchema?.completed?.__errors ?? []

  const childErrorMessages = [
    ...textErrors,
    ...completedErrors,
  ]

  const invalid =
    rawErrors.length > 0 ||
    childErrorMessages.length > 0

  function updateItem(
    patch: Partial<ChecklistItem>,
  ) {
    onChange(
      {
        ...item,
        ...patch,
      },
      fieldPathId.path,
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <Checkbox
          id={completedFieldPathId.$id}
          checked={item.completed}
          disabled={disabled || readonly}
          aria-label={t(
            "todos.form.checklist.completed",
            { number: itemNumber },
          )}
          aria-invalid={
            completedErrors.length > 0 ||
            undefined
          }
          onCheckedChange={(checked) =>
            updateItem({
              completed: checked === true,
            })
          }
          onBlur={() =>
            onBlur(
              completedFieldPathId.$id,
              item.completed,
            )
          }
          onFocus={() =>
            onFocus(
              completedFieldPathId.$id,
              item.completed,
            )
          }
        />

        <Input
          id={textFieldPathId.$id}
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
            { number: itemNumber },
          )}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-8 flex-1 border-0 bg-transparent px-1 shadow-none",
            "focus-visible:border-transparent focus-visible:ring-0",
            item.completed &&
              "text-muted-foreground line-through",
          )}
          onChange={(event) =>
            updateItem({
              text: event.target.value,
            })
          }
          onBlur={() =>
            onBlur(
              textFieldPathId.$id,
              item.text,
            )
          }
          onFocus={() =>
            onFocus(
              textFieldPathId.$id,
              item.text,
            )
          }
        />
      </div>

      {childErrorMessages.length > 0 && (
        <FieldError>
          {childErrorMessages.join(" ")}
        </FieldError>
      )}
    </div>
  )
}