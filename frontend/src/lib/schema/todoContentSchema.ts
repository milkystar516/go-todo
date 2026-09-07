import type { RJSFSchema } from "@rjsf/utils"

export function isSchemaObject(value: unknown): value is RJSFSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getPropertySchemas(schema: RJSFSchema) {
  if (!isSchemaObject(schema.properties)) {
    return {} as Record<string, RJSFSchema>
  }

  return Object.fromEntries(
    Object.entries(schema.properties).filter(
      (entry): entry is [string, RJSFSchema] =>
        isSchemaObject(entry[1]),
    ),
  )
}

export function getItemSchema(schema: RJSFSchema) {
  return isSchemaObject(schema.items) ? schema.items : undefined
}

export function isChecklistSchema(schema: RJSFSchema) {
  if (schema.type !== "array") return false

  const items = getItemSchema(schema)
  if (!items || items.type !== "object") return false

  const properties = getPropertySchemas(items)
  return (
    Object.keys(properties).length === 2 &&
    properties.text?.type === "string" &&
    properties.completed?.type === "boolean"
  )
}