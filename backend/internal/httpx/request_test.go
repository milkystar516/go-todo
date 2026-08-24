package httpx

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDecodeJSONUsesNumber(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"value":12345678901234567890}`))
	var body map[string]any

	if err := DecodeJSON(request, &body); err != nil {
		t.Fatal(err)
	}
	if _, ok := body["value"].(json.Number); !ok {
		t.Fatalf("value = %T, want json.Number", body["value"])
	}
}

func TestLimitRequestBody(t *testing.T) {
	handler := LimitRequestBody(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := DecodeJSON(r, &body); err != nil {
			WriteDecodeProblem(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}), 4)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(`{"value":1}`))

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusRequestEntityTooLarge)
	}
}
