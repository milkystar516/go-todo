package httpx

import "github.com/go-playground/validator/v10"

var validate = validator.New(
	validator.WithRequiredStructEnabled(),
)

func Validate(v any) error {
	return validate.Struct(v)
}
