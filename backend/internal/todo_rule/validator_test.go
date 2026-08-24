package todorule

import (
	"encoding/json"
	"testing"
)

func TestCompileContentSchemaSupportsRJSFStructures(t *testing.T) {
	schema := json.RawMessage(`{
		"$schema":"https://json-schema.org/draft/2020-12/schema",
		"type":"object",
		"properties":{
			"choice":{"oneOf":[{"type":"string"},{"type":"number"}]},
			"tags":{"type":"array","items":{"$ref":"#/$defs/tag"}},
			"profile":{"type":"object","properties":{"active":{"type":"boolean"}}}
		},
		"$defs":{"tag":{"type":"string","minLength":1}},
		"additionalProperties":false
	}`)

	validator, err := CompileContentSchema(schema)
	if err != nil {
		t.Fatal(err)
	}

	if err := validator.ValidateJSON(json.RawMessage(`{
		"choice":12.5,
		"tags":["go","rjsf"],
		"profile":{"active":true}
	}`)); err != nil {
		t.Fatal(err)
	}
}

func TestCompileContentSchemaRejectsExternalReference(t *testing.T) {
	schema := json.RawMessage(`{
		"$schema":"https://json-schema.org/draft/2020-12/schema",
		"type":"object",
		"properties":{"value":{"$ref":"https://example.com/value.json"}},
		"additionalProperties":false
	}`)

	if _, err := CompileContentSchema(schema); err == nil {
		t.Fatal("CompileContentSchema() succeeded with an external reference")
	}
}

func TestCompileContentSchemaRejectsInvalidRootContract(t *testing.T) {
	tests := []struct {
		name   string
		schema json.RawMessage
	}{
		{
			name:   "wrong dialect",
			schema: json.RawMessage(`{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{},"additionalProperties":false}`),
		},
		{
			name:   "non-object root",
			schema: json.RawMessage(`{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"array","properties":{},"additionalProperties":false}`),
		},
		{
			name:   "additional properties",
			schema: json.RawMessage(`{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{},"additionalProperties":true}`),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := CompileContentSchema(tt.schema); err == nil {
				t.Fatal("CompileContentSchema() succeeded")
			}
		})
	}
}

func TestValidateDefinitionRejectsInvalidMetadata(t *testing.T) {
	contentSchema := json.RawMessage(`{
		"$schema":"https://json-schema.org/draft/2020-12/schema",
		"type":"object",
		"properties":{},
		"additionalProperties":false
	}`)

	tests := []struct {
		name       string
		definition RuleDefinition
	}{
		{
			name: "non-object ui schema",
			definition: RuleDefinition{
				ContentSchema: contentSchema,
				UISchema:      json.RawMessage(`[]`),
			},
		},
		{
			name: "duplicate list pointer",
			definition: RuleDefinition{
				ContentSchema: contentSchema,
				UISchema:      json.RawMessage(`{}`),
				ListColumns: []ListColumn{
					{Pointer: "/title", Label: "Title"},
					{Pointer: "/title", Label: "Duplicate"},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := Compile(tt.definition); err == nil {
				t.Fatal("Compile() succeeded")
			}
		})
	}
}
