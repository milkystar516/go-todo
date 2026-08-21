package validation

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate = newValidator()

func newValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())

	v.RegisterTagNameFunc(func(field reflect.StructField) string {
		name := strings.SplitN(field.Tag.Get("json"), ",", 2)[0]

		if name == "-" {
			return ""
		}

		return name
	})

	if err := v.RegisterValidation("username", func(fl validator.FieldLevel) bool {
		return IsValidUsername(fl.Field().String())
	}); err != nil {
		panic(err)
	}

	return v
}

func Validate(value any) error {
	return validate.Struct(value)
}
