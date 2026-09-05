import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getTodoList,
  listTodoListMembers,
  listTodoLists,
  removeTodoListMember,
  createTodoList,
} from "../../api/todoLists";
import { ApiError } from "../../api/client";
import { todoQueryKeys } from "../todos/queries";

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

export function leaveTodoListMutationOptions(
  queryClient: QueryClient,
  userId: number,
) {
  return mutationOptions({
    mutationFn: (listId: string) =>
      removeTodoListMember(listId, userId),
    onSuccess: (_data, listId) => {
      queryClient.removeQueries({
        queryKey: todoListQueryKeys.detail(listId),
      });
      queryClient.removeQueries({
        queryKey: todoQueryKeys.list(listId),
        exact: true,
      });
      return queryClient.invalidateQueries({
        queryKey: todoListQueryKeys.list(),
      });
    },
  });
}

export function createTodoListMutationOptions(
  queryClient: QueryClient,
) {
  return mutationOptions({
    mutationFn: createTodoList,
    onSuccess: (list) => {
      queryClient.setQueryData(
        todoListQueryKeys.detail(list.id),
        list,
      );

      return queryClient.invalidateQueries({
        queryKey: todoListQueryKeys.list(),
      });
    },
  });
}