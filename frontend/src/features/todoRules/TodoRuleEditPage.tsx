import type { RJSFSchema } from "@rjsf/utils"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router"

import type { TodoRuleWriteInput } from "../../api/todoRules"
import type { TodoRuleDetail } from "../../api/types"
import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { getErrorMessage } from "../../lib/apiError"
import { Button } from "#components/ui/button"
import { Skeleton } from "#components/ui/skeleton"
import {
  TodoRuleForm,
  type TodoRuleChoice,
  type TodoRuleFieldType,
  type TodoRuleFormInitialValue,
  type TodoRuleOriginalFieldDefinition,
} from "./components/TodoRuleForm"
import {
  getItemSchema,
  getOrderedPropertyNames,
  getPropertySchemas,
  getPropertyUiSchema,
  getPropertyWidget,
  isChecklistSchema,
  isSchemaObject,
} from "./lib/schema"
import {
  todoRuleQueryOptions,
  updateTodoRuleMutationOptions,
} from "./queries"

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
        id: crypto.randomUUID(),
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

    return schema.enum.map((value) => ({
      id: crypto.randomUUID(),
      value,
      label: value,
    }))
  }

  return []
}

function hasChoiceDefinition(schema: RJSFSchema) {
  return Array.isArray(schema.oneOf) || Array.isArray(schema.enum)
}

function editableFieldType(
  schema: RJSFSchema,
  widget?: string,
): TodoRuleFieldType | null {
  if (widget === "RatingWidget" && schema.type === "integer") {
    return "rating"
  }
  if (widget === "range" && schema.type === "number") return "range"
  if (widget === "textarea" && schema.type === "string") {
    return "textarea"
  }

  if (schema.type === "array") {
    if (isChecklistSchema(schema)) return "checklist"

    const items = getItemSchema(schema)
    if (!items) return null

    const choices = choicesForSchema(items)
    if (choices === null) return null
    if (hasChoiceDefinition(items)) {
      if (widget === "checkboxes") return "checkboxes"
      if (widget === "select") return "multiselect"
      return null
    }

    if (items.type === "string") return "textList"
    if (items.type === "number") return "numberList"
    return null
  }

  const choices = choicesForSchema(schema)
  if (choices === null) return null
  if (hasChoiceDefinition(schema)) {
    if (widget === "radio") return "radio"
    if (!widget || widget === "select") return "select"
    return null
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

  return null
}

function createInitialValue(
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
  const fields: TodoRuleFormInitialValue["fields"] = []

  for (const propertyName of getOrderedPropertyNames(
    rule.content_schema,
    rule.ui_schema,
  )) {
    const schema = properties[propertyName]
    const type =
      editableFieldType(
        schema,
        getPropertyWidget(rule.ui_schema, propertyName),
      ) ?? "custom"
    const choiceSchema = schema.type === "array"
      ? getItemSchema(schema)
      : schema
    const choices =
      type !== "custom" && choiceSchema
        ? choicesForSchema(choiceSchema)
        : []

    if (choices === null) return null

    const originalDefinition: TodoRuleOriginalFieldDefinition = {
      type,
      schema: structuredClone(schema),
      uiSchema: getPropertyUiSchema(rule.ui_schema, propertyName),
      required: required.has(propertyName),
    }

    fields.push({
      id: crypto.randomUUID(),
      propertyName,
      label:
        typeof schema.title === "string" && schema.title.trim()
          ? schema.title
          : propertyName,
      type,
      required: required.has(propertyName),
      choices,
      originalDefinition,
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

export function TodoRuleEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { ruleId: ruleIdParam } = useParams()
  const ruleId = Number(ruleIdParam)
  const hasValidRuleId = Number.isSafeInteger(ruleId) && ruleId > 0
  const todoRuleQuery = useQuery({
    ...todoRuleQueryOptions(ruleId),
    enabled: hasValidRuleId,
  })

  function returnToDetail() {
    navigate(`/admin/todo-rules/${ruleId}`)
  }

  if (!hasValidRuleId) {
    return (
      <AppPage>
        <PageHeader
          title={t("admin.todoRules.detail.invalidTitle")}
          description={t("admin.todoRules.detail.invalidDescription")}
        />
      </AppPage>
    )
  }

  if (todoRuleQuery.isPending) {
    return (
      <AppPage size="wide">
        <PageHeader
          leading={<BackButton onClick={returnToDetail} />}
          title={<Skeleton className="h-8 w-56" />}
          description={<Skeleton className="h-4 w-80" />}
        />
        <Skeleton className="h-96 w-full" />
      </AppPage>
    )
  }

  if (todoRuleQuery.isError) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToDetail} />}
          title={t("admin.todoRules.detail.loadFailed")}
          description={getErrorMessage(
            todoRuleQuery.error,
            t("common.requestFailed"),
          )}
        />
      </AppPage>
    )
  }

  return <TodoRuleEditContent rule={todoRuleQuery.data} />
}

function TodoRuleEditContent({ rule }: { rule: TodoRuleDetail }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const initialValue = useMemo(() => createInitialValue(rule), [rule])
  const updateMutation = useMutation(
    updateTodoRuleMutationOptions(queryClient),
  )

  function returnToDetail() {
    navigate(`/admin/todo-rules/${rule.id}`)
  }

  async function handleUpdate(input: TodoRuleWriteInput) {
    await updateMutation.mutateAsync({
      ruleId: rule.id,
      input: {
        ...input,
        list_columns: rule.list_columns,
      },
    })
    navigate(`/admin/todo-rules/${rule.id}`, { replace: true })
  }

  if (!initialValue) {
    return (
      <AppPage>
        <PageHeader
          leading={<BackButton onClick={returnToDetail} />}
          title={t("admin.todoRules.edit.unsupportedTitle")}
          description={t("admin.todoRules.edit.unsupportedDescription")}
        />
      </AppPage>
    )
  }

  return (
    <AppPage size="wide">
      <PageHeader
        leading={<BackButton onClick={returnToDetail} />}
        title={t("admin.todoRules.edit.title")}
        description={t(
          "admin.todoRules.edit.description",
        )}
      />

      <TodoRuleForm
        initialValue={initialValue}
        isPending={updateMutation.isPending}
        errorMessage={
          updateMutation.isError
            ? getErrorMessage(
                updateMutation.error,
                t("common.requestFailed"),
              )
            : null
        }
        submitLabel={t("admin.todoRules.edit.submit")}
        onSubmit={handleUpdate}
        onCancel={returnToDetail}
      />
    </AppPage>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
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
      {t("admin.todoRules.edit.back")}
    </Button>
  )
}
