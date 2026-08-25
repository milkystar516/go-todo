export interface TodoRuleWriteInput {
  rule_name: string;
  content_schema: RJSFSchema;
  ui_schema: UiSchema;
  list_columns: ListColumn[];
}