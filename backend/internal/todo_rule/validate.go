package todorule

import (
	"errors"
	"fmt"
)

func ValidateDefinition(fields []FieldDefinition) error {
	seenKeys := make(map[string]struct{}, len(fields))

	for _, field := range fields {
		if field.Key == "" {
			return errors.New("field key must not be empty")
		}

		if field.Label == "" {
			return fmt.Errorf(
				"field %q label must not be empty",
				field.Key,
			)
		}

		if isReservedFieldKey(field.Key) {
			return fmt.Errorf(
				"field key %q is reserved",
				field.Key,
			)
		}

		if _, exists := seenKeys[field.Key]; exists {
			return fmt.Errorf(
				"duplicate field key %q",
				field.Key,
			)
		}
		seenKeys[field.Key] = struct{}{}

		switch field.Type {
		case FieldShortText,
			FieldLongText,
			FieldInteger,
			FieldBoolean,
			FieldDate:
			if len(field.Options) > 0 {
				return fmt.Errorf(
					"field %q of type %q must not define options",
					field.Key,
					field.Type,
				)
			}

		case FieldSingleSelect:
			if err := validateSingleSelectOptions(field); err != nil {
				return err
			}

		default:
			return fmt.Errorf(
				"unsupported field type %q for field %q",
				field.Type,
				field.Key,
			)
		}
	}

	return nil
}

func validateSingleSelectOptions(field FieldDefinition) error {
	if len(field.Options) == 0 {
		return fmt.Errorf(
			"single_select field %q requires options",
			field.Key,
		)
	}

	seenOptions := make(map[string]struct{}, len(field.Options))

	for _, option := range field.Options {
		if option == "" {
			return fmt.Errorf(
				"single_select field %q contains an empty option",
				field.Key,
			)
		}

		if _, exists := seenOptions[option]; exists {
			return fmt.Errorf(
				"single_select field %q contains duplicate option %q",
				field.Key,
				option,
			)
		}
		seenOptions[option] = struct{}{}
	}

	return nil
}

func isReservedFieldKey(key string) bool {
	switch key {
	case "id",
		"owner_id",
		"content",
		"created_at",
		"completed_at":
		return true
	default:
		return false
	}
}
