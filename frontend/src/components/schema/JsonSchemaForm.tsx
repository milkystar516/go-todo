import CoreForm from "@rjsf/core"
import RjsfForm from "@rjsf/shadcn"
import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { forwardRef, useImperativeHandle, useRef } from "react"

import { rjsfValidator } from "../../lib/schema/rjsfValidator"

export interface JsonSchemaFormHandle {
  validateForm: () => boolean
  getFormData: () => Record<string, unknown>
}

interface JsonSchemaFormProps {
  schema: RJSFSchema
  uiSchema?: UiSchema
  formData: Record<string, unknown>
  readOnly?: boolean
  disabled?: boolean
  onChange: (formData: Record<string, unknown>) => void
}

export const JsonSchemaForm = forwardRef<
  JsonSchemaFormHandle,
  JsonSchemaFormProps
>(function JsonSchemaForm(
  {
    schema,
    uiSchema,
    formData,
    readOnly = false,
    disabled = false,
    onChange,
  },
  ref,
) {
  const formRef = useRef<CoreForm<Record<string, unknown>>>(null)

  useImperativeHandle(
    ref,
    () => ({
      validateForm: () => formRef.current?.validateForm() ?? false,
      getFormData: () => {
        const currentForm = formRef.current
        const currentFormData = currentForm?.state.formData ?? formData

        return currentForm?.state.schemaUtils.omitExtraData(
          schema,
          currentFormData,
        ) ?? currentFormData
      },
    }),
    [formData, schema],
  )

  return (
    <RjsfForm
      ref={formRef}
      tagName="div"
      schema={schema}
      uiSchema={uiSchema}
      formData={formData}
      validator={rjsfValidator}
      onChange={({ formData: nextFormData }) =>
        onChange(nextFormData ?? {})
      }
      readonly={readOnly}
      disabled={disabled}
      liveValidate="onBlur"
      omitExtraData
      showErrorList={false}
    >
      <></>
    </RjsfForm>
  )
})
