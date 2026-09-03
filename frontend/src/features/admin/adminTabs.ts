interface AdminTabDefinition {
  value: string
  to: string
  labelKey: string
}

export const adminTabs = [
  {
    value: "rules",
    to: "/admin/todo-rules",
    labelKey: "admin.todoRulesTab",
  },
  {
    value: "users",
    to: "/admin/users",
    labelKey: "admin.usersTab",
  },
] satisfies readonly AdminTabDefinition[]