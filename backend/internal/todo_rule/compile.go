package todorule

func Compile(definition RuleDefinition) (*ContentValidator, error) {
	if err := validateDefinition(definition); err != nil {
		return nil, newDefinitionError(err)
	}

	return CompileContentSchema(definition.ContentSchema)
}
