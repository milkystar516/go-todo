package httpx

import "net/http"

// ProblemFallbackHandler converts ServeMux-generated 404 and 405 responses into
// Problem Details responses while preserving the method-derived Allow header.
func ProblemFallbackHandler(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler, pattern := mux.Handler(r)
		if pattern != "" {
			mux.ServeHTTP(w, r)
			return
		}

		probe := &fallbackResponseWriter{header: make(http.Header)}
		handler.ServeHTTP(probe, r)
		if probe.status != http.StatusNotFound && probe.status != http.StatusMethodNotAllowed {
			handler.ServeHTTP(w, r)
			return
		}

		for _, value := range probe.Header().Values("Allow") {
			w.Header().Add("Allow", value)
		}
		WriteProblem(w, probe.status, "")
	})
}

type fallbackResponseWriter struct {
	header http.Header
	status int
}

func (w *fallbackResponseWriter) Header() http.Header {
	return w.header
}

func (w *fallbackResponseWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}

func (w *fallbackResponseWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return len(body), nil
}
