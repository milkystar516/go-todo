package todorule

func Compile(fields []FieldDefinition) (*ContentValidator, error) {
	schema, err := schemaForFields(fields)
	if err != nil {
		return nil, err
	}

	return newContentValidator(schema)
}
