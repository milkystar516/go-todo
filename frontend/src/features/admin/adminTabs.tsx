import { lazy, Suspense, type ComponentType } from "react"

interface AdminTabDefinition {
  value: string
  path: string
  to: string
  labelKey: string
  component: ComponentType
}

const TodoRulesTab = lazy(async () => {
  const { TodoRulePage } = await import(
    "../todoRules/TodoRulePage"
  )

  return { default: TodoRulePage }
})

const UsersTab = lazy(async () => {
  const { UsersSection } = await import(
    "./components/UsersSection"
  )

  return { default: UsersSection }
})

export const adminTabs = [
  {
    value: "rules",
    path: "todo-rules",
    to: "/admin/todo-rules",
    labelKey: "admin.todoRulesTab",
    component: TodoRulesTab,
  },
  {
    value: "users",
    path: "users",
    to: "/admin/users",
    labelKey: "admin.usersTab",
    component: UsersTab,
  },
] satisfies ReadonlyArray<AdminTabDefinition>

export function AdminTabRoute({
  component: Component,
}: Pick<AdminTabDefinition, "component">) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  )
}