import {
  generateForm,
} from "@rjsf/shadcn"
import {
  deepEquals,
  TranslatableString,
  type ArrayFieldItemTemplateProps,
  type ArrayFieldTemplateProps,
  type BaseInputTemplateProps,
  type EnumOptionsType,
  type MultiSchemaFieldTemplateProps,
  type ObjectFieldTemplateProps,
  type RegistryWidgetsType,
  type RJSFSchema,
  type TemplatesType,
  type UiSchema,
  type WidgetProps,
} from "@rjsf/utils"
import {
  CheckSquare,
  Square,
} from "lucide-react"
import {
  useId,
  useMemo,
  type ReactNode,
} from "react"

import type {
  TodoRuleSchema,
} from "../../../api/types"
import {
  getPropertySchemas,
  isChecklistSchema,
} from "../../../lib/schema/todoContentSchema"
import {
  rjsfValidator,
} from "../../../lib/schema/rjsfValidator"
import {
  TodoFieldTemplate,
} from "#components/schema/TodoFieldTemplate"
import { cn } from "#lib/utils"
import {
  buildTodoGridUiSchema,
} from "../lib/todoFormPresentation"

type Content =
  Record<string, unknown>

const RjsfForm =
  generateForm<Content>()

interface TodoContentViewProps {
  rule: TodoRuleSchema
  content: Content
}

function isUiSchemaObject(
  value: unknown,
): value is UiSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function StaticValue({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "break-words text-sm",
        className,
      )}
    >
      {children}
    </span>
  )
}

function valueText(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "–"
  }

  if (
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(
        value,
      )
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function displayValue(
  value: unknown,
  options:
    WidgetProps["options"],
) {
  const enumOptions =
    options.enumOptions as
      | EnumOptionsType[]
      | undefined

  const labelFor = (
    item: unknown,
  ) =>
    enumOptions?.find(
      (option) =>
        deepEquals(
          option.value,
          item,
        ),
    )?.label ??
    valueText(item)

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "–"
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value
          .map(labelFor)
          .join(", ")
      : "–"
  }

  return labelFor(value)
}

function ReadValue(
  props: WidgetProps,
) {
  return (
    <StaticValue>
      {displayValue(
        props.value,
        props.options,
      )}
    </StaticValue>
  )
}

function ReadTextarea(
  props: WidgetProps,
) {
  return (
    <StaticValue className="whitespace-pre-wrap">
      {displayValue(
        props.value,
        props.options,
      )}
    </StaticValue>
  )
}

function ReadBaseInput({
  value,
}: BaseInputTemplateProps) {
  return (
    <StaticValue>
      {valueText(value)}
    </StaticValue>
  )
}

function ReadPassword({
  value,
}: WidgetProps) {
  const length =
    typeof value === "string"
      ? value.length
      : 0

  return (
    <StaticValue
      className={
        length === 0
          ? "text-muted-foreground"
          : undefined
      }
    >
      {length > 0
        ? "•".repeat(length)
        : "–"}
    </StaticValue>
  )
}

function ReadBoolean({
  value,
  label,
  hideLabel,
  registry,
}: WidgetProps) {
  const checked =
    value === true

  const stateLabel =
    registry.translateString(
      checked
        ? TranslatableString.YesLabel
        : TranslatableString.NoLabel,
    )

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      {checked ? (
        <CheckSquare
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      ) : (
        <Square
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}

      {!hideLabel && (
        <span>{label}</span>
      )}

      <span className="sr-only">
        {stateLabel}
      </span>
    </span>
  )
}

function ReadChecklist({
  properties,
  formData,
}: ObjectFieldTemplateProps) {
  const completed =
    properties.find(
      (property) =>
        property.name ===
        "completed",
    )

  const text =
    properties.find(
      (property) =>
        property.name ===
        "text",
    )

  const checked =
    typeof formData ===
      "object" &&
    formData !== null &&
    !Array.isArray(
      formData,
    ) &&
    (
      formData as Record<
        string,
        unknown
      >
    ).completed === true

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-5 shrink-0 items-center justify-center">
        {completed?.content}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1",
          checked &&
            "text-muted-foreground line-through",
        )}
      >
        {text?.content}
      </div>
    </div>
  )
}

function ReadObject({
  properties,
  title,
  description,
  fieldPathId,
}: ObjectFieldTemplateProps) {
  const nested =
    fieldPathId.path.length > 0

  return (
    <div className="space-y-3">
      {nested && title && (
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
      )}

      {nested
        ? description
        : null}

      {properties.map(
        (property) =>
          property.hidden
            ? null
            : (
                <div
                  key={
                    property.name
                  }
                >
                  {
                    property.content
                  }
                </div>
              ),
      )}
    </div>
  )
}

function ReadArray({
  items,
  title,
  schema,
}: ArrayFieldTemplateProps) {
  const checklist =
    isChecklistSchema(schema)

  return (
    <div className="space-y-1.5">
      {title && (
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
      )}


      {items.length > 0 ? (
        <div
          className={
            checklist
              ? "space-y-1.5"
              : "space-y-2"
          }
        >
          {items}
        </div>
      ) : (
        <StaticValue className="text-muted-foreground">
          –
        </StaticValue>
      )}
    </div>
  )
}

function ReadArrayItem({
  children,
}: ArrayFieldItemTemplateProps) {
  return <div>{children}</div>
}

function ReadMultiSchema({
  optionSchemaField,
}: MultiSchemaFieldTemplateProps) {
  return optionSchemaField
}

function checklistReadUi(
  storedUiSchema?: UiSchema,
): UiSchema {
  const uiSchema =
    isUiSchemaObject(
      storedUiSchema,
    )
      ? { ...storedUiSchema }
      : {}

  const items =
    isUiSchemaObject(
      uiSchema.items,
    )
      ? { ...uiSchema.items }
      : {}

  const completed =
    isUiSchemaObject(
      items.completed,
    )
      ? { ...items.completed }
      : {}

  const text =
    isUiSchemaObject(
      items.text,
    )
      ? { ...items.text }
      : {}

  const completedOptions =
    isUiSchemaObject(
      completed[
        "ui:options"
      ],
    )
      ? completed[
          "ui:options"
        ]
      : {}

  const textOptions =
    isUiSchemaObject(
      text["ui:options"],
    )
      ? text["ui:options"]
      : {}

  uiSchema.items = {
    ...items,

    "ui:ObjectFieldTemplate":
      ReadChecklist,

    completed: {
      ...completed,

      "ui:options": {
        ...completedOptions,
        label: false,
      },
    },

    text: {
      ...text,

      "ui:options": {
        ...textOptions,
        label: false,
      },
    },
  }

  return uiSchema
}

function buildReadUiSchema(
  schema: RJSFSchema,
  storedUiSchema?: UiSchema,
): UiSchema {
  const uiSchema =
    buildTodoGridUiSchema(
      schema,
      storedUiSchema,
    )

  const properties =
    getPropertySchemas(schema)

  for (
    const [
      propertyName,
      propertySchema,
    ] of Object.entries(
      properties,
    )
  ) {
    if (
      !isChecklistSchema(
        propertySchema,
      )
    ) {
      continue
    }

    uiSchema[propertyName] =
      checklistReadUi(
        isUiSchemaObject(
          uiSchema[
            propertyName
          ],
        )
          ? uiSchema[
              propertyName
            ]
          : undefined,
      )
  }

  uiSchema[
    "ui:submitButtonOptions"
  ] = {
    ...uiSchema[
      "ui:submitButtonOptions"
    ],
    norender: true,
  }

  return uiSchema
}

const readWidgets = {
  AltDateWidget: ReadValue,
  AltDateTimeWidget:
    ReadValue,
  CheckboxWidget:
    ReadBoolean,
  CheckboxesWidget:
    ReadValue,
  ColorWidget: ReadValue,
  DateWidget: ReadValue,
  DateTimeWidget: ReadValue,
  EmailWidget: ReadValue,
  HiddenWidget: () => null,
  PasswordWidget:
    ReadPassword,
  RadioWidget: ReadValue,
  RangeWidget: ReadValue,
  RatingWidget: ReadValue,
  SelectWidget: ReadValue,
  TextWidget: ReadValue,
  TextareaWidget:
    ReadTextarea,
  TimeWidget: ReadValue,
  UpDownWidget: ReadValue,
  URLWidget: ReadValue,
} satisfies RegistryWidgetsType<
  Content
>

const readTemplates = {
  FieldTemplate:
    TodoFieldTemplate,

  ObjectFieldTemplate:
    ReadObject,

  ArrayFieldTemplate:
    ReadArray,

  ArrayFieldItemTemplate:
    ReadArrayItem,

  BaseInputTemplate:
    ReadBaseInput,

  MultiSchemaFieldTemplate:
    ReadMultiSchema,
} satisfies Partial<
  TemplatesType<Content>
>

export function TodoContentView({
  rule,
  content,
}: TodoContentViewProps) {
  const idPrefix =
    `todo-view-${useId().replaceAll(
      ":",
      "",
    )}`

  const uiSchema =
    useMemo(
      () =>
        buildReadUiSchema(
          rule.content_schema,
          rule.ui_schema,
        ),
      [
        rule.content_schema,
        rule.ui_schema,
      ],
    )

  return (
    <RjsfForm
      idPrefix={idPrefix}
      tagName="div"
      schema={
        rule.content_schema
      }
      uiSchema={uiSchema}
      formData={content}
      validator={
        rjsfValidator
      }
      widgets={readWidgets}
      templates={
        readTemplates
      }
      readonly
      showErrorList={false}
    />
  )
}
