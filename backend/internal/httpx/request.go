package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

const DefaultMaxRequestBodyBytes int64 = 1 << 20

func LimitRequestBody(next http.Handler, maxBytes int64) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
		next.ServeHTTP(w, r)
	})
}

func DecodeJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	decoder.UseNumber()

	if err := decoder.Decode(dst); err != nil {
		return err
	}

	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON value")
	}

	return nil
}

func WriteDecodeProblem(w http.ResponseWriter, err error) {
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		WriteProblem(w, http.StatusRequestEntityTooLarge, "request body too large")
		return
	}

	WriteProblem(w, http.StatusBadRequest, "bad request")
}
