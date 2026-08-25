package httpx

import "net/http"

type ProblemKind uint8

const (
	ProblemAuthenticationRequired ProblemKind = iota + 1
	ProblemInvalidCredentials
	ProblemUsernameTaken
	ProblemValidationFailed
	ProblemCannotChangeOwnRole
	ProblemRuleInUse
	ProblemDefaultRuleProtected
)

type problemDefinition struct {
	typeURI string
	title   string
	status  int
}

func (kind ProblemKind) definition() (problemDefinition, bool) {
	switch kind {
	case ProblemAuthenticationRequired:
		return problemDefinition{
			typeURI: "/problems/authentication-required",
			title:   "Authentication required",
			status:  http.StatusUnauthorized,
		}, true

	case ProblemInvalidCredentials:
		return problemDefinition{
			typeURI: "/problems/invalid-credentials",
			title:   "Invalid credentials",
			status:  http.StatusUnauthorized,
		}, true

	case ProblemUsernameTaken:
		return problemDefinition{
			typeURI: "/problems/username-taken",
			title:   "Username already exists",
			status:  http.StatusConflict,
		}, true

	case ProblemValidationFailed:
		return problemDefinition{
			typeURI: "/problems/validation-failed",
			title:   "Request validation failed",
			status:  http.StatusUnprocessableEntity,
		}, true

	case ProblemCannotChangeOwnRole:
		return problemDefinition{
			typeURI: "/problems/cannot-change-own-role",
			title:   "Cannot change own role",
			status:  http.StatusForbidden,
		}, true

	case ProblemRuleInUse:
		return problemDefinition{
			typeURI: "/problems/rule-in-use",
			title:   "Todo rule is in use",
			status:  http.StatusConflict,
		}, true

	case ProblemDefaultRuleProtected:
		return problemDefinition{
			typeURI: "/problems/default-rule-protected",
			title:   "Default todo rule is protected",
			status:  http.StatusConflict,
		}, true

	default:
		return problemDefinition{}, false
	}
}
