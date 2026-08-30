import { Minus, Plus } from "lucide-react"
import {
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { useTranslation } from "react-i18next"

import type { TodoRuleWriteInput } from "../../../api/todoRules"
import type { TodoRuleDetail } from "../../../api/types"
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
import {
  createTodoRuleDefinition,
  isChoiceField,
  todoRuleFieldTypes,
  type TodoRuleChoice,
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
  onSubmit: (
    input: TodoRuleWriteInput,
  ) => void | Promise<void>
  onCancel?: () => void
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
      checklistItem: t(
        "admin.todoRules.form.checklist.item",
      ),
      checklistCompleted: t(
        "admin.todoRules.form.checklist.completed",
      ),
      checklistItemPlaceholder: t(
        "admin.todoRules.form.checklist.itemPlaceholder",
      ),
    }),
    [t],
  )
  const [ruleName, setRuleName] = useState(
    initialValue?.ruleName ?? "",
  )
  const [fields, setFields] = useState(() =>
    createInitialFields(initialValue),
  )
  const [formError, setFormError] = useState<string | null>(null)

  const previewRule = useMemo<TodoRuleDetail>(() => {
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
    const definition = createTodoRuleDefinition(
      ruleName,
      previewFields,
      generatedLabels,
      initialValue?.originalDefinition,
    )
    return {
      id: 0,
      rule_name: ruleName,
      content_schema: definition.contentSchema,
      ui_schema: definition.uiSchema,
      list_columns: [],
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

    const { contentSchema, uiSchema } = createTodoRuleDefinition(
      normalizedRuleName,
      fields,
      generatedLabels,
      initialValue?.originalDefinition,
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
  const availableFieldTypes =
    field.type === "custom"
      ? (["custom", ...todoRuleFieldTypes] as const)
      : todoRuleFieldTypes
  const fieldTypeItems = availableFieldTypes.map((type) => ({
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
