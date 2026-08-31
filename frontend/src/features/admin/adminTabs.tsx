import { lazy, Suspense, type ComponentType } from "react"
import { useOutletContext } from "react-router"

export interface AdminTabComponentProps {
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

interface AdminTabDefinition {
  value: string
  path: string
  to: string
  labelKey: string
  component: ComponentType<AdminTabComponentProps>
}

const TodoRulesTab = lazy(async () => {
  const { TodoRulesSection } = await import(
    "./components/TodoRulesSection"
  )

  return { default: TodoRulesSection }
})

const UsersTab = lazy(async () => {
  const { UsersSection } = await import("./components/UsersSection")

  return {
    default: function UsersAdminTab(_props: AdminTabComponentProps) {
      return <UsersSection />
    },
  }
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
  const props = useOutletContext<AdminTabComponentProps>()

  return (
    <Suspense fallback={null}>
      <Component {...props} />
    </Suspense>
  )
}
