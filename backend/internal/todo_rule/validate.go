package todorule

import (
	"bytes"
	"errors"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

type validationError struct {
	message string
	err     error
}

func (e *validationError) Error() string {
	return e.message
}

func (e *validationError) Unwrap() error {
	return e.err
}

func newDefinitionError(err error) error {
	return &validationError{
		message: "invalid rule definition",
		err:     err,
	}
}

func validateDefinition(definition RuleDefinition) error {
	value, err := jsonschema.UnmarshalJSON(bytes.NewReader(definition.UISchema))
	if err != nil {
		return fmt.Errorf("decode ui_schema: %w", err)
	}
	if _, ok := value.(map[string]any); !ok {
		return errors.New("ui_schema must be a JSON object")
	}

	seenPointers := make(map[string]struct{}, len(definition.ListColumns))
	for _, column := range definition.ListColumns {
		if _, exists := seenPointers[column.Pointer]; exists {
			return fmt.Errorf("duplicate list column pointer %q", column.Pointer)
		}
		seenPointers[column.Pointer] = struct{}{}
	}

	return nil
}
