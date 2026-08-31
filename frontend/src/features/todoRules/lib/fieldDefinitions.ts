import type { RJSFSchema, UiSchema } from "@rjsf/utils"

import type { TodoRuleDetail } from "../../../api/types"
import {
  getChoiceValues,
  getItemSchema,
  getOrderedPropertyNames,
  getPropertySchemas,
  getPropertyUiSchema,
  getPropertyWidget,
  isChecklistSchema,
  isSchemaObject,
} from "./schema"

export const todoRuleFieldTypes = [
  "text",
  "textarea",
  "email",
  "url",
  "color",
  "date",
  "time",
  "datetime",
  "number",
  "integer",
  "range",
  "rating",
  "boolean",
  "select",
  "radio",
  "multiselect",
  "checkboxes",
  "checklist",
  "textList",
  "numberList",
] as const

export type TodoRuleFieldType =
  | (typeof todoRuleFieldTypes)[number]
  | "custom"

export interface TodoRuleChoice {
  id: string
  value: string
  label: string
  originalSchema?: RJSFSchema
}

interface TodoRuleOriginalFieldDefinition {
  type: TodoRuleFieldType
  schema: RJSFSchema
  uiSchema?: UiSchema
  required: boolean
}

export interface TodoRuleFormField {
  id: string
  propertyName: string
  label: string
  type: TodoRuleFieldType
  required: boolean
  choices: TodoRuleChoice[]
  originalDefinition?: TodoRuleOriginalFieldDefinition
}

export interface TodoRuleFormInitialValue {
  ruleName: string
  fields: TodoRuleFormField[]
  originalDefinition?: {
    contentSchema: RJSFSchema
    uiSchema: UiSchema
  }
}

interface TodoRuleFieldSummary {
  name: string
  label: string
  type: TodoRuleFieldType
  required: boolean
  choiceCount: number
}

interface TodoRuleGeneratedLabels {
  checklistItem: string
  checklistCompleted: string
  checklistItemPlaceholder: string
}

const choiceFieldTypes = new Set<TodoRuleFieldType>([
  "select",
  "radio",
  "multiselect",
  "checkboxes",
])

export function isChoiceField(type: TodoRuleFieldType) {
  return choiceFieldTypes.has(type)
}

function choicesForSchema(
  schema: RJSFSchema,
): TodoRuleChoice[] | null {
  if (Array.isArray(schema.oneOf)) {
    const choices: TodoRuleChoice[] = []

    for (const choice of schema.oneOf) {
      if (
        !isSchemaObject(choice) ||
        typeof choice.const !== "string"
      ) {
        return null
      }

      choices.push({
        id: `choice_${choices.length}`,
        value: choice.const,
        label:
          typeof choice.title === "string"
            ? choice.title
            : choice.const,
        originalSchema: structuredClone(choice),
      })
    }

    return choices
  }

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.every((value) => typeof value === "string")) {
      return null
    }

    return schema.enum.map((value, index) => ({
      id: `choice_${index}`,
      value,
      label: value,
    }))
  }

  return []
}

function hasChoiceDefinition(schema: RJSFSchema) {
  return Array.isArray(schema.oneOf) || Array.isArray(schema.enum)
}

function getTodoRuleFieldType(
  schema: RJSFSchema,
  widget?: string,
): TodoRuleFieldType {
  if (widget === "RatingWidget") {
    return schema.type === "integer" ? "rating" : "custom"
  }
  if (widget === "range") {
    return schema.type === "number" ? "range" : "custom"
  }
  if (widget === "textarea") {
    return schema.type === "string" ? "textarea" : "custom"
  }

  if (schema.type === "array") {
    if (isChecklistSchema(schema)) return "checklist"

    const items = getItemSchema(schema)
    if (!items) return "custom"

    const choices = choicesForSchema(items)
    if (choices === null) return "custom"
    if (hasChoiceDefinition(items)) {
      if (widget === "checkboxes") return "checkboxes"
      if (widget === "select") return "multiselect"
      return "custom"
    }

    if (items.type === "string") return "textList"
    if (items.type === "number" || items.type === "integer") {
      return "numberList"
    }
    return "custom"
  }

  const choices = choicesForSchema(schema)
  if (choices === null) return "custom"
  if (hasChoiceDefinition(schema)) {
    if (widget === "radio") return "radio"
    if (!widget || widget === "select") return "select"
    return "custom"
  }

  if (schema.type === "boolean") return "boolean"
  if (schema.type === "number") return "number"
  if (schema.type === "integer") return "integer"

  if (schema.type === "string") {
    if (schema.format === "email") return "email"
    if (schema.format === "uri") return "url"
    if (schema.format === "color") return "color"
    if (schema.format === "date") return "date"
    if (schema.format === "time") return "time"
    if (schema.format === "date-time") return "datetime"
    if (!schema.format) return "text"
  }

  return "custom"
}

export function createTodoRuleFormInitialValue(
  rule: TodoRuleDetail,
): TodoRuleFormInitialValue | null {
  const properties = getPropertySchemas(rule.content_schema)
  const rawProperties = rule.content_schema.properties
  if (
    !isSchemaObject(rawProperties) ||
    Object.keys(rawProperties).length !== Object.keys(properties).length
  ) {
    return null
  }

  const required = new Set(
    Array.isArray(rule.content_schema.required)
      ? rule.content_schema.required
      : [],
  )
  const fields: TodoRuleFormField[] = []

  for (const propertyName of getOrderedPropertyNames(
    rule.content_schema,
    rule.ui_schema,
  )) {
    const schema = properties[propertyName]
    const type = getTodoRuleFieldType(
      schema,
      getPropertyWidget(rule.ui_schema, propertyName),
    )
    const choiceSchema =
      schema.type === "array" ? getItemSchema(schema) : schema
    const choices =
      type !== "custom" && choiceSchema
        ? choicesForSchema(choiceSchema)
        : []

    if (choices === null) return null

    fields.push({
      id: propertyName,
      propertyName,
      label:
        typeof schema.title === "string" && schema.title.trim()
          ? schema.title
          : propertyName,
      type,
      required: required.has(propertyName),
      choices,
      originalDefinition: {
        type,
        schema: structuredClone(schema),
        uiSchema: getPropertyUiSchema(rule.ui_schema, propertyName),
        required: required.has(propertyName),
      },
    })
  }

  return {
    ruleName: rule.rule_name,
    fields,
    originalDefinition: {
      contentSchema: structuredClone(rule.content_schema),
      uiSchema: structuredClone(rule.ui_schema),
    },
  }
}

function choiceSchemas(field: TodoRuleFormField) {
  return field.choices.map((choice) => ({
    ...(choice.originalSchema
      ? structuredClone(choice.originalSchema)
      : {}),
    const: choice.value,
    title: choice.label.trim(),
  }))
}

interface GeneratedFieldDefinition {
  schema: RJSFSchema
  uiSchema?: UiSchema
}

function applyChoices(
  schema: RJSFSchema,
  field: TodoRuleFormField,
) {
  const choiceSchema =
    schema.type === "array" &&
    typeof schema.items === "object" &&
    schema.items !== null &&
    !Array.isArray(schema.items)
      ? schema.items
      : schema

  delete choiceSchema.enum
  choiceSchema.oneOf = choiceSchemas(field)
}

function preservedDefinitionForField(
  field: TodoRuleFormField,
): GeneratedFieldDefinition | null {
  const original = field.originalDefinition
  if (!original || original.type !== field.type) return null

  const schema = structuredClone(original.schema)
  schema.title = field.label.trim()

  if (isChoiceField(field.type)) {
    applyChoices(schema, field)
  }

  return {
    schema,
    uiSchema: original.uiSchema
      ? structuredClone(original.uiSchema)
      : undefined,
  }
}

function definitionForField(
  field: TodoRuleFormField,
  labels: TodoRuleGeneratedLabels,
): GeneratedFieldDefinition {
  const preservedDefinition = preservedDefinitionForField(field)
  if (preservedDefinition) return preservedDefinition

  const title = field.label.trim()
  let definition: GeneratedFieldDefinition

  switch (field.type) {
    case "textarea":
      definition = {
        schema: { type: "string", title },
        uiSchema: { "ui:widget": "textarea" },
      }
      break
    case "email":
      definition = {
        schema: { type: "string", format: "email", title },
      }
      break
    case "url":
      definition = {
        schema: { type: "string", format: "uri", title },
      }
      break
    case "color":
      definition = {
        schema: { type: "string", format: "color", title },
        uiSchema: { "ui:widget": "color" },
      }
      break
    case "date":
      definition = {
        schema: { type: "string", format: "date", title },
      }
      break
    case "time":
      definition = {
        schema: { type: "string", format: "time", title },
      }
      break
    case "datetime":
      definition = {
        schema: { type: "string", format: "date-time", title },
      }
      break
    case "number":
      definition = { schema: { type: "number", title } }
      break
    case "integer":
      definition = { schema: { type: "integer", title } }
      break
    case "range":
      definition = {
        schema: {
          type: "number",
          title,
          minimum: 0,
          maximum: 100,
        },
        uiSchema: { "ui:widget": "range" },
      }
      break
    case "rating":
      definition = {
        schema: {
          type: "integer",
          title,
          minimum: 1,
          maximum: 5,
        },
        uiSchema: { "ui:widget": "RatingWidget" },
      }
      break
    case "boolean":
      definition = { schema: { type: "boolean", title } }
      break
    case "select":
      definition = {
        schema: {
          type: "string",
          title,
          oneOf: choiceSchemas(field),
        },
        uiSchema: { "ui:widget": "select" },
      }
      break
    case "radio":
      definition = {
        schema: {
          type: "string",
          title,
          oneOf: choiceSchemas(field),
        },
        uiSchema: { "ui:widget": "radio" },
      }
      break
    case "multiselect":
      definition = {
        schema: {
          type: "array",
          title,
          uniqueItems: true,
          items: {
            type: "string",
            oneOf: choiceSchemas(field),
          },
        },
        uiSchema: { "ui:widget": "select" },
      }
      break
    case "checkboxes":
      definition = {
        schema: {
          type: "array",
          title,
          uniqueItems: true,
          items: {
            type: "string",
            oneOf: choiceSchemas(field),
          },
        },
        uiSchema: { "ui:widget": "checkboxes" },
      }
      break
    case "checklist":
      definition = {
        schema: {
          type: "array",
          title,
          default: [],
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                title: labels.checklistItem,
                minLength: 1,
              },
              completed: {
                type: "boolean",
                title: labels.checklistCompleted,
                default: false,
              },
            },
            required: ["text", "completed"],
            additionalProperties: false,
          },
        },
        uiSchema: {
          "ui:options": {
            addable: true,
            copyable: true,
            orderable: true,
            removable: true,
          },
          items: {
            text: {
              "ui:placeholder": labels.checklistItemPlaceholder,
            },
            completed: {
              "ui:widget": "checkbox",
            },
          },
        },
      }
      break
    case "textList":
      definition = {
        schema: {
          type: "array",
          title,
          items: { type: "string" },
        },
      }
      break
    case "numberList":
      definition = {
        schema: {
          type: "array",
          title,
          items: { type: "number" },
        },
      }
      break
    case "text":
      definition = { schema: { type: "string", title } }
      break
    case "custom":
      throw new Error(
        "Custom fields require a preserved original definition",
      )
  }

  return definition
}

export function createTodoRuleDefinition(
  ruleName: string,
  fields: TodoRuleFormField[],
  labels: TodoRuleGeneratedLabels,
  originalDefinition?: TodoRuleFormInitialValue["originalDefinition"],
) {
  const properties: Record<string, RJSFSchema> = {}
  const required: string[] = []
  const contentSchema: RJSFSchema = originalDefinition
    ? structuredClone(originalDefinition.contentSchema)
    : {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {},
        additionalProperties: false,
      }
  const uiSchema: UiSchema = originalDefinition
    ? structuredClone(originalDefinition.uiSchema)
    : {}

  if (
    typeof contentSchema.properties === "object" &&
    contentSchema.properties !== null &&
    !Array.isArray(contentSchema.properties)
  ) {
    for (const propertyName of Object.keys(contentSchema.properties)) {
      delete uiSchema[propertyName]
    }
  }

  uiSchema["ui:order"] = fields.map((field) => field.propertyName)

  for (const field of fields) {
    const definition = definitionForField(field, labels)
    properties[field.propertyName] = definition.schema

    if (definition.uiSchema) {
      uiSchema[field.propertyName] = definition.uiSchema
    }

    if (field.required) {
      required.push(field.propertyName)
    }
  }

  contentSchema.title = ruleName.trim()
  contentSchema.type = "object"
  contentSchema.properties = properties
  contentSchema.additionalProperties = false

  if (required.length > 0) {
    contentSchema.required = required
  } else {
    delete contentSchema.required
  }

  return { contentSchema, uiSchema }
}

export function summarizeTodoRuleFields(
  rule: TodoRuleDetail,
): TodoRuleFieldSummary[] {
  const properties = getPropertySchemas(rule.content_schema)
  const orderedNames = getOrderedPropertyNames(
    rule.content_schema,
    rule.ui_schema,
  )
  const required = new Set(
    Array.isArray(rule.content_schema.required)
      ? rule.content_schema.required
      : [],
  )

  return orderedNames.map((name) => {
    const schema = properties[name]
    const items = getItemSchema(schema)
    const choices =
      schema.type === "array" && items
        ? getChoiceValues(items)
        : getChoiceValues(schema)

    return {
      name,
      label:
        typeof schema.title === "string" && schema.title.trim()
          ? schema.title
          : name,
      type: getTodoRuleFieldType(
        schema,
        getPropertyWidget(rule.ui_schema, name),
      ),
      required: required.has(name),
      choiceCount: choices.length,
    }
  })
}
