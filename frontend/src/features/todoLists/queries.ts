import { queryOptions } from "@tanstack/react-query";

import {
  getTodoList,
  listTodoListMembers,
  listTodoLists,
} from "../../api/todoLists";
import { ApiError } from "../../api/client";

export const todoListQueryKeys = {
  all: ["todo-lists"] as const,
  list: () => [...todoListQueryKeys.all, "list"] as const,
  detail: (listId: string) =>
    [...todoListQueryKeys.all, "detail", listId] as const,
  members: (listId: string) =>
    [...todoListQueryKeys.all, "detail", listId, "members"] as const,
};

export const todoListsQueryOptions = queryOptions({
  queryKey: todoListQueryKeys.list(),
  queryFn: ({ signal }) => listTodoLists(signal),
});

export function todoListQueryOptions(listId: string) {
  return queryOptions({
    queryKey: todoListQueryKeys.detail(listId),
    queryFn: ({ signal }) => getTodoList(listId, signal),
  });
}

export function todoListMembersQueryOptions(listId: string) {
  return queryOptions({
    queryKey: todoListQueryKeys.members(listId),
    queryFn: ({ signal }) => listTodoListMembers(listId, signal),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) &&
      failureCount < 2,
  });
}
