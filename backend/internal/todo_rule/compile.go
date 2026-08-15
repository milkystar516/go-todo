package todorule

func Compile(fields []FieldDefinition) (JSONSchema, error) {
	if err := ValidateDefinition(fields); err != nil {
		return JSONSchema{}, err
	}

	schema := JSONSchema{
		Schema:               jsonSchemaDraft2020,
		Type:                 "object",
		Properties:           make(map[string]PropertySchema),
		AdditionalProperties: false,
	}

	for _, field := range fields {
		property := PropertySchema{
			Title:   field.Label,
			Default: field.DefaultValue,
		}

		switch field.Type {
		case FieldShortText, FieldLongText:
			property.Type = "string"

		case FieldInteger:
			property.Type = "integer"

		case FieldBoolean:
			property.Type = "boolean"

		case FieldDate:
			property.Type = "string"
			property.Format = "date"

		case FieldSingleSelect:
			property.Type = "string"
			property.Enum = field.Options
		}

		schema.Properties[field.Key] = property

		if field.Required {
			schema.Required = append(schema.Required, field.Key)
		}
	}

	return schema, nil
}
