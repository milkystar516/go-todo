package todorule

func Compile(fields []FieldDefinition) (*ContentValidator, error) {
	if err := validateDefinition(fields); err != nil {
		return nil, err
	}

	return newContentValidator(buildSchema(fields))
}

func buildSchema(fields []FieldDefinition) map[string]any {
	properties := make(map[string]any, len(fields))
	required := make([]any, 0)

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

	schema := map[string]any{
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
