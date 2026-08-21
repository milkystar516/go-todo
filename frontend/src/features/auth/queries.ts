import { queryOptions } from "@tanstack/react-query";

import { getCurrentUser } from "../../api/auth";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["auth", "current-user"] as const,
  queryFn: ({ signal }) => getCurrentUser(signal),
});