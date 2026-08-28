import type { RJSFSchema, UiSchema } from "@rjsf/utils"

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

export function getOrderedPropertyNames(
  schema: RJSFSchema,
  uiSchema: UiSchema,
) {
  const properties = getPropertySchemas(schema)
  const names = Object.keys(properties)
  const configuredOrder = uiSchema["ui:order"]

  if (!Array.isArray(configuredOrder)) {
    return names
  }

  return [
    ...configuredOrder.filter(
      (name): name is string =>
        typeof name === "string" && name !== "*" && name in properties,
    ),
    ...names.filter((name) => !configuredOrder.includes(name)),
  ]
}

export function getChoiceValues(schema: RJSFSchema): unknown[] {
  if (Array.isArray(schema.enum)) {
    return schema.enum
  }

  if (!Array.isArray(schema.oneOf)) {
    return []
  }

  return schema.oneOf.flatMap((choice) => {
    if (!isSchemaObject(choice) || !("const" in choice)) {
      return []
    }

    return [choice.const]
  })
}

function exampleValue(
  schema: RJSFSchema,
  exampleText: string,
): unknown {
  if (schema.default !== undefined) return schema.default

  const choices = getChoiceValues(schema)
  if (choices.length > 0) return choices[0]

  if (schema.type === "array") {
    const items = getItemSchema(schema)
    if (!items) return []

    const itemChoices = getChoiceValues(items)
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
