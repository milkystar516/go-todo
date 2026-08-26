import { apiJson, apiRequest, isApiErrorOfType } from "./client";
import { PROBLEM_TYPE, type Role, type User } from "./types";

export interface LoginInput {
  username: string;
  password: string;
}

export interface SignupInput {
  username: string;
  nickname: string | null;
  password: string;
}

const jsonHeaders = {
  "Content-Type": "application/json",
};

export async function login(input: LoginInput): Promise<void> {
  await apiRequest("/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await apiRequest("/logout", {
    method: "DELETE",
  });
}

export async function signup(input: SignupInput): Promise<void> {
  await apiRequest("/signup", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<User | null> {
  try {
    return await apiJson<User>("/me", {
      signal,
    });
  } catch (error) {
    if (
      isApiErrorOfType(
        error,
        PROBLEM_TYPE.AUTHENTICATION_REQUIRED,
      )
    ) {
      return null;
    }

    throw error;
  }
}

export function getUser(
  userId: number,
  signal?: AbortSignal,
): Promise<User> {
  return apiJson<User>(`/users/${userId}`, { signal });
}

export function listUsers(
  signal?: AbortSignal,
): Promise<User[]> {
  return apiJson<User[]>("/users", { signal });
}

export function updateUserRole(
  userId: number,
  role: Role,
): Promise<User> {
  return apiJson<User>(`/users/${userId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ role }),
  });
}
