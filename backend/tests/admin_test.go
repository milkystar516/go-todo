package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/auth"
)

func TestAdminListUsers(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, adminUser := api.newAdminClient(t)

	forbiddenResp := request(
		t,
		member.client,
		http.MethodGet,
		api.apiURL+"/users",
	)
	expectStatus(t, forbiddenResp, http.StatusForbidden)
	forbiddenResp.Body.Close()

	listResp := request(
		t,
		adminClient,
		http.MethodGet,
		api.apiURL+"/users",
	)
	expectStatus(t, listResp, http.StatusOK)

	var users []publicUserResponse
	decodeJSON(t, listResp, &users)

	foundMember := false
	foundAdmin := false
	for _, user := range users {
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
}

func TestAdminRoleManagement(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, adminUser := api.newAdminClient(t)

	publicAdminResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/users/%d", api.apiURL, adminUser.ID))
	expectStatus(t, publicAdminResp, http.StatusOK)
	publicAdminResp.Body.Close()

	forbiddenUpdateResp := request(
		t,
		member.client,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
	)
	expectStatus(t, forbiddenUpdateResp, http.StatusForbidden)
	forbiddenUpdateResp.Body.Close()

	selfUpdateResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, adminUser.ID),
		map[string]any{"role": auth.RoleUser},
	)
	expectProblem(
		t,
		selfUpdateResp,
		http.StatusForbidden,
		"/problems/cannot-change-own-role",
		"Cannot change own role",
	)

	invalidRoleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
		map[string]any{"role": "owner"},
	)
	expectProblem(
		t,
		invalidRoleResp,
		http.StatusUnprocessableEntity,
		"/problems/validation-failed",
		"Request validation failed",
	)

	adminRoleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
		map[string]any{"role": auth.RoleAdmin},
	)
	expectStatus(t, adminRoleResp, http.StatusOK)

	var promotedUser publicUserResponse
	decodeJSON(t, adminRoleResp, &promotedUser)
	if promotedUser.Role != auth.RoleAdmin {
		t.Fatalf("updated role = %q, want %q", promotedUser.Role, auth.RoleAdmin)
	}

	repeatedAdminRoleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
		map[string]any{"role": auth.RoleAdmin},
	)
	expectStatus(t, repeatedAdminRoleResp, http.StatusOK)
	repeatedAdminRoleResp.Body.Close()

	userRoleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
		map[string]any{"role": auth.RoleUser},
	)
	expectStatus(t, userRoleResp, http.StatusOK)

	var demotedUser publicUserResponse
	decodeJSON(t, userRoleResp, &demotedUser)
	if demotedUser.Role != auth.RoleUser {
		t.Fatalf("updated role = %q, want %q", demotedUser.Role, auth.RoleUser)
	}

	repeatedUserRoleResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		fmt.Sprintf("%s/users/%d", api.apiURL, member.user.ID),
		map[string]any{"role": auth.RoleUser},
	)
	expectStatus(t, repeatedUserRoleResp, http.StatusOK)
	repeatedUserRoleResp.Body.Close()

	missingUserResp := requestJSON(
		t,
		adminClient,
		http.MethodPatch,
		api.apiURL+"/users/9223372036854775807",
		map[string]any{"role": auth.RoleAdmin},
	)
	expectStatus(t, missingUserResp, http.StatusNotFound)
	missingUserResp.Body.Close()
}
