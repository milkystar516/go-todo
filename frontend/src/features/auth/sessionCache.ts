import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { currentUserQueryOptions } from "./queries"

function isCurrentUserQuery(queryKey: QueryKey) {
  const currentUserQueryKey = currentUserQueryOptions.queryKey

  return (
    queryKey.length === currentUserQueryKey.length &&
    queryKey.every((part, index) => part === currentUserQueryKey[index])
  )
}

function removeUserQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => !isCurrentUserQuery(query.queryKey),
  })
}

export function clearSessionCache(queryClient: QueryClient) {
  queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
  removeUserQueries(queryClient)
  queryClient.getMutationCache().clear()
}

export async function refreshSessionCache(queryClient: QueryClient) {
  removeUserQueries(queryClient)

  return queryClient.fetchQuery(currentUserQueryOptions)
}
