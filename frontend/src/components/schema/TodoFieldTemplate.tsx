import {
  getTemplate,
  getUiOptions,
  type FieldTemplateProps,
} from "@rjsf/utils"

import {
  Field,
  FieldContent,
  FieldLabel,
} from "#components/ui/field"

const verticalWidgets = new Set([
  "textarea",
  "radio",
  "checkboxes",
])

function usesHorizontalLayout({
  displayLabel,
  schema,
  uiSchema,
}: Pick<
  FieldTemplateProps,
  "displayLabel" | "schema" | "uiSchema"
>) {
  if (!displayLabel || schema.format === "data-url") {
    return false
  }

  const type = Array.isArray(schema.type)
    ? schema.type[0]
    : schema.type
  const widget = getUiOptions(uiSchema).widget

  return (
    (type === "string" ||
      type === "number" ||
      type === "integer") &&
    !verticalWidgets.has(String(widget))
  )
}

export function TodoFieldTemplate({
  id,
  children,
  displayLabel,
  rawErrors = [],
  errors,
  help,
  description,
  rawDescription,
  classNames,
  style,
  disabled,
  label,
  hidden,
  onKeyRename,
  onKeyRenameBlur,
  onRemoveProperty,
  readonly,
  required,
  schema,
  uiSchema,
  registry,
}: FieldTemplateProps) {
  const uiOptions = getUiOptions(uiSchema)
  const WrapIfAdditionalTemplate = getTemplate(
    "WrapIfAdditionalTemplate",
    registry,
    uiOptions,
  )

  if (hidden) {
    return <div className="hidden">{children}</div>
  }

  const isCheckbox = uiOptions.widget === "checkbox"
  const horizontal = usesHorizontalLayout({
    displayLabel,
    schema,
    uiSchema,
  })

  return (
    <WrapIfAdditionalTemplate
      classNames={classNames}
      style={style}
      disabled={disabled}
      id={id}
      label={label}
      displayLabel={displayLabel}
      onKeyRename={onKeyRename}
      onKeyRenameBlur={onKeyRenameBlur}
      onRemoveProperty={onRemoveProperty}
      rawDescription={rawDescription}
      readonly={readonly}
      required={required}
      schema={schema}
      uiSchema={uiSchema}
      registry={registry}
    >
      <Field
        orientation={horizontal ? "horizontal" : "vertical"}
        data-invalid={rawErrors.length > 0}
        className={
          isCheckbox && required
            ? "[&_[data-slot=label]]:after:ml-0.5 [&_[data-slot=label]]:after:text-destructive [&_[data-slot=label]]:after:content-['*']"
            : undefined
        }
      >
        {displayLabel && !isCheckbox && (
          <FieldLabel htmlFor={id}>
            {label}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </FieldLabel>
        )}

        <FieldContent>
          {children}
          {displayLabel && rawDescription && !isCheckbox
            ? description
            : null}
          {errors}
          {help}
        </FieldContent>
      </Field>
    </WrapIfAdditionalTemplate>
  )
}
