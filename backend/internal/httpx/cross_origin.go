package httpx

import "net/http"

// NewProblemCrossOriginProtection returns the standard cross-origin protection
// configured to represent rejected requests as Problem Details.
func NewProblemCrossOriginProtection() *http.CrossOriginProtection {
	protection := http.NewCrossOriginProtection()
	protection.SetDenyHandler(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		WriteProblem(w, http.StatusForbidden, "forbidden")
	}))
	return protection
}
