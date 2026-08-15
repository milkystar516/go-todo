package todorule

import (
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

const schemaResource = "todo-content.schema.json"

type ContentValidator struct {
	schema *jsonschema.Schema
}

func NewContentValidator(schemaDocument map[string]any) (*ContentValidator, error) {
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()

	if err := compiler.AddResource(
		schemaResource,
		schemaDocument,
	); err != nil {
		return nil, fmt.Errorf(
			"add todo schema resource: %w",
			err,
		)
	}

	compiledSchema, err := compiler.Compile(schemaResource)
	if err != nil {
		return nil, fmt.Errorf(
			"compile todo schema validator: %w",
			err,
		)
	}

	if err := validateDefaults(compiledSchema); err != nil {
		return nil, err
	}

	return &ContentValidator{
		schema: compiledSchema,
	}, nil
}

func (v *ContentValidator) Validate(content map[string]any) error {
	if err := v.schema.Validate(content); err != nil {
		return fmt.Errorf(
			"invalid todo content: %w",
			err,
		)
	}

	return nil
}

func validateDefaults(schema *jsonschema.Schema) error {
	for key, property := range schema.Properties {
		if property.Default == nil {
			continue
		}

		if err := property.Validate(*property.Default); err != nil {
			return fmt.Errorf(
				"invalid default for field %q: %w",
				key,
				err,
			)
		}
	}

	return nil
}
