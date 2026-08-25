import { apiJson, apiRequest } from "./client";
import type { Todo } from "./types";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export interface TodoCreateInput {
  rule_id: number,
  content: JSON
}

export interface TodoUpdateInput {
  content: JSON
}

export function listTodos(
  signal?: AbortSignal,
): Promise<Todo[]> {
  return apiJson<Todo[]>("/todos", { signal });
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
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function toggleTodoCompleted(
  todoId: number,
): Promise<Todo> {
  return apiJson<Todo>(`/todos/${todoId}`, {
    method: "PATCH",
    headers: jsonHeaders,
  });
}

export async function deleteTodo(
  todoId: number,
): Promise<void> {
  await apiRequest(`/todos/${todoId}`, {
    method: "DELETE",
  });
}