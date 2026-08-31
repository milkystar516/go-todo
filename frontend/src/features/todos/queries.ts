import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";

import {
  createTodo,
  deleteTodo,
  getTodo,
  getTodosByList,
  getTodosByOwner,
  toggleTodoComplete,
  updateTodo,
  type TodoCreateInput,
  type TodoUpdateInput,
} from "../../api/todos";
import type { Todo } from "../../api/types";

export const todoQueryKeys = {
  all: ["todos"] as const,
  collections: () => [...todoQueryKeys.all, "collection"] as const,
  owner: (ownerId: number) =>
    [...todoQueryKeys.collections(), "owner", ownerId] as const,
  list: (listId: string) =>
    [...todoQueryKeys.collections(), "list", listId] as const,
  detail: (todoId: number) =>
    [...todoQueryKeys.all, "detail", todoId] as const,
};

const todoMutationKeys = {
  create: ["todos", "mutation", "create"] as const,
  update: ["todos", "mutation", "item", "update"] as const,
  toggle: ["todos", "mutation", "item", "toggle"] as const,
  delete: ["todos", "mutation", "item", "delete"] as const,
};

export function ownerTodosQueryOptions(ownerId: number) {
  return queryOptions({
    queryKey: todoQueryKeys.owner(ownerId),
    queryFn: ({ signal }) => getTodosByOwner(ownerId, signal),
  });
}

export function listTodosQueryOptions(listId: string) {
  return queryOptions({
    queryKey: todoQueryKeys.list(listId),
    queryFn: ({ signal }) => getTodosByList(listId, signal),
  });
}

export function todoQueryOptions(todoId: number) {
  return queryOptions({
    queryKey: todoQueryKeys.detail(todoId),
    queryFn: ({ signal }) => getTodo(todoId, signal),
  });
}

function updateTodoCaches(queryClient: QueryClient, todo: Todo) {
  queryClient.setQueryData(todoQueryKeys.detail(todo.id), todo);
  return queryClient.invalidateQueries({
    queryKey: todoQueryKeys.collections(),
  });
}

export function createTodoMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: todoMutationKeys.create,
    mutationFn: (input: TodoCreateInput) => createTodo(input),
    onSuccess: (todo) => updateTodoCaches(queryClient, todo),
  });
}

interface UpdateTodoVariables {
  todoId: number;
  input: TodoUpdateInput;
}

interface TodoIdVariables {
  todoId: number;
}

export function updateTodoMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: todoMutationKeys.update,
    mutationFn: ({ todoId, input }: UpdateTodoVariables) =>
      updateTodo(todoId, input),
    onSuccess: (todo) => updateTodoCaches(queryClient, todo),
  });
}

export function toggleTodoMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: todoMutationKeys.toggle,
    mutationFn: ({ todoId }: TodoIdVariables) =>
      toggleTodoComplete(todoId),
    onSuccess: (todo) => updateTodoCaches(queryClient, todo),
  });
}

export function deleteTodoMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationKey: todoMutationKeys.delete,
    mutationFn: ({ todoId }: TodoIdVariables) => deleteTodo(todoId),
    onSuccess: (_data, { todoId }) => {
      queryClient.removeQueries({
        queryKey: todoQueryKeys.detail(todoId),
        exact: true,
      });
      return queryClient.invalidateQueries({
        queryKey: todoQueryKeys.collections(),
      });
    },
  });
}
