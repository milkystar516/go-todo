import {
  getSchemaType,
  getUiOptions,
  orderProperties,
  type RJSFSchema,
  type UiSchema,
} from "@rjsf/utils"

import {
  getPropertySchemas,
  isChecklistSchema,
} from "../../../lib/schema/todoContentSchema"

export type TodoFieldPresentation = "compact" | "full"

const fullWidthWidgets = new Set([
  "textarea",
  "radio",
  "checkboxes",
])

export function getTodoFieldPresentation(
  schema: RJSFSchema,
  uiSchema?: UiSchema,
): TodoFieldPresentation {
  const schemaType = getSchemaType(schema)
  const type = Array.isArray(schemaType)
    ? schemaType[0]
    : schemaType

  const { widget } = getUiOptions(uiSchema)

  if (schema.format === "data-url") {
    return "full"
  }

  if (fullWidthWidgets.has(String(widget))) {
    return "full"
  }

  if (type === "array" || type === "object") {
    return "full"
  }

  return "compact"
}

export function buildTodoFormUiSchema(
  schema: RJSFSchema,
  storedUiSchema?: UiSchema,
): UiSchema {
  const uiSchema: UiSchema = storedUiSchema
    ? structuredClone(storedUiSchema)
    : {}

  const properties = getPropertySchemas(schema)
  const propertyNames = Object.keys(properties)

  if (propertyNames.length === 0) {
    return uiSchema
  }

  const { order } = getUiOptions(uiSchema)
  const orderedPropertyNames = orderProperties(
    propertyNames,
    order,
  )

  uiSchema["ui:field"] = "LayoutGridField"
  uiSchema["ui:layoutGrid"] = {
    "ui:row": {
      className: "grid grid-cols-1 gap-4 md:grid-cols-2",
      children: orderedPropertyNames.map((propertyName) => {
        const propertySchema = properties[propertyName]
        let propertyUiSchema = uiSchema[propertyName] as
            | UiSchema
            | undefined

        if (isChecklistSchema(propertySchema)) {
            propertyUiSchema = {
                ...(propertyUiSchema ?? {}),
                "ui:field": "TodoChecklistField",
            }

            uiSchema[propertyName] = propertyUiSchema
        }

        const presentation = getTodoFieldPresentation(
            propertySchema,
            propertyUiSchema,
        )

        return {
          "ui:col": {
            className:
              presentation === "full"
                ? "md:col-span-2"
                : "md:col-span-1",
            children: [propertyName],
          },
        }
      }),
    },
  }

  return uiSchema
}