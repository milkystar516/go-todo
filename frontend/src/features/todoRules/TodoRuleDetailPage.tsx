import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"

import type { TodoRuleDetail } from "../../api/types"
import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { Button } from "#components/ui/button"
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
import { Skeleton } from "#components/ui/skeleton"
import { TodoRulePreview } from "./components/TodoRulePreview"
import {
  getChoiceValues,
  getItemSchema,
  getPropertySchemas,
  isSchemaObject,
} from "./lib/schema"
import { todoRuleQueryOptions } from "./queries"

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

function fieldSummaries(rule: TodoRuleDetail): FieldSummary[] {
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
    const choices =
      schema.type === "array" && getItemSchema(schema)
        ? getChoiceValues(getItemSchema(schema)!)
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

export function TodoRuleDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { ruleId: ruleIdParam } = useParams()
  const ruleId = Number(ruleIdParam)
  const hasValidRuleId = Number.isSafeInteger(ruleId) && ruleId > 0
  const todoRuleQuery = useQuery({
    ...todoRuleQueryOptions(ruleId),
    enabled: hasValidRuleId,
  })

  function returnToAdmin() {
    navigate("/admin")
  }

  if (!hasValidRuleId) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToAdmin} />}
          title={t("admin.todoRules.detail.invalidTitle")}
          description={t("admin.todoRules.detail.invalidDescription")}
        />
      </AppPage>
    )
  }

  if (todoRuleQuery.isPending) {
    return <TodoRuleDetailSkeleton onBack={returnToAdmin} />
  }

  if (todoRuleQuery.isError) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToAdmin} />}
          title={t("admin.todoRules.detail.loadFailed")}
          description={getErrorMessage(
            todoRuleQuery.error,
            t("common.requestFailed"),
          )}
        />
      </AppPage>
    )
  }

  return (
    <TodoRuleDetailContent
      rule={todoRuleQuery.data}
      onBack={returnToAdmin}
    />
  )
}

interface TodoRuleDetailContentProps {
  rule: TodoRuleDetail
  onBack: () => void
}

function TodoRuleDetailContent({
  rule,
  onBack,
}: TodoRuleDetailContentProps) {
  const { t } = useTranslation()
  const fields = useMemo(() => fieldSummaries(rule), [rule])

  return (
    <AppPage size="wide">
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={rule.rule_name}
        description={t("admin.todoRules.detail.description")}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
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

        <TodoRulePreview rule={rule} />
      </div>
    </AppPage>
  )
}

interface BackButtonProps {
  onClick: () => void
}

function BackButton({ onClick }: BackButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={onClick}
    >
      <ArrowLeft />
      {t("admin.todoRules.detail.back")}
    </Button>
  )
}

function TodoRuleDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <AppPage size="wide">
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={<Skeleton className="h-8 w-48" />}
        description={<Skeleton className="h-4 w-72" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <Skeleton key={itemIndex} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppPage>
  )
}
