import {
  PROBLEM_TYPE,
  type ApiProblem,
  type KnownProblemType,
} from "./types";

const API_PREFIX = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.detail ?? problem.title);

    this.name = "ApiError";
    this.status = problem.status;
    this.problem = problem;
  }
}

export function isApiErrorOfType(
  error: unknown,
  type: KnownProblemType,
): error is ApiError {
  return error instanceof ApiError && error.problem.type === type;
}

async function readProblem(response: Response): Promise<ApiProblem> {
  try {
    const problem = await response.json() as Partial<ApiProblem>;

    return {
      type:
        typeof problem.type === "string"
          ? problem.type
          : PROBLEM_TYPE.ABOUT_BLANK,
      title:
        typeof problem.title === "string"
          ? problem.title
          : response.statusText || "Request failed",
      status: response.status,
      ...(typeof problem.detail === "string"
        ? { detail: problem.detail }
        : {}),
    };
  } catch {
    return {
      type: PROBLEM_TYPE.ABOUT_BLANK,
      title: response.statusText || "Request failed",
      status: response.status,
    };
  }
}

export async function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${API_PREFIX}${path}`, init);

  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }

  return response;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiRequest(path, init);

  return response.json() as Promise<T>;
}
