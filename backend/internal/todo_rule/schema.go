package todorule

type JSONSchema map[string]any

func buildSchema(fields []FieldDefinition) JSONSchema {
	properties := make(map[string]any, len(fields))
	required := make([]any, 0, len(fields))

	for _, field := range fields {
		property := map[string]any{
			"title": field.Label,
		}

		switch field.Type {
		case FieldShortText, FieldLongText:
			property["type"] = "string"

		case FieldInteger:
			property["type"] = "integer"

		case FieldBoolean:
			property["type"] = "boolean"

		case FieldDate:
			property["type"] = "string"
			property["format"] = "date"

		case FieldSingleSelect:
			property["type"] = "string"

			options := make([]any, len(field.Options))
			for i, option := range field.Options {
				options[i] = option
			}

			property["enum"] = options
		}

		if field.DefaultValue != nil {
			property["default"] = field.DefaultValue
		}

		properties[field.Key] = property

		if field.Required {
			required = append(required, field.Key)
		}
	}

	schema := JSONSchema{
		"$schema":              "https://json-schema.org/draft/2020-12/schema",
		"type":                 "object",
		"properties":           properties,
		"additionalProperties": false,
	}

	if len(required) > 0 {
		schema["required"] = required
	}

	return schema
}

func schemaForFields(fields []FieldDefinition) (JSONSchema, error) {
	if err := validateDefinition(fields); err != nil {
		return nil, &validationError{
			message: err.Error(),
			err:     err,
		}
	}

	return buildSchema(fields), nil
}
