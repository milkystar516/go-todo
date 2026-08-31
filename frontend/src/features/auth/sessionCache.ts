import type { QueryClient } from "@tanstack/react-query"

import { currentUserQueryOptions } from "./queries"

export async function refreshSessionCache(queryClient: QueryClient) {
  queryClient.removeQueries()

  return queryClient.query(currentUserQueryOptions)
}
