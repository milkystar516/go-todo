import type { ComponentType } from "react"

interface AdminTabRouteModule {
  Component: ComponentType
}

interface AdminTabDefinition {
  value: string
  path: string
  to: string
  labelKey: string
  lazy: () => Promise<AdminTabRouteModule>
}

export const adminTabs = [
  {
    value: "rules",
    path: "todo-rules",
    to: "/admin/todo-rules",
    labelKey: "admin.todoRulesTab",
    lazy: async () => {
      const { TodoRulePage } = await import(
        "../todoRules/TodoRulePage"
      )

      return { Component: TodoRulePage }
    },
  },
  {
    value: "users",
    path: "users",
    to: "/admin/users",
    labelKey: "admin.usersTab",
    lazy: async () => {
      const { UsersSection } = await import(
        "./components/UsersSection"
      )

      return { Component: UsersSection }
    },
  },
] satisfies readonly AdminTabDefinition[]