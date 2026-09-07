import { orderProperties, type RJSFSchema, type UiSchema } from "@rjsf/utils"

import {
  isSchemaObject,
  getPropertySchemas,
  getItemSchema,
} from "../../../lib/schema/todoContentSchema"

export function getPropertyUiSchema(uiSchema: UiSchema, name: string) {
  const propertyUiSchema = uiSchema[name]
  if (!isSchemaObject(propertyUiSchema)) {
    return undefined
  }

  return structuredClone(propertyUiSchema) as UiSchema
}

export function getPropertyWidget(uiSchema: UiSchema, name: string) {
  const propertyUiSchema = getPropertyUiSchema(uiSchema, name)
  if (!propertyUiSchema) return undefined

  const widget = propertyUiSchema["ui:widget"]
  return typeof widget === "string" ? widget : undefined
}

function exampleValue(
  schema: RJSFSchema,
  exampleText: string,
): unknown {
  if (schema.default !== undefined) return schema.default

  const choices = orderProperties(schema)
  if (choices.length > 0) return choices[0]

  if (schema.type === "array") {
    const items = getItemSchema(schema)
    if (!items) return []

    const itemChoices = orderProperties(items)
    if (itemChoices.length > 0) return itemChoices.slice(0, 2)

    const itemValue = exampleValue(items, exampleText)
    return itemValue === undefined ? [] : [itemValue]
  }

  if (schema.type === "boolean") return true
  if (schema.type === "integer") return 3
  if (schema.type === "number") return 12.5

  if (schema.type === "string") {
    if (schema.format === "email") return "user@example.com"
    if (schema.format === "uri") return "https://example.com"
    if (schema.format === "color") return "#3b82f6"
    if (schema.format === "date") return "2026-08-27"
    if (schema.format === "time") return "09:00:00"
    if (schema.format === "date-time") {
      return "2026-08-27T09:00:00.000Z"
    }

    return exampleText
  }

  return undefined
}

export function createExampleContent(
  schema: RJSFSchema,
  exampleText: string,
) {
  return Object.fromEntries(
    Object.entries(getPropertySchemas(schema)).flatMap(
      ([name, propertySchema]) => {
        const value = exampleValue(propertySchema, exampleText)
        return value === undefined ? [] : [[name, value] as const]
      },
    ),
  )
}
