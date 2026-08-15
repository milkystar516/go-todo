package todorule

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

const schemaResource = "todo-content.schema.json"

type ContentValidator struct {
	schema *jsonschema.Schema
}

func NewVContentalidator(schema JSONSchema) (*ContentValidator, error) {
	schemaJSON, err := json.Marshal(schema)
	if err != nil {
		return nil, fmt.Errorf("marshal todo schema: %w", err)
	}

	schemaDocument, err := jsonschema.UnmarshalJSON(
		bytes.NewReader(schemaJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("unmarshal todo schema: %w", err)
	}

	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()

	if err := compiler.AddResource(
		schemaResource,
		schemaDocument,
	); err != nil {
		return nil, fmt.Errorf("add todo schema resource: %w", err)
	}

	compiledSchema, err := compiler.Compile(schemaResource)
	if err != nil {
		return nil, fmt.Errorf("compile todo schema validator: %w", err)
	}

	return &ContentValidator{
		schema: compiledSchema,
	}, nil
}

func (v *ContentValidator) Validate(content map[string]any) error {
	if content == nil {
		return fmt.Errorf("todo content must not be nil")
	}

	if err := v.schema.Validate(content); err != nil {
		return fmt.Errorf("invalid todo content: %w", err)
	}

	return nil
}
