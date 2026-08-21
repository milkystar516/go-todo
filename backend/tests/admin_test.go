package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/milkystar516/go-todo/backend/internal/auth"
)

func TestAdminRoleManagement(t *testing.T) {
	api := newTestAPI(t)
	member := api.newAuthenticatedUser(t)
	adminClient, adminUser := api.newAdminClient(t)

	publicAdminResp := request(t, member.client, http.MethodGet, fmt.Sprintf("%s/users/%d", api.apiURL, adminUser.ID))
	expectStatus(t, publicAdminResp, http.StatusOK)
	publicAdminResp.Body.Close()

	forbiddenGrantResp := request(
		t,
		member.client,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/grant-admin", api.apiURL, member.user.ID),
	)
	expectStatus(t, forbiddenGrantResp, http.StatusForbidden)
	forbiddenGrantResp.Body.Close()

	selfRevokeResp := request(
		t,
		adminClient,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/revoke-admin", api.apiURL, adminUser.ID),
	)
	expectProblem(
		t,
		selfRevokeResp,
		http.StatusForbidden,
		"/problems/cannot-change-own-role",
		"Cannot change own role",
	)

	grantResp := request(
		t,
		adminClient,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/grant-admin", api.apiURL, member.user.ID),
	)
	expectStatus(t, grantResp, http.StatusOK)

	var grantedUser publicUserResponse
	decodeJSON(t, grantResp, &grantedUser)
	if grantedUser.Role != auth.RoleAdmin {
		t.Fatalf("granted role = %q, want %q", grantedUser.Role, auth.RoleAdmin)
	}

	conflictGrantResp := request(
		t,
		adminClient,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/grant-admin", api.apiURL, member.user.ID),
	)
	expectProblem(
		t,
		conflictGrantResp,
		http.StatusConflict,
		"/problems/role-conflict",
		"User role conflict",
	)

	revokeResp := request(
		t,
		adminClient,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/revoke-admin", api.apiURL, member.user.ID),
	)
	expectStatus(t, revokeResp, http.StatusOK)

	var revokedUser publicUserResponse
	decodeJSON(t, revokeResp, &revokedUser)
	if revokedUser.Role != auth.RoleUser {
		t.Fatalf("revoked role = %q, want %q", revokedUser.Role, auth.RoleUser)
	}

	conflictRevokeResp := request(
		t,
		adminClient,
		http.MethodPost,
		fmt.Sprintf("%s/users/%d/revoke-admin", api.apiURL, member.user.ID),
	)
	expectProblem(
		t,
		conflictRevokeResp,
		http.StatusConflict,
		"/problems/role-conflict",
		"User role conflict",
	)

	missingUserResp := request(
		t,
		adminClient,
		http.MethodPost,
		api.apiURL+"/users/9223372036854775807/grant-admin",
	)
	expectStatus(t, missingUserResp, http.StatusNotFound)
	missingUserResp.Body.Close()
}
