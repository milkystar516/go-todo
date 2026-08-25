import { queryOptions } from "@tanstack/react-query";

import { listTodoListMembers } from "../../api/todoLists";
import { ApiError } from "../../api/client";

export function todoListMembersQueryOptions(listId: string) {
  return queryOptions({
    queryKey: ["todo-lists", listId, "members"] as const,
    queryFn: ({ signal }) => listTodoListMembers(listId, signal),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) &&
      failureCount < 2,
  });
}
