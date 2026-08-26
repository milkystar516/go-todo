import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getCurrentUser,
  getUser,
  listUsers,
  updateUserRole,
} from "../../api/auth";
import type { Role } from "../../api/types";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["auth", "current-user"] as const,
  queryFn: ({ signal }) => getCurrentUser(signal),
});

export const userQueryKeys = {
  all: ["users"] as const,
  list: () => [...userQueryKeys.all, "list"] as const,
  detail: (userId: number) =>
    [...userQueryKeys.all, "detail", userId] as const,
};

export function userQueryOptions(userId: number) {
  return queryOptions({
    queryKey: userQueryKeys.detail(userId),
    queryFn: ({ signal }) => getUser(userId, signal),
  });
}

export const usersQueryOptions = queryOptions({
  queryKey: userQueryKeys.list(),
  queryFn: ({ signal }) => listUsers(signal),
});

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

    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(
        userQueryOptions(updatedUser.id).queryKey,
        updatedUser,
      );

      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.list(),
      });
    },
  });
}
