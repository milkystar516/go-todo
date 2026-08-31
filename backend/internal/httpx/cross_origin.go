package httpx

import "net/http"

func NewProblemCrossOriginProtection() *http.CrossOriginProtection {
	protection := http.NewCrossOriginProtection()
	protection.SetDenyHandler(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		WriteProblem(w, http.StatusForbidden, "forbidden")
	}))
	return protection
}
