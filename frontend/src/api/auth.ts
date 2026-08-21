import { apiJson, apiRequest, isApiErrorOfType } from "./client";
import { PROBLEM_TYPE, type User } from "./types";

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
