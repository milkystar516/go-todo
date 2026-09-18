import {
  getUiOptions,
  isMultiSelect,
  isSelect,
  optionsList,
  orderProperties,
  type RJSFSchema,
  type UiSchema,
} from "@rjsf/utils"

import type { TodoRuleDetail } from "../../../api/types"
import {
  getPropertyUiSchema,
} from "./schema"
import { rjsfValidator } from "../../../lib/schema/rjsfValidator"
import {
  isSchemaObject,
  getPropertySchemas,
  getItemSchema,
  isChecklistSchema,
} from "../../../lib/schema/todoContentSchema"

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

interface TodoRuleOriginalFieldDefinition {
  type: TodoRuleFieldType
  schema: RJSFSchema
  uiSchema?: UiSchema
  required: boolean
}

export interface TodoRuleFormField {
  id: string
  label: string
  type: TodoRuleFieldType
  required: boolean
  choices: string[]
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

function getTodoRuleFieldType(
  schema: RJSFSchema,
  widget?: string,
): TodoRuleFieldType {
  switch (widget) {
    case "RatingWidget":
      return schema.type === "integer" ? "rating" : "custom"
    case "range":
      return schema.type === "number" ? "range" : "custom"
    case "textarea":
      return schema.type === "string" ? "textarea" : "custom"
  }

  switch (schema.type) {
    case "array": {
      if (isChecklistSchema(schema)) {
        return "checklist"
      }

      const items = getItemSchema(schema)
      if (!items) {
        return "custom"
      }

      if (isMultiSelect(rjsfValidator, schema)) {
        const options = optionsList(items)
        if (
          !options ||
          options.some((option) => typeof option.value !== "string")
        ) {
          return "custom"
        }

        switch (widget) {
          case "checkboxes":
            return "checkboxes"
          case "select":
            return "multiselect"
          default:
            return "custom"
        }
      }

      switch (items.type) {
        case "string":
          return "textList"
        case "number":
        case "integer":
          return "numberList"
        default:
          return "custom"
      }
    }

    default:
      if (isSelect(rjsfValidator, schema)) {
        const options = optionsList(schema)
        if (
          !options ||
          options.some((option) => typeof option.value !== "string")
        ) {
          return "custom"
        }

        switch (widget) {
          case "radio":
            return "radio"
          case undefined:
          case "select":
            return "select"
          default:
            return "custom"
        }
      }
  }

  switch (schema.type) {
    case "boolean":
      return "boolean"

    case "number":
      return "number"

    case "integer":
      return "integer"

    case "string":
      switch (schema.format) {
        case "email":
          return "email"
        case "uri":
          return "url"
        case "color":
          return "color"
        case "date":
          return "date"
        case "time":
          return "time"
        case "date-time":
          return "datetime"
        case undefined:
          return "text"
        default:
          return "custom"
      }

    default:
      return "custom"
  }
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
  const orderedPropertyNames = orderProperties(
    Object.keys(properties),
    getUiOptions(rule.ui_schema).order,
  )

  for (const fieldId of orderedPropertyNames) {
    const schema = properties[fieldId]
    const propertyUiSchema = getPropertyUiSchema(
      rule.ui_schema,
      fieldId,
    )
    const widget = getUiOptions(propertyUiSchema).widget
    const type = getTodoRuleFieldType(
      schema,
      typeof widget === "string" ? widget : undefined,
    )

    const choiceSchema =
      schema.type === "array" ? getItemSchema(schema) : schema
    const options =
      isChoiceField(type) && choiceSchema
        ? optionsList(choiceSchema)
        : undefined

    if (
      isChoiceField(type) &&
      (!options ||
        options.some((option) => typeof option.value !== "string"))
    ) {
      return null
    }

    const choices =
      options?.map((option) => option.value as string) ?? []

    fields.push({
      id: fieldId,
      label:
        typeof schema.title === "string" && schema.title.trim()
          ? schema.title
          : fieldId,
      type,
      required: required.has(fieldId),
      choices,
      originalDefinition: {
        type,
        schema: structuredClone(schema),
        uiSchema: propertyUiSchema,
        required: required.has(fieldId),
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

function choiceValues(field: TodoRuleFormField) {
  return field.choices.map((choice) => choice.trim())
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

  delete choiceSchema.oneOf
  delete choiceSchema.anyOf
  choiceSchema.enum = choiceValues(field)
}

function preservedDefinitionForField(
  field: TodoRuleFormField,
): GeneratedFieldDefinition | null {
  const original = field.originalDefinition
  if (!original || original.type !== field.type) return null

  const schema = structuredClone(original.schema)
  const uiSchema = original.uiSchema
    ? structuredClone(original.uiSchema)
    : undefined

  schema.title = field.label.trim()

  if (isChoiceField(field.type)) {
    applyChoices(schema, field)
  }

  if (field.type === "checklist" && uiSchema) {
    const uiOptions = uiSchema["ui:options"]

    if (
      typeof uiOptions === "object" &&
      uiOptions !== null &&
      !Array.isArray(uiOptions)
    ) {
      delete (uiOptions as Record<string, unknown>).copyable
    }
  }

  return {
    schema,
    uiSchema,
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
          enum: choiceValues(field),
        },
        uiSchema: { "ui:widget": "select" },
      }
      break

    case "radio":
      definition = {
        schema: {
          type: "string",
          title,
          enum: choiceValues(field),
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
            enum: choiceValues(field),
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
            enum: choiceValues(field),
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

  uiSchema["ui:order"] = fields.map((field) => field.id)

  for (const field of fields) {
    const definition = definitionForField(field, labels)

    properties[field.id] = definition.schema

    if (definition.uiSchema) {
      uiSchema[field.id] = definition.uiSchema
    }

    if (field.required) {
      required.push(field.id)
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
  const orderedNames = orderProperties(
    Object.keys(properties),
    getUiOptions(rule.ui_schema).order,
  )
  const required = new Set(
    Array.isArray(rule.content_schema.required)
      ? rule.content_schema.required
      : [],
  )

  return orderedNames.map((name) => {
    const schema = properties[name]
    const items = getItemSchema(schema)
    const propertyUiSchema = getPropertyUiSchema(
      rule.ui_schema,
      name,
    )
    const widget = getUiOptions(propertyUiSchema).widget
    const choiceSchema =
      schema.type === "array" && items ? items : schema
    const choices = optionsList(choiceSchema) ?? []

    return {
      name,
      label:
        typeof schema.title === "string" && schema.title.trim()
          ? schema.title
          : name,
      type: getTodoRuleFieldType(
        schema,
        typeof widget === "string" ? widget : undefined,
      ),
      required: required.has(name),
      choiceCount: choices.length,
    }
  })
}