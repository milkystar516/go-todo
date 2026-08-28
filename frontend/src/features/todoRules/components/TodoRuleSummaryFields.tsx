import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { TodoRuleDetail } from "../../../api/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "#components/ui/item"
import {
  getChoiceValues,
  getItemSchema,
  getPropertySchemas,
  isSchemaObject,
} from "../lib/schema"

type FieldTypeKey =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "color"
  | "date"
  | "time"
  | "datetime"
  | "number"
  | "integer"
  | "range"
  | "rating"
  | "boolean"
  | "select"
  | "radio"
  | "multiselect"
  | "checkboxes"
  | "textList"
  | "numberList"
  | "custom"

interface FieldSummary {
  name: string
  label: string
  type: FieldTypeKey
  required: boolean
  choiceCount: number
}

interface TodoRuleSummaryFieldsProps {
  rule: TodoRuleDetail
}

function widgetForProperty(uiSchema: UiSchema, name: string) {
  const propertyUiSchema = uiSchema[name]
  if (!isSchemaObject(propertyUiSchema)) {
    return undefined
  }

  const widget = propertyUiSchema["ui:widget"]
  return typeof widget === "string" ? widget : undefined
}

function fieldType(schema: RJSFSchema, widget?: string): FieldTypeKey {
  if (widget === "RatingWidget") return "rating"
  if (widget === "range") return "range"
  if (widget === "textarea") return "textarea"
  if (widget === "radio") return "radio"
  if (widget === "checkboxes") return "checkboxes"

  if (schema.type === "array") {
    const items = getItemSchema(schema)

    if (items && getChoiceValues(items).length > 0) {
      return "multiselect"
    }

    return items?.type === "number" || items?.type === "integer"
      ? "numberList"
      : "textList"
  }

  if (getChoiceValues(schema).length > 0) return "select"
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
    return "text"
  }

  return "custom"
}

function summarizeFields(rule: TodoRuleDetail): FieldSummary[] {
  const properties = getPropertySchemas(rule.content_schema)
  const names = Object.keys(properties)
  const configuredOrder = rule.ui_schema["ui:order"]
  const orderedNames = Array.isArray(configuredOrder)
    ? [
        ...configuredOrder.filter(
          (name): name is string =>
            typeof name === "string" && name !== "*" && name in properties,
        ),
        ...names.filter((name) => !configuredOrder.includes(name)),
      ]
    : names
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
      type: fieldType(schema, widgetForProperty(rule.ui_schema, name)),
      required: required.has(name),
      choiceCount: choices.length,
    }
  })
}

export function TodoRuleSummaryFields({
  rule,
}: TodoRuleSummaryFieldsProps) {
  const { t } = useTranslation()
  const fields = useMemo(() => summarizeFields(rule), [rule])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.todoRules.detail.fieldsTitle")}</CardTitle>
        <CardDescription>
          {t("admin.todoRules.detail.fieldsCount", {
            count: fields.length,
          })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {fields.length > 0 ? (
          <ItemGroup>
            {fields.map((field) => (
              <Item key={field.name} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{field.label}</ItemTitle>
                  <ItemDescription>
                    {[
                      t(`admin.todoRules.form.types.${field.type}`),
                      field.required
                        ? t("admin.todoRules.detail.required")
                        : null,
                      field.choiceCount > 0
                        ? t("admin.todoRules.detail.choiceCount", {
                            count: field.choiceCount,
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("admin.todoRules.detail.noFields")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
