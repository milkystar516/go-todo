package todorule

import "fmt"

func ValidateDefinition(fields []FieldDefinition) error {
	seen := make(map[string]struct{})

	for _, field := range fields {
		if field.Key == "" {
			return fmt.Errorf("field key must not be empty")
		}

		if _, exists := seen[field.Key]; exists {
			return fmt.Errorf("duplicate field key: %s", field.Key)
		}

		seen[field.Key] = struct{}{}

		switch field.Type {
		case FieldShortText,
			FieldLongText,
			FieldInteger,
			FieldBoolean,
			FieldDate:

		case FieldSingleSelect:
			if len(field.Options) == 0 {
				return fmt.Errorf(
					"single_select field %q requires options",
					field.Key,
				)
			}

		default:
			return fmt.Errorf(
				"unsupported field type: %s",
				field.Type,
			)
		}
	}

	return nil
}
