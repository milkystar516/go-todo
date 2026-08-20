import type { UiSchema } from "@rjsf/utils";

export function buildTodoUiSchema(
  fields: FieldDefinition[],
): UiSchema {
  const uiSchema: UiSchema = {
    "ui:order": fields.map((field) => field.key),
  };

  for (const field of fields) {
    if (field.type === "long_text") {
      uiSchema[field.key] = {
        "ui:widget": "textarea",
      };
    }
  }

  return uiSchema;
}