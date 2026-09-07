import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import type { TodoRuleDetail } from "../../../../api/types"
import {
  JsonSchemaForm,
  type JsonSchemaFormHandle,
} from "#components/schema/JsonSchemaForm"
import { TodoFieldTemplate } from "#components/schema/TodoFieldTemplate"

export interface TodoSchemaFormHandle {
  validateAndGetData: () => Record<string, unknown> | null
}

interface TodoSchemaFormProps {
  idPrefix: string
  rule: TodoRuleDetail
  initialContent?: Record<string, unknown>
  readOnly?: boolean
  disabled?: boolean
}

const todoFormTemplates = {
  FieldTemplate: TodoFieldTemplate,
}

export const TodoSchemaForm = forwardRef<
  TodoSchemaFormHandle,
  TodoSchemaFormProps
>(function TodoSchemaForm(
  {
    idPrefix,
    rule,
    initialContent = {},
    readOnly = false,
    disabled = false,
  },
  ref,
) {
  const formRef = useRef<JsonSchemaFormHandle>(null)
  const [content, setContent] = useState<Record<string, unknown>>(
    () => structuredClone(initialContent),
  )

  useImperativeHandle(
    ref,
    () => ({
      validateAndGetData() {
        if (!formRef.current?.validateForm()) {
          return null
        }

        return content
      },
    }),
    [content],
  )

  return (
    <JsonSchemaForm
      ref={formRef}
      idPrefix={idPrefix}
      schema={rule.content_schema}
      uiSchema={rule.ui_schema}
      formData={content}
      templates={todoFormTemplates}
      onChange={setContent}
      readOnly={readOnly}
      disabled={disabled}
    />
  )
})