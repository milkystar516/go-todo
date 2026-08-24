package todorule

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

const schemaResource = "todo-content.schema.json"
const contentSchemaDialect = "https://json-schema.org/draft/2020-12/schema"

type ContentValidator struct {
	schema *jsonschema.Schema
}

type denyExternalLoader struct{}

func (denyExternalLoader) Load(url string) (any, error) {
	return nil, fmt.Errorf("external schema resource is not allowed: %s", url)
}

func CompileContentSchema(raw json.RawMessage) (*ContentValidator, error) {
	schemaDocument, err := jsonschema.UnmarshalJSON(bytes.NewReader(raw))
	if err != nil {
		return nil, newDefinitionError(fmt.Errorf("decode content_schema: %w", err))
	}

	root, ok := schemaDocument.(map[string]any)
	if !ok {
		return nil, newDefinitionError(errors.New("content_schema must be a JSON object"))
	}

	if root["$schema"] != contentSchemaDialect {
		return nil, newDefinitionError(fmt.Errorf("content_schema $schema must be %q", contentSchemaDialect))
	}
	if root["type"] != "object" {
		return nil, newDefinitionError(errors.New("content_schema root type must be object"))
	}
	if _, ok := root["properties"].(map[string]any); !ok {
		return nil, newDefinitionError(errors.New("content_schema root properties must be an object"))
	}
	if additional, ok := root["additionalProperties"].(bool); !ok || additional {
		return nil, newDefinitionError(errors.New("content_schema additionalProperties must be false"))
	}

	validator, err := newContentValidator(schemaDocument)
	if err != nil {
		return nil, newDefinitionError(err)
	}

	return validator, nil
}

func newContentValidator(schemaDocument any) (*ContentValidator, error) {
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()
	compiler.UseLoader(denyExternalLoader{})

	if err := compiler.AddResource(schemaResource, schemaDocument); err != nil {
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

func (v *ContentValidator) ValidateJSON(content json.RawMessage) error {
	value, err := jsonschema.UnmarshalJSON(bytes.NewReader(content))
	if err != nil {
		return &validationError{
			message: "invalid todo content",
			err:     err,
		}
	}

	if err := v.schema.Validate(value); err != nil {
		return &validationError{
			message: "invalid todo content",
			err:     err,
		}
	}

	return nil
}
