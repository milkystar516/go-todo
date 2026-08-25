import { apiJson, apiRequest } from "./client";
import type { Todo } from "./types";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export interface TodoCreateInput {
  list_id: string;
  rule_id?: number;
  content: Record<string, unknown>;
}

export interface TodoUpdateInput {
  content: Record<string, unknown>;
}

export function listTodos(
  ownerId: number,
  signal?: AbortSignal,
): Promise<Todo[]> {
  return apiJson<Todo[]>(`/users/${ownerId}/todos`, { signal });
}

export function listTodosByList(
  listId: string,
  signal?: AbortSignal,
): Promise<Todo[]> {
  return apiJson<Todo[]>(`/lists/${listId}/todos`, { signal });
}

export function getTodo(
  todoId: number,
  signal?: AbortSignal,
): Promise<Todo> {
  return apiJson<Todo>(`/todos/${todoId}`, { signal });
}

export function createTodo(
  input: TodoCreateInput,
): Promise<Todo> {
  return apiJson<Todo>("/todos", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function updateTodo(
  todoId: number,
  input: TodoUpdateInput,
): Promise<Todo> {
  return apiJson<Todo>(`/todos/${todoId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function toggleTodoComplete(
  todoId: number,
): Promise<Todo> {
  return apiJson<Todo>(`/todos/${todoId}/complete`, {
    method: "PATCH",
  });
}

export async function deleteTodo(
  todoId: number,
): Promise<void> {
  await apiRequest(`/todos/${todoId}`, {
    method: "DELETE",
  });
}
