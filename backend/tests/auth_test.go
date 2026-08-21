package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/auth"
)

func TestAuthRoutePrefixAndAuthentication(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)

	rootMeResp := request(t, client, http.MethodGet, api.rootURL+"/me")
	expectStatus(t, rootMeResp, http.StatusNotFound)
	rootMeResp.Body.Close()

	unauthorizedMeResp := request(t, client, http.MethodGet, api.apiURL+"/me")
	expectStatus(t, unauthorizedMeResp, http.StatusUnauthorized)
	unauthorizedMeResp.Body.Close()
}

func TestSignupValidationAndConflict(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)
	username := uniqueValue("integration_test")
	api.registerUserCleanup(t, username)

	invalidSignupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", map[string]any{})
	expectStatus(t, invalidSignupResp, http.StatusUnprocessableEntity)
	invalidSignupResp.Body.Close()

	signupBody := map[string]any{
		"username": username,
		"nickname": "integration-test",
		"password": "test-password",
	}

	signupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", signupBody)
	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	duplicateSignupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", signupBody)
	expectStatus(t, duplicateSignupResp, http.StatusConflict)
	duplicateSignupResp.Body.Close()
}

func TestLoginSessionLifecycle(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)
	username := uniqueValue("integration_test")
	password := "test-password"
	api.registerUserCleanup(t, username)

	signupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", map[string]any{
		"username": username,
		"nickname": "integration-test",
		"password": password,
	})
	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	invalidLoginResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/login", map[string]any{
		"username": username,
		"password": "wrong-password",
	})
	expectStatus(t, invalidLoginResp, http.StatusUnauthorized)
	invalidLoginResp.Body.Close()

	loginResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/login", map[string]any{
		"username": username,
		"password": password,
	})
	expectStatus(t, loginResp, http.StatusOK)

	loginCookies := loginResp.Cookies()
	loginResp.Body.Close()

	if len(loginCookies) != 1 {
		t.Fatalf("login set %d cookies, want 1", len(loginCookies))
	}
	if loginCookies[0].Path != "/" {
		t.Fatalf("login cookie path = %q, want %q", loginCookies[0].Path, "/")
	}

	meResp := request(t, client, http.MethodGet, api.apiURL+"/me")
	expectStatus(t, meResp, http.StatusOK)

	var user publicUserResponse
	decodeJSON(t, meResp, &user)

	if user.ID == 0 {
		t.Fatal("me response has no id")
	}
	if user.Username != username {
		t.Fatalf("me username = %q, want %q", user.Username, username)
	}
	if user.Nickname == nil || *user.Nickname != "integration-test" {
		t.Fatalf("me nickname = %v, want %q", user.Nickname, "integration-test")
	}
	if user.Role != auth.RoleUser {
		t.Fatalf("me role = %q, want %q", user.Role, auth.RoleUser)
	}
	if cookies := meResp.Cookies(); len(cookies) != 0 {
		t.Fatalf("me response set %d cookies, want 0", len(cookies))
	}

	userResp := request(t, client, http.MethodGet, fmt.Sprintf("%s/users/%d", api.apiURL, user.ID))
	expectStatus(t, userResp, http.StatusOK)

	var foundUser publicUserResponse
	decodeJSON(t, userResp, &foundUser)

	if foundUser.ID != user.ID || foundUser.Username != user.Username || foundUser.Role != user.Role {
		t.Fatalf("user response = %+v, want %+v", foundUser, user)
	}
	if foundUser.Nickname == nil || *foundUser.Nickname != *user.Nickname {
		t.Fatalf("user nickname = %v, want %v", foundUser.Nickname, user.Nickname)
	}

	logoutResp := request(t, client, http.MethodDelete, api.apiURL+"/logout")
	expectStatus(t, logoutResp, http.StatusNoContent)
	logoutResp.Body.Close()

	loggedOutMeResp := request(t, client, http.MethodGet, api.apiURL+"/me")
	expectStatus(t, loggedOutMeResp, http.StatusUnauthorized)
	loggedOutMeResp.Body.Close()
}
