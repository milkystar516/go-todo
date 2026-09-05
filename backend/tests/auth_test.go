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
	expectProblem(
		t,
		unauthorizedMeResp,
		http.StatusUnauthorized,
		"/problems/authentication-required",
		"Authentication required",
	)
}

func TestListUsersRequiresAuthentication(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)
	member := api.newAuthenticatedUser(t)
	adminClient, adminUser := api.newAdminClient(t)

	unauthorizedResp := request(
		t,
		client,
		http.MethodGet,
		api.apiURL+"/users",
	)
	expectProblem(
		t,
		unauthorizedResp,
		http.StatusUnauthorized,
		"/problems/authentication-required",
		"Authentication required",
	)

	memberListResp := request(
		t,
		member.client,
		http.MethodGet,
		api.apiURL+"/users",
	)
	expectStatus(t, memberListResp, http.StatusOK)

	var memberVisibleUsers []publicUserResponse
	decodeJSON(t, memberListResp, &memberVisibleUsers)

	foundMember := false
	foundAdmin := false
	for _, user := range memberVisibleUsers {
		foundMember = foundMember || user.ID == member.user.ID
		foundAdmin = foundAdmin || user.ID == adminUser.ID
	}
	if !foundMember || !foundAdmin {
		t.Fatalf(
			"listed users missing created member or admin: member=%t admin=%t",
			foundMember,
			foundAdmin,
		)
	}

	adminListResp := request(
		t,
		adminClient,
		http.MethodGet,
		api.apiURL+"/users",
	)
	expectStatus(t, adminListResp, http.StatusOK)
	adminListResp.Body.Close()
}

func TestAPIProtocolErrorsUseProblemDetails(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)

	notFoundResp := request(t, client, http.MethodGet, api.apiURL+"/does-not-exist")
	expectProblem(t, notFoundResp, http.StatusNotFound, "", "Not Found")

	methodNotAllowedResp := request(t, client, http.MethodPut, api.apiURL+"/login")
	if got := methodNotAllowedResp.Header.Get("Allow"); got != http.MethodPost {
		methodNotAllowedResp.Body.Close()
		t.Fatalf("Allow = %q, want %q", got, http.MethodPost)
	}
	expectProblem(
		t,
		methodNotAllowedResp,
		http.StatusMethodNotAllowed,
		"",
		"Method Not Allowed",
	)

	crossOriginRequest, err := http.NewRequestWithContext(
		t.Context(),
		http.MethodPost,
		api.apiURL+"/login",
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	crossOriginRequest.Header.Set("Origin", "https://example.test")

	crossOriginResp, err := client.Do(crossOriginRequest)
	if err != nil {
		t.Fatal(err)
	}
	expectProblem(t, crossOriginResp, http.StatusForbidden, "", "Forbidden")
}

func TestSignupValidationAndConflict(t *testing.T) {
	api := newTestAPI(t)
	client := newClient(t)
	username := uniqueValue("integration_test")
	api.registerUserCleanup(t, username)

	invalidSignupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", map[string]any{})
	expectProblem(
		t,
		invalidSignupResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	signupBody := map[string]any{
		"username": username,
		"nickname": "integration-test",
		"password": "test-password",
	}

	signupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", signupBody)
	expectStatus(t, signupResp, http.StatusCreated)
	signupResp.Body.Close()

	duplicateSignupResp := requestJSON(t, client, http.MethodPost, api.apiURL+"/signup", signupBody)
	expectProblem(
		t,
		duplicateSignupResp,
		http.StatusConflict,
		"/problems/username-taken",
		"Username already exists",
	)
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
	expectProblem(
		t,
		invalidLoginResp,
		http.StatusUnauthorized,
		"/problems/invalid-credentials",
		"Invalid credentials",
	)

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
	expectProblem(
		t,
		loggedOutMeResp,
		http.StatusUnauthorized,
		"/problems/authentication-required",
		"Authentication required",
	)
}
