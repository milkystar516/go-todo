import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { Minus, Plus } from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { useTranslation } from "react-i18next"

import type { TodoRuleWriteInput } from "../../../api/todoRules"
import type {
  Todo,
  TodoRuleDetail,
} from "../../../api/types"
import { TodoItem } from "../../todos/components/TodoItem"
import { Button } from "#components/ui/button"
import { ButtonGroup } from "#components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Checkbox } from "#components/ui/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "#components/ui/item"
import { Spinner } from "#components/ui/spinner"

const todoRuleFieldTypes = [
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
  "textList",
  "numberList",
] as const

export type TodoRuleFieldType =
  (typeof todoRuleFieldTypes)[number]

export interface TodoRuleChoice {
  id: string
  value: string
  label: string
}

export interface TodoRuleFormField {
  id: string
  propertyName: string
  label: string
  type: TodoRuleFieldType
  required: boolean
  choices: TodoRuleChoice[]
}

export interface TodoRuleFormInitialValue {
  ruleName: string
  fields: TodoRuleFormField[]
}

interface TodoRuleFormProps {
  initialValue?: TodoRuleFormInitialValue
  isPending?: boolean
  errorMessage?: string | null
  submitLabel?: string
  onSubmit: (
    input: TodoRuleWriteInput,
  ) => void | Promise<void>
  onCancel?: () => void
}

const choiceFieldTypes = new Set<TodoRuleFieldType>([
  "select",
  "radio",
  "multiselect",
  "checkboxes",
])

function isChoiceField(type: TodoRuleFieldType) {
  return choiceFieldTypes.has(type)
}

function createChoice(): TodoRuleChoice {
  const id = crypto.randomUUID()

  return {
    id,
    value: `choice_${id.replaceAll("-", "")}`,
    label: "",
  }
}

function createField(): TodoRuleFormField {
  const id = crypto.randomUUID()

  return {
    id,
    propertyName: `field_${id.replaceAll("-", "")}`,
    label: "",
    type: "text",
    required: false,
    choices: [],
  }
}

function createInitialFields(
  initialValue?: TodoRuleFormInitialValue,
) {
  return initialValue?.fields.length
    ? initialValue.fields.map((field) => ({
        ...field,
        choices: field.choices.map((choice) => ({ ...choice })),
      }))
    : [createField()]
}

function choiceSchemas(field: TodoRuleFormField) {
  return field.choices.map((choice) => ({
    const: choice.value,
    title: choice.label.trim(),
  }))
}

interface GeneratedFieldDefinition {
  schema: RJSFSchema
  uiSchema?: UiSchema
}

function definitionForField(
  field: TodoRuleFormField,
): GeneratedFieldDefinition {
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
        schema: {
          type: "string",
          format: "date-time",
          title,
        },
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
  }

  if (field.required && definition.schema.type === "array") {
    definition.schema.minItems = 1
  }

  return definition
}

function createDefinition(
  ruleName: string,
  fields: TodoRuleFormField[],
) {
  const properties: Record<string, RJSFSchema> = {}
  const required: string[] = []
  const uiSchema: UiSchema = {
    "ui:order": fields.map((field) => field.propertyName),
  }

  for (const field of fields) {
    const definition = definitionForField(field)
    properties[field.propertyName] = definition.schema

    if (definition.uiSchema) {
      uiSchema[field.propertyName] = definition.uiSchema
    }

    if (field.required) {
      required.push(field.propertyName)
    }
  }

  const contentSchema: RJSFSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: ruleName.trim(),
    type: "object",
    properties,
    additionalProperties: false,
  }

  if (required.length > 0) {
    contentSchema.required = required
  }

  return { contentSchema, uiSchema }
}

function sampleValue(
  field: TodoRuleFormField,
  exampleText: string,
): unknown {
  switch (field.type) {
    case "email":
      return "user@example.com"
    case "url":
      return "https://example.com"
    case "color":
      return "#3b82f6"
    case "date":
      return "2026-08-27"
    case "time":
      return "09:00:00"
    case "datetime":
      return "2026-08-27T09:00:00.000Z"
    case "number":
      return 12.5
    case "integer":
      return 3
    case "range":
      return 50
    case "rating":
      return 4
    case "boolean":
      return true
    case "select":
    case "radio":
      return field.choices[0]?.value
    case "multiselect":
    case "checkboxes":
      return field.choices.slice(0, 2).map((choice) => choice.value)
    case "textList":
      return ["First item", "Second item"]
    case "numberList":
      return [1, 2]
    case "textarea":
      return "Example description"
    case "text":
      return exampleText
  }
}

function createPreviewContent(
  fields: TodoRuleFormField[],
  exampleText: string,
) {
  return Object.fromEntries(
    fields.flatMap((field) => {
      const value = sampleValue(field, exampleText)
      return value === undefined
        ? []
        : [[field.propertyName, value] as const]
    }),
  )
}

async function ignoreTodoUpdate() {}
async function ignoreTodoDelete() {}

export function TodoRuleForm({
  initialValue,
  isPending = false,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoRuleFormProps) {
  const { t } = useTranslation()
  const [ruleName, setRuleName] = useState(
    initialValue?.ruleName ?? "",
  )
  const [fields, setFields] = useState(() =>
    createInitialFields(initialValue),
  )
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setRuleName(initialValue?.ruleName ?? "")
    setFields(createInitialFields(initialValue))
    setFormError(null)
  }, [initialValue])

  const preview = useMemo(() => {
    const previewFields = fields.map((field, fieldIndex) => ({
      ...field,
      label:
        field.label.trim() ||
        t("admin.todoRules.form.fieldNumber", {
          number: fieldIndex + 1,
        }),
      choices: field.choices.map((choice, choiceIndex) => ({
        ...choice,
        label:
          choice.label.trim() ||
          t("admin.todoRules.form.choicePlaceholder", {
            number: choiceIndex + 1,
          }),
      })),
    }))
    const definition = createDefinition(ruleName, previewFields)
    const rule: TodoRuleDetail = {
      id: 0,
      rule_name: ruleName,
      content_schema: definition.contentSchema,
      ui_schema: definition.uiSchema,
      list_columns: [],
    }
    const todo: Todo = {
      id: 0,
      owner_id: 0,
      list_id: "preview",
      rule_id: 0,
      title: t("admin.todoRules.form.todoExampleTitle"),
      due_at: null,
      content: createPreviewContent(
        previewFields,
        t("admin.todoRules.form.exampleText"),
      ),
      created_at: "2026-08-27T00:00:00.000Z",
      completed_at: null,
    }

    return {
      key: JSON.stringify([
        definition.contentSchema,
        definition.uiSchema,
      ]),
      rule,
      todo,
    }
  }, [fields, ruleName, t])

  function updateField(
    fieldId: string,
    update: Partial<
      Pick<TodoRuleFormField, "label" | "required">
    >,
  ) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId ? { ...field, ...update } : field,
      ),
    )
    setFormError(null)
  }

  function updateFieldType(
    fieldId: string,
    type: TodoRuleFieldType,
  ) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field
        }

        return {
          ...field,
          type,
          choices:
            isChoiceField(type) && field.choices.length === 0
              ? [createChoice(), createChoice()]
              : field.choices,
        }
      }),
    )
    setFormError(null)
  }

  function addChoice(fieldId: string) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              choices: [...field.choices, createChoice()],
            }
          : field,
      ),
    )
    setFormError(null)
  }

  function updateChoice(
    fieldId: string,
    choiceId: string,
    label: string,
  ) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              choices: field.choices.map((choice) =>
                choice.id === choiceId
                  ? { ...choice, label }
                  : choice,
              ),
            }
          : field,
      ),
    )
    setFormError(null)
  }

  function removeChoice(fieldId: string, choiceId: string) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              choices: field.choices.filter(
                (choice) => choice.id !== choiceId,
              ),
            }
          : field,
      ),
    )
    setFormError(null)
  }

  function removeField(fieldId: string) {
    setFields((currentFields) =>
      currentFields.length > 1
        ? currentFields.filter((field) => field.id !== fieldId)
        : currentFields,
    )
    setFormError(null)
  }

  function addField() {
    setFields((currentFields) => [
      ...currentFields,
      createField(),
    ])
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const normalizedRuleName = ruleName.trim()

    if (!normalizedRuleName) {
      setFormError(t("admin.todoRules.form.nameRequired"))
      return
    }

    if (fields.some((field) => !field.label.trim())) {
      setFormError(t("admin.todoRules.form.fieldLabelRequired"))
      return
    }

    const choiceFields = fields.filter((field) =>
      isChoiceField(field.type),
    )

    if (
      choiceFields.some(
        (field) =>
          field.choices.length === 0 ||
          field.choices.some((choice) => !choice.label.trim()),
      )
    ) {
      setFormError(t("admin.todoRules.form.choiceLabelRequired"))
      return
    }

    if (
      choiceFields.some((field) => {
        const labels = field.choices.map((choice) =>
          choice.label.trim(),
        )
        return new Set(labels).size !== labels.length
      })
    ) {
      setFormError(t("admin.todoRules.form.choiceLabelDuplicate"))
      return
    }

    const { contentSchema, uiSchema } = createDefinition(
      normalizedRuleName,
      fields,
    )

    try {
      await onSubmit({
        rule_name: normalizedRuleName,
        content_schema: contentSchema,
        ui_schema: uiSchema,
        list_columns: [],
      })
    } catch {
      // The owning mutation renders its error without losing form state.
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form id="todo-rule-definition-form" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.todoRules.form.definitionTitle")}
              </CardTitle>
              <CardDescription>
                {t(
                  "admin.todoRules.form.definitionDescription",
                )}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="todo-rule-name">
                    {t("admin.todoRules.form.name")}
                  </FieldLabel>
                  <Input
                    id="todo-rule-name"
                    value={ruleName}
                    onChange={(event) => {
                      setRuleName(event.target.value)
                      setFormError(null)
                    }}
                    maxLength={50}
                    disabled={isPending}
                    required
                  />
                </Field>

                <FieldSet disabled={isPending}>
                  <FieldLegend variant="label">
                    {t("admin.todoRules.form.fields")}
                  </FieldLegend>
                  <FieldDescription>
                    {t("admin.todoRules.form.fieldsDescription")}
                  </FieldDescription>

                  <ItemGroup>
                    {fields.map((field, index) => (
                      <TodoRuleFieldEditor
                        key={field.id}
                        field={field}
                        index={index}
                        disabled={isPending}
                        canRemove={fields.length > 1}
                        onChange={(update) =>
                          updateField(field.id, update)
                        }
                        onTypeChange={(type) =>
                          updateFieldType(field.id, type)
                        }
                        onAddChoice={() => addChoice(field.id)}
                        onChoiceChange={(choiceId, label) =>
                          updateChoice(field.id, choiceId, label)
                        }
                        onRemoveChoice={(choiceId) =>
                          removeChoice(field.id, choiceId)
                        }
                        onRemove={() => removeField(field.id)}
                      />
                    ))}
                  </ItemGroup>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addField}
                    disabled={isPending}
                  >
                    <Plus />
                    {t("admin.todoRules.form.addField")}
                  </Button>
                </FieldSet>
              </FieldGroup>
            </CardContent>
          </Card>
        </form>

        <Card className="xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>
              {t("admin.todoRules.form.todoExample")}
            </CardTitle>
            <CardDescription>
              {t("admin.todoRules.form.todoExampleDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <TodoItem
              key={preview.key}
              todo={preview.todo}
              rule={preview.rule}
              metadata={[]}
              canManage={false}
              defaultOpen
              showTitleInput={false}
              onToggleCompleted={() => {}}
              onUpdate={ignoreTodoUpdate}
              onDelete={ignoreTodoDelete}
            />
          </CardContent>
        </Card>
      </div>

      {(formError || errorMessage) && (
        <FieldError>{formError ?? errorMessage}</FieldError>
      )}

      <ItemActions className="justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
        )}

        <Button
          type="submit"
          form="todo-rule-definition-form"
          disabled={isPending}
        >
          {isPending && <Spinner aria-hidden="true" />}
          {submitLabel ?? t("common.save")}
        </Button>
      </ItemActions>
    </div>
  )
}

interface TodoRuleFieldEditorProps {
  field: TodoRuleFormField
  index: number
  disabled: boolean
  canRemove: boolean
  onChange: (
    update: Partial<
      Pick<TodoRuleFormField, "label" | "required">
    >,
  ) => void
  onTypeChange: (type: TodoRuleFieldType) => void
  onAddChoice: () => void
  onChoiceChange: (choiceId: string, label: string) => void
  onRemoveChoice: (choiceId: string) => void
  onRemove: () => void
}

function TodoRuleFieldEditor({
  field,
  index,
  disabled,
  canRemove,
  onChange,
  onTypeChange,
  onAddChoice,
  onChoiceChange,
  onRemoveChoice,
  onRemove,
}: TodoRuleFieldEditorProps) {
  const { t } = useTranslation()
  const labelInputId = `todo-rule-field-label-${field.id}`
  const typeInputId = `todo-rule-field-type-${field.id}`
  const requiredInputId = `todo-rule-field-required-${field.id}`
  const fieldTypeItems = todoRuleFieldTypes.map((type) => ({
    value: type,
    label: t(`admin.todoRules.form.types.${type}`),
  }))
  const selectedFieldType = fieldTypeItems.find(
    (item) => item.value === field.type,
  )

  return (
    <Item role="listitem" variant="outline">
      <ItemHeader>
        <ItemTitle>
          {t("admin.todoRules.form.fieldNumber", {
            number: index + 1,
          })}
        </ItemTitle>

        <ItemActions>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("admin.todoRules.form.removeField", {
              number: index + 1,
            })}
            onClick={onRemove}
            disabled={disabled || !canRemove}
          >
            <Minus />
          </Button>
        </ItemActions>
      </ItemHeader>

      <ItemContent className="basis-full gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={labelInputId}>
              {t("admin.todoRules.form.fieldLabel")}
            </FieldLabel>
            <Input
              id={labelInputId}
              value={field.label}
              placeholder={t(
                "admin.todoRules.form.fieldLabelPlaceholder",
              )}
              onChange={(event) =>
                onChange({ label: event.target.value })
              }
              disabled={disabled}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={typeInputId}>
              {t("admin.todoRules.form.fieldType")}
            </FieldLabel>
            <Combobox
              items={fieldTypeItems}
              value={selectedFieldType}
              onValueChange={(item) => {
                if (item) {
                  onTypeChange(item.value)
                }
              }}
              itemToStringValue={(item) => item.label}
              disabled={disabled}
            >
              <ComboboxInput
                id={typeInputId}
                className="w-full"
                placeholder={t(
                  "admin.todoRules.form.selectFieldType",
                )}
              />
              <ComboboxContent>
                <ComboboxEmpty>
                  {t("admin.todoRules.form.noFieldType")}
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id={requiredInputId}
              checked={field.required}
              onCheckedChange={(checked) =>
                onChange({ required: checked === true })
              }
              disabled={disabled}
            />
            <FieldLabel htmlFor={requiredInputId}>
              {t("admin.todoRules.form.required")}
            </FieldLabel>
          </Field>
        </FieldGroup>

        {isChoiceField(field.type) && (
          <>
            <FieldSeparator />

            <FieldSet disabled={disabled}>
              <FieldLegend variant="label">
                {t("admin.todoRules.form.choices")}
              </FieldLegend>

              <FieldGroup>
                {field.choices.map((choice, choiceIndex) => (
                  <Field key={choice.id}>
                    <ButtonGroup
                      className="w-full"
                      aria-label={t(
                        "admin.todoRules.form.choiceLabel",
                        { number: choiceIndex + 1 },
                      )}
                    >
                      <Input
                        value={choice.label}
                        placeholder={t(
                          "admin.todoRules.form.choicePlaceholder",
                          { number: choiceIndex + 1 },
                        )}
                        aria-label={t(
                          "admin.todoRules.form.choiceLabel",
                          { number: choiceIndex + 1 },
                        )}
                        onChange={(event) =>
                          onChoiceChange(
                            choice.id,
                            event.target.value,
                          )
                        }
                        disabled={disabled}
                        required
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t(
                          "admin.todoRules.form.removeChoice",
                          { number: choiceIndex + 1 },
                        )}
                        onClick={() =>
                          onRemoveChoice(choice.id)
                        }
                        disabled={disabled}
                      >
                        <Minus />
                      </Button>
                    </ButtonGroup>
                  </Field>
                ))}
              </FieldGroup>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddChoice}
                disabled={disabled}
              >
                <Plus />
                {t("admin.todoRules.form.addChoice")}
              </Button>
            </FieldSet>
          </>
        )}
      </ItemContent>
    </Item>
  )
}
