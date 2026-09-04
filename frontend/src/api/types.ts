import type { RJSFSchema, UiSchema } from "@rjsf/utils";

export const ROLES = ["user", "admin"] as const;

export type Role = (typeof ROLES)[number];

export interface User {
  id: number;
  username: string;
  nickname: string | null;
  role: Role;
}

export interface ListColumn {
  pointer: string;
  label: string;
}

export type UserSummary = Pick<
  User,
  "id" | "username" | "nickname"
>;

export interface TodoRule {
  id: number;
  rule_name: string;
  updated_at: string;
  updated_by: UserSummary | null;
}

export interface TodoRuleDetail extends TodoRule {
  content_schema: RJSFSchema;
  ui_schema: UiSchema;
  list_columns: ListColumn[];
  created_at: string;
  created_by: UserSummary | null;
}

export interface TodoList {
  id: string;
  name: string;
  default_rule_id: number;
}

export type TodoListMemberRole = "member" | "owner";

export interface TodoListMember {
  id: number;
  username: string;
  nickname: string | null;
  role: TodoListMemberRole;
}

export interface Todo {
  id: number;
  owner_id: number;
  list_id: string;
  rule_id: number;
  title: string;
  due_at: string | null;
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
  RULE_IN_USE: "/problems/rule-in-use",
  DEFAULT_RULE_PROTECTED: "/problems/default-rule-protected",
} as const;

export type KnownProblemType =
  (typeof PROBLEM_TYPE)[keyof typeof PROBLEM_TYPE];

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
}
