import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getCurrentUser,
  getUser,
  updateUserRole,
} from "../../api/auth";
import type { Role } from "../../api/types";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["auth", "current-user"] as const,
  queryFn: ({ signal }) => getCurrentUser(signal),
});

export function userQueryOptions(userId: number) {
  return queryOptions({
    queryKey: ["users", userId] as const,
    queryFn: ({ signal }) => getUser(userId, signal),
  });
}

interface UpdateUserRoleVariables {
  userId: number;
  role: Role;
}

export function updateUserRoleMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationFn: ({ userId, role }: UpdateUserRoleVariables) =>
      updateUserRole(userId, role),

    onSuccess: (updatedUser) => {
      queryClient.setQueryData(
        userQueryOptions(updatedUser.id).queryKey,
        updatedUser,
      );
    },
  });
}
