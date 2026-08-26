import { useTranslation } from "react-i18next"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#components/ui/tabs"

import { TodoRulesSection } from "./components/TodoRulesSection"
import { UsersSection } from "./components/UsersSection"

export function AdminPage() {
  const { t } = useTranslation()
  const adminTabs = [
    {
      value: "rules",
      label: t("admin.todoRulesTab"),
      component: TodoRulesSection,
    },
    {
      value: "users",
      label: t("admin.usersTab"),
      component: UsersSection,
    },
  ] as const

  return (
    <AppPage size="wide">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList variant="line" className="w-full justify-start">
          {adminTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {adminTabs.map((tab) => {
          const Component = tab.component

          return (
            <TabsContent key={tab.value} value={tab.value}>
              <Component />
            </TabsContent>
          )
        })}
      </Tabs>
    </AppPage>
  )
}
