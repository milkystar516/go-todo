import { apiJson, apiRequest } from "./client";
import type {
  TodoList,
  TodoListMember,
  TodoListMemberRole,
} from "./types";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export interface TodoListWriteInput {
  name: string;
  default_rule_id: number;
}

export function listTodoLists(
  signal?: AbortSignal,
): Promise<TodoList[]> {
  return apiJson<TodoList[]>("/lists", { signal });
}

export function getTodoList(
  listId: string,
  signal?: AbortSignal,
): Promise<TodoList> {
  return apiJson<TodoList>(`/lists/${listId}`, { signal });
}

export function createTodoList(
  input: TodoListWriteInput,
): Promise<TodoList> {
  return apiJson<TodoList>("/lists", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function updateTodoList(
  listId: string,
  input: TodoListWriteInput,
): Promise<TodoList> {
  return apiJson<TodoList>(`/lists/${listId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export async function deleteTodoList(
  listId: string,
): Promise<void> {
  await apiRequest(`/lists/${listId}`, {
    method: "DELETE",
  });
}

export function listTodoListMembers(
  listId: string,
  signal?: AbortSignal,
): Promise<TodoListMember[]> {
  return apiJson<TodoListMember[]>(`/lists/${listId}/members`, {
    signal,
  });
}

export async function addTodoListMember(
  listId: string,
  userId: number,
): Promise<void> {
  await apiRequest(`/lists/${listId}/members/${userId}`, {
    method: "PUT",
  });
}

export async function removeTodoListMember(
  listId: string,
  userId: number,
): Promise<void> {
  await apiRequest(`/lists/${listId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function updateTodoListMemberRole(
  listId: string,
  userId: number,
  role: TodoListMemberRole,
): Promise<void> {
  await apiRequest(`/lists/${listId}/members/${userId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ role }),
  });
}
