import {
  getTemplate,
  getUiOptions,
  type ArrayFieldItemTemplateProps,
  type BaseInputTemplateProps,
  type FieldTemplateProps,
  type ObjectFieldTemplateProps,
  type UiSchema,
} from "@rjsf/utils"

import {
  Item,
  ItemActions,
} from "#components/ui/item"
import { cn } from "#lib/utils"

function isUiSchemaObject(
  value: unknown,
): value is UiSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function ChecklistRow({
  children,
  buttonsProps,
  hasToolbar,
  registry,
  uiSchema,
}: ArrayFieldItemTemplateProps) {
  const Buttons = getTemplate(
    "ArrayFieldItemButtonsTemplate",
    registry,
    getUiOptions(uiSchema),
  )

  return (
    <Item
      size="xs"
      className="group/checklist mb-2 flex-nowrap items-start gap-2 border-0 px-0 py-0"
    >
      <div className="min-w-0 flex-1">
        {children}
      </div>

      {hasToolbar && (
        <ItemActions className="h-9 shrink-0">
          <Buttons {...buttonsProps} />
        </ItemActions>
      )}
    </Item>
  )
}

function ChecklistLayout({
  properties,
}: ObjectFieldTemplateProps) {
  const completed = properties.find(
    (property) =>
      property.name === "completed",
  )

  const text = properties.find(
    (property) =>
      property.name === "text",
  )

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex h-9 w-6 shrink-0 items-center justify-center">
        {completed?.content}
      </div>

      <div className="min-w-0 flex-1">
        {text?.content}
      </div>
    </div>
  )
}

function ChecklistField({
  id,
  children,
  description,
  errors,
  help,
  hidden,
  label,
  schema,
}: FieldTemplateProps) {
  if (hidden) {
    return (
      <div className="hidden">
        {children}
      </div>
    )
  }

  const type = Array.isArray(
    schema.type,
  )
    ? schema.type[0]
    : schema.type

  const labelsControl =
    type === "string" ||
    type === "boolean"

  return (
    <div className="min-w-0 space-y-1">
      {labelsControl && label && (
        <label
          className="sr-only"
          htmlFor={id}
        >
          {label}
        </label>
      )}

      {children}
      {description}
      {errors}
      {help}
    </div>
  )
}

function ChecklistInput(
  props: BaseInputTemplateProps,
) {
  const BaseInput =
    props.registry.templates
      .BaseInputTemplate

  const invalid = Boolean(
    props.rawErrors?.length,
  )

  const completed =
    props.options.completed === true

  return (
    <BaseInput
      {...props}
      className={cn(
        props.className,
        "h-8 bg-transparent px-1 shadow-none",
        "hover:bg-input/30 focus-visible:bg-background",
        invalid
          ? "border-destructive"
          : "border-transparent",
        completed &&
          "text-muted-foreground line-through",
      )}
    />
  )
}

function checklistItemUi(
  stored: UiSchema,
  itemData: unknown,
): UiSchema {
  const item =
    typeof itemData === "object" &&
    itemData !== null &&
    !Array.isArray(itemData)
      ? (itemData as Record<
          string,
          unknown
        >)
      : {}

  const text = isUiSchemaObject(
    stored.text,
  )
    ? { ...stored.text }
    : {}

  const completed =
    isUiSchemaObject(stored.completed)
      ? { ...stored.completed }
      : {}

  const textOptions =
    isUiSchemaObject(
      text["ui:options"],
    )
      ? text["ui:options"]
      : {}

  const completedOptions =
    isUiSchemaObject(
      completed["ui:options"],
    )
      ? completed["ui:options"]
      : {}

  return {
    ...stored,

    "ui:FieldTemplate":
      ChecklistField,

    "ui:ObjectFieldTemplate":
      ChecklistLayout,

    text: {
      ...text,

      "ui:FieldTemplate":
        ChecklistField,

      "ui:BaseInputTemplate":
        ChecklistInput,

      "ui:options": {
        ...textOptions,
        completed:
          item.completed === true,
      },
    },

    completed: {
      ...completed,

      "ui:FieldTemplate":
        ChecklistField,

      "ui:options": {
        ...completedOptions,
        label: false,
      },
    },
  }
}

export function buildChecklistUi(
  storedUiSchema?: UiSchema,
): UiSchema {
  const uiSchema: UiSchema = {
    ...(isUiSchemaObject(
      storedUiSchema,
    )
      ? storedUiSchema
      : {}),
  }

  const storedItems =
    isUiSchemaObject(uiSchema.items)
      ? { ...uiSchema.items }
      : {}

  const storedOptions =
    isUiSchemaObject(
      uiSchema["ui:options"],
    )
      ? uiSchema["ui:options"]
      : {}

  uiSchema.items = (itemData) =>
    checklistItemUi(
      storedItems,
      itemData,
    )

  uiSchema["ui:ArrayFieldItemTemplate"] = ChecklistRow

  uiSchema["ui:options"] = {
    ...storedOptions,
    copyable: false,
  }
    
  return uiSchema
}