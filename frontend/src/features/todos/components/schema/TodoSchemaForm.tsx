import {
  deepEquals,
  omitExtraData,
  type RJSFSchema,
} from "@rjsf/utils"
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  TodoRuleSchema,
} from "../../../../api/types"
import {
  JsonSchemaForm,
  type JsonSchemaFormHandle,
} from "#components/schema/JsonSchemaForm"
import {
  TodoFieldTemplate,
} from "#components/schema/TodoFieldTemplate"
import {
  rjsfValidator,
} from "#lib/schema/rjsfValidator"
import {
  buildTodoFormUiSchema,
} from "../../lib/todoFormPresentation"

type Content =
  Record<string, unknown>

interface ContentDraft {
  schema: RJSFSchema
  value: Content
}

export interface TodoSchemaFormHandle {
  validateAndGetData:
    () => Content | null
}

interface TodoSchemaFormProps {
  idPrefix: string
  rule: TodoRuleSchema
  initialContent?: Content
  disabled?: boolean
}

const todoFormTemplates = {
  FieldTemplate:
    TodoFieldTemplate,
}

function pruneContent(
  schema: RJSFSchema,
  content: Content,
): Content {
  return (
    omitExtraData<Content>(
      rjsfValidator,
      schema,
      schema,
      content,
    ) ?? {}
  )
}

export const TodoSchemaForm =
  forwardRef<
    TodoSchemaFormHandle,
    TodoSchemaFormProps
  >(function TodoSchemaForm(
    {
      idPrefix,
      rule,
      initialContent = {},
      disabled = false,
    },
    ref,
  ) {
    const formRef =
      useRef<
        JsonSchemaFormHandle
      >(null)

    const [
      contentDraft,
      setContentDraft,
    ] = useState<ContentDraft>(
      () => ({
        schema: structuredClone(rule.content_schema),
        value: structuredClone(initialContent),
      })
    )

    let formData =
      contentDraft.value

    if (!deepEquals(contentDraft.schema, rule.content_schema)) {
      formData = pruneContent(
        rule.content_schema,
        contentDraft.value,
      )

      setContentDraft({
        schema: structuredClone(rule.content_schema),
        value: formData,
      })
    }

    const effectiveUiSchema =
      useMemo(
        () =>
          buildTodoFormUiSchema(
            rule.content_schema,
            rule.ui_schema,
          ),
        [
          rule.content_schema,
          rule.ui_schema,
        ],
      )

    useImperativeHandle(
      ref,
      () => ({
        validateAndGetData() {
          if (
            !formRef.current
              ?.validateForm()
          ) {
            return null
          }

          return formData
        },
      }),
      [formData],
    )

    return (
      <JsonSchemaForm
        ref={formRef}
        idPrefix={idPrefix}
        schema={
          rule.content_schema
        }
        uiSchema={
          effectiveUiSchema
        }
        formData={formData}
        templates={
          todoFormTemplates
        }
        onChange={(
          nextContent,
        ) =>
          setContentDraft({
            schema:
              structuredClone(rule.content_schema),
            value:
              nextContent,
          })
        }
        disabled={disabled}
      />
    )
  })
