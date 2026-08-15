package todorule

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"
)

func ValidateDefinition(fields []FieldDefinition) error {
	seenKeys := make(map[string]struct{}, len(fields))

	for _, field := range fields {
		if err := validateFieldDefinition(field, seenKeys); err != nil {
			return err
		}

		seenKeys[field.Key] = struct{}{}
	}

	return nil
}

func validateFieldDefinition(field FieldDefinition, seenKeys map[string]struct{}) error {
	if strings.TrimSpace(field.Key) == "" {
		return fmt.Errorf("field key must not be empty")
	}

	if strings.TrimSpace(field.Key) != field.Key {
		return fmt.Errorf(
			"field key %q must not have leading or trailing whitespace",
			field.Key,
		)
	}

	if strings.TrimSpace(field.Label) == "" {
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
			"duplicate field key: %s",
			field.Key,
		)
	}

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

	if field.DefaultValue != nil {
		if err := validateDefaultValue(field); err != nil {
			return fmt.Errorf(
				"field %q has invalid default value: %w",
				field.Key,
				err,
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
		if strings.TrimSpace(option) == "" {
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

func validateDefaultValue(field FieldDefinition) error {
	switch field.Type {
	case FieldShortText, FieldLongText:
		if _, ok := field.DefaultValue.(string); !ok {
			return fmt.Errorf("default must be a string")
		}

	case FieldInteger:
		if !isIntegerValue(field.DefaultValue) {
			return fmt.Errorf("default must be an integer")
		}

	case FieldBoolean:
		if _, ok := field.DefaultValue.(bool); !ok {
			return fmt.Errorf("default must be a boolean")
		}

	case FieldDate:
		value, ok := field.DefaultValue.(string)
		if !ok {
			return fmt.Errorf("default must be a date string")
		}

		if _, err := time.Parse("2006-01-02", value); err != nil {
			return fmt.Errorf(
				"default must use YYYY-MM-DD format",
			)
		}

	case FieldSingleSelect:
		value, ok := field.DefaultValue.(string)
		if !ok {
			return fmt.Errorf("default must be a string")
		}

		for _, option := range field.Options {
			if option == value {
				return nil
			}
		}

		return fmt.Errorf(
			"default %q is not one of the field options",
			value,
		)
	}

	return nil
}

func isIntegerValue(value any) bool {
	switch value := value.(type) {
	case int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64:
		return true

	case float32:
		number := float64(value)
		return math.Trunc(number) == number

	case float64:
		return math.Trunc(value) == value

	case json.Number:
		number, err := value.Float64()
		if err != nil {
			return false
		}

		return math.Trunc(number) == number

	default:
		return false
	}
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
