import type { RJSFSchema } from "@rjsf/utils";

export type Role = "user" | "admin";

export interface User {
  id: number;
  username: string;
  nickname: string | null;
  role: Role;
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "integer"
  | "boolean"
  | "date"
  | "single_select";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  show_in_list: boolean;
  default_value?: unknown;
  options?: string[];
}

export interface TodoRule {
  id: number;
  rule_name: string;
}

export interface TodoRuleDetail extends TodoRule {
  fields: FieldDefinition[];
  schema: RJSFSchema;
}

export interface Todo {
  id: number;
  owner_id: number;
  rule_id: number;
  content: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export const PROBLEM_TYPE = {
  ABOUT_BLANK: "about:blank",
  AUTHENTICATION_REQUIRED: "/problems/authentication-required",
  INVALID_CREDENTIALS: "/problems/invalid-credentials",
  USERNAME_TAKEN: "/problems/username-taken",
  VALIDATION_FAILED: "/problems/validation-failed",
  CANNOT_CHANGE_OWN_ROLE: "/problems/cannot-change-own-role",
  ROLE_CONFLICT: "/problems/role-conflict",
  RULE_IN_USE: "/problems/rule-in-use",
} as const;

export type KnownProblemType =
  (typeof PROBLEM_TYPE)[keyof typeof PROBLEM_TYPE];

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
}
