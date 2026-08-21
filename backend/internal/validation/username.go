package validation

import "regexp"

var usernamePattern = regexp.MustCompile(`^[a-z][a-z0-9._-]*$`)

func IsValidUsername(username string) bool {
	return usernamePattern.MatchString(username)
}
