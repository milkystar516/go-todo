import { Minus, Plus } from "lucide-react"
import { useMemo, useState, type SubmitEvent } from "react"
import { useTranslation } from "react-i18next"

import type { TodoRuleWriteInput } from "../../../api/todoRules"
import type { TodoRuleSchema } from "../../../api/types"
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
} from "#components/ui/item"
import { Spinner } from "#components/ui/spinner"
import {
  createTodoRuleDefinition,
  isChoiceField,
  todoRuleFieldTypes,
  type TodoRuleFieldType,
  type TodoRuleFormField,
  type TodoRuleFormInitialValue,
} from "../lib/fieldDefinitions"
import { TodoRulePreview } from "./TodoRulePreview"

interface TodoRuleFormProps {
  initialValue?: TodoRuleFormInitialValue
  isPending?: boolean
  errorMessage?: string | null
  submitLabel?: string
  onSubmit: (input: TodoRuleWriteInput) => void
  onCancel?: () => void
}

interface TodoRuleEditorChoice {
  id: string
  value: string
  canChangeValue: boolean
}

type TodoRuleEditorField = Omit<TodoRuleFormField, "choices"> & {
  choices: TodoRuleEditorChoice[]
  canChangeType: boolean
}

interface TodoRuleFieldEditorProps {
  field: TodoRuleEditorField
  disabled: boolean
  onChange: (
    update: Partial<Pick<TodoRuleFormField, "label" | "required">>,
  ) => void
  onTypeChange?: (type: TodoRuleFieldType) => void
  onAddChoice: () => void
  onChoiceChange: (choiceId: string, value: string) => void
  onRemoveChoice: (choiceId: string) => void
  onRemove: () => void
}

let nextEditorId = 0

function createEditorId() {
  nextEditorId += 1
  return `editor-${nextEditorId}`
}

function createChoice(): TodoRuleEditorChoice {
  return {
    id: createEditorId(),
    value: "",
    canChangeValue: true,
  }
}

function createField(): TodoRuleEditorField {
  return {
    id: createEditorId(),
    propertyName: "",
    label: "",
    type: "text",
    required: false,
    choices: [],
    canChangeType: true,
  }
}

function createInitialFields(
  initialValue?: TodoRuleFormInitialValue,
): TodoRuleEditorField[] {
  return (
    initialValue?.fields.map((field) => ({
      ...field,
      id: createEditorId(),
      choices: field.choices.map((value) => ({
        id: createEditorId(),
        value,
        canChangeValue: false,
      })),
      canChangeType: false,
    })) ?? []
  )
}

export function TodoRuleForm({
  initialValue,
  isPending = false,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoRuleFormProps) {
  const { t } = useTranslation()

  const generatedLabels = useMemo(
    () => ({
      checklistItem: t("admin.todoRules.form.checklist.item"),
      checklistCompleted: t("admin.todoRules.form.checklist.completed"),
      checklistItemPlaceholder: t(
        "admin.todoRules.form.checklist.itemPlaceholder",
      ),
    }),
    [t],
  )

  const [ruleName, setRuleName] = useState(initialValue?.ruleName ?? "")
  const [fields, setFields] = useState(() => createInitialFields(initialValue))
  const [formError, setFormError] = useState<string | null>(null)

  const previewRule = useMemo<TodoRuleSchema>(() => {
    const previewFields = fields.map((field) => {
      const label = field.label.trim()

      return {
        ...field,
        propertyName: field.propertyName.trim(),
        label,
        choices: field.choices.map(
          (choice, choiceIndex) =>
            choice.value.trim() ||
            t("admin.todoRules.form.choicePlaceholder", {
              number: choiceIndex + 1,
            }),
        ),
      }
    })

    const definition = createTodoRuleDefinition(
      ruleName,
      previewFields,
      generatedLabels,
      initialValue?.originalDefinition,
    )

    return {
      id: 0,
      content_schema: definition.contentSchema,
      ui_schema: definition.uiSchema,
    }
  }, [
    fields,
    generatedLabels,
    initialValue?.originalDefinition,
    ruleName,
    t,
  ])

  function updateField(
    fieldId: string,
    update: Partial<Pick<TodoRuleFormField, "label" | "required">>,
  ) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId) {
          return field
        }

        if (update.label === undefined) {
          return {
            ...field,
            ...update,
          }
        }

        return {
          ...field,
          ...update,
          propertyName: update.label,
        }
      }),
    )

    setFormError(null)
  }

  function updateFieldType(fieldId: string, type: TodoRuleFieldType) {
    setFields((currentFields) =>
      currentFields.map((field) => {
        if (field.id !== fieldId || !field.canChangeType) {
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

  function updateChoice(fieldId: string, choiceId: string, value: string) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              choices: field.choices.map((choice) =>
                choice.id === choiceId && choice.canChangeValue
                  ? {
                      ...choice,
                      value,
                    }
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
      currentFields.filter((field) => field.id !== fieldId),
    )

    setFormError(null)
  }

  function addField() {
    setFields((currentFields) => [...currentFields, createField()])
    setFormError(null)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (fields.length === 0) {
      return
    }

    const normalizedRuleName = ruleName.trim()

    if (!normalizedRuleName) {
      setFormError(t("admin.todoRules.form.nameRequired"))
      return
    }

    if (fields.some((field) => !field.label.trim())) {
      setFormError(t("admin.todoRules.form.fieldLabelRequired"))
      return
    }

    const propertyNames = fields.map((field) => field.propertyName.trim())

    if (new Set(propertyNames).size !== propertyNames.length) {
      setFormError(t("admin.todoRules.form.fieldLabelDuplicate"))
      return
    }

    const choiceFields = fields.filter((field) => isChoiceField(field.type))

    if (
      choiceFields.some(
        (field) =>
          field.choices.length === 0 ||
          field.choices.some((choice) => !choice.value.trim()),
      )
    ) {
      setFormError(t("admin.todoRules.form.choiceLabelRequired"))
      return
    }

    if (
      choiceFields.some((field) => {
        const values = field.choices.map((choice) => choice.value.trim())
        return new Set(values).size !== values.length
      })
    ) {
      setFormError(t("admin.todoRules.form.choiceLabelDuplicate"))
      return
    }

    const normalizedFields = fields.map((field) => {
      const label = field.label.trim()

      return {
        ...field,
        propertyName: field.propertyName.trim(),
        label,
        choices: field.choices.map((choice) => choice.value.trim()),
      }
    })

    const { contentSchema, uiSchema } = createTodoRuleDefinition(
      normalizedRuleName,
      normalizedFields,
      generatedLabels,
      initialValue?.originalDefinition,
    )

    onSubmit({
      rule_name: normalizedRuleName,
      content_schema: contentSchema,
      ui_schema: uiSchema,
      list_columns: [],
    })
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
                {t("admin.todoRules.form.definitionDescription")}
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
                    {fields.map((field) => (
                      <TodoRuleFieldEditor
                        key={field.id}
                        field={field}
                        disabled={isPending}
                        onChange={(update) => updateField(field.id, update)}
                        onTypeChange={
                          field.canChangeType
                            ? (type) => updateFieldType(field.id, type)
                            : undefined
                        }
                        onAddChoice={() => addChoice(field.id)}
                        onChoiceChange={(choiceId, value) =>
                          updateChoice(field.id, choiceId, value)
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

        <TodoRulePreview
          rule={previewRule}
          className="xl:sticky xl:top-4"
        />
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
          disabled={isPending || fields.length === 0}
        >
          {isPending && <Spinner aria-hidden="true" />}
          {submitLabel ?? t("common.save")}
        </Button>
      </ItemActions>
    </div>
  )
}

function TodoRuleFieldEditor({
  field,
  disabled,
  onChange,
  onTypeChange,
  onAddChoice,
  onChoiceChange,
  onRemoveChoice,
  onRemove,
}: TodoRuleFieldEditorProps) {
  const { t } = useTranslation()

  const labelInputId = `todo-rule-field-label-${field.id}`
  const requiredInputId = `todo-rule-field-required-${field.id}`

  const fieldTypeItems = useMemo(
    () =>
      todoRuleFieldTypes.map((type) => ({
        value: type,
        label: t(`admin.todoRules.form.types.${type}`),
      })),
    [t],
  )

  const selectedFieldType = fieldTypeItems.find(
    (item) => item.value === field.type,
  )

  return (
    <Item role="listitem" variant="outline">
      <ItemContent className="basis-full gap-4">
        <FieldGroup>
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={labelInputId}>
                {t("admin.todoRules.form.fieldLabel")}
              </FieldLabel>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.todoRules.form.removeField")}
                onClick={onRemove}
                disabled={disabled}
              >
                <Minus />
              </Button>
            </div>

            <Input
              id={labelInputId}
              value={field.label}
              placeholder={t("admin.todoRules.form.fieldLabelPlaceholder")}
              onChange={(event) => onChange({ label: event.target.value })}
              disabled={disabled}
              required
            />
          </Field>

          {onTypeChange && (
            <Field>
              <FieldLabel htmlFor={`todo-rule-field-type-${field.id}`}>
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
                  id={`todo-rule-field-type-${field.id}`}
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
          )}

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
                      aria-label={t("admin.todoRules.form.choiceLabel", {
                        number: choiceIndex + 1,
                      })}
                    >
                      <Input
                        value={choice.value}
                        placeholder={t(
                          "admin.todoRules.form.choicePlaceholder",
                          {
                            number: choiceIndex + 1,
                          },
                        )}
                        aria-label={t("admin.todoRules.form.choiceLabel", {
                          number: choiceIndex + 1,
                        })}
                        onChange={(event) =>
                          onChoiceChange(choice.id, event.target.value)
                        }
                        disabled={disabled || !choice.canChangeValue}
                        required
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={t(
                          "admin.todoRules.form.removeChoice",
                          {
                            number: choiceIndex + 1,
                          },
                        )}
                        onClick={() => onRemoveChoice(choice.id)}
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