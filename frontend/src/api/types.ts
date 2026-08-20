import type { RJSFSchema } from "@rjsf/utils";

export type Role = "user" | "admin";

export interface User {
  id: number;
  username: string;
  nickname?: string;
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

export interface ApiProblem {
  title: string;
  status: number;
  detail?: string;
}