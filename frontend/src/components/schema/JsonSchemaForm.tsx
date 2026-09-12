import CoreForm from "@rjsf/core"
import {
  generateForm,
} from "@rjsf/shadcn"
import {
  type RJSFSchema,
  type RJSFValidationError,
  type TemplatesType,
  type UiSchema,
} from "@rjsf/utils"
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react"
import {
  useTranslation,
} from "react-i18next"

import {
  rjsfValidator,
} from "../../lib/schema/rjsfValidator"

type Content =
  Record<string, unknown>

const RjsfForm =
  generateForm<Content>()

export interface JsonSchemaFormHandle {
  validateForm: () => boolean
}

interface JsonSchemaFormProps {
  idPrefix: string
  schema: RJSFSchema
  uiSchema?: UiSchema
  formData: Content
  templates?: Partial<
    TemplatesType<Content>
  >
  disabled?: boolean
  onChange: (
    formData: Content,
  ) => void
}

function isSchemaObject(
  value: unknown,
): value is RJSFSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isRequiredMinLength(
  error: RJSFValidationError,
  rootSchema: RJSFSchema,
) {
  if (
    error.name !== "minLength" ||
    error.params?.limit !== 1 ||
    !error.property
  ) {
    return false
  }

  const path = error.property
    .replace(/^\./, "")
    .split(".")
    .filter(Boolean)

  const propertyName = path.pop()

  if (!propertyName) {
    return false
  }

  let schema = rootSchema

  for (const segment of path) {
    if (/^\d+$/.test(segment)) {
      if (
        !isSchemaObject(
          schema.items,
        )
      ) {
        return false
      }

      schema = schema.items
      continue
    }

    const next =
      schema.properties?.[segment]

    if (!isSchemaObject(next)) {
      return false
    }

    schema = next
  }

  return (
    schema.required?.includes(
      propertyName,
    ) === true
  )
}

export const JsonSchemaForm =
  forwardRef<
    JsonSchemaFormHandle,
    JsonSchemaFormProps
  >(function JsonSchemaForm(
    {
      idPrefix,
      schema,
      uiSchema,
      formData,
      templates,
      disabled = false,
      onChange,
    },
    ref,
  ) {
    const { t } =
      useTranslation()

    const formRef =
      useRef<
        CoreForm<Content>
      >(null)

    useImperativeHandle(
      ref,
      () => ({
        validateForm: () =>
          formRef.current
            ?.validateForm() ??
          false,
      }),
      [],
    )

    return (
      <RjsfForm
        ref={formRef}
        idPrefix={idPrefix}
        tagName="div"
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={rjsfValidator}
        templates={templates}
        disabled={disabled}
        onChange={({
          formData: nextFormData,
        }) =>
          onChange(
            nextFormData ?? {},
          )
        }
        liveValidate="onBlur"
        omitExtraData
        liveOmit="onChange"
        showErrorList={false}
        transformErrors={(errors) =>
          errors.map((error) => {
            if (
              error.name ===
                "required" ||
              isRequiredMinLength(
                error,
                schema,
              )
            ) {
              return {
                ...error,
                message: t(
                  "common.validation.required",
                ),
              }
            }

            return error
          })
        }
      >
        <></>
      </RjsfForm>
    )
  })
