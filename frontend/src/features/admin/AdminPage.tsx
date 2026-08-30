import type { ComponentType } from "react"
import { useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { useIsMobile } from "#hooks/use-mobile"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#components/ui/resizable"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#components/ui/tabs"

import { TodoRulesSection } from "./components/TodoRulesSection"
import { UsersSection } from "./components/UsersSection"
import { TodoRuleDetailPanel } from "../todoRules/components/TodoRuleDetailPanel"

interface AdminTabComponentProps {
  selectedRuleId: number | null
  onSelectRule: (ruleId: number) => void
}

let transitionSequence = 0

function runAdminViewTransition(
  kind: "open" | "close" | "switch",
  update: () => void,
) {
  const transitionId = String(++transitionSequence)
  const root = document.documentElement
  root.dataset.adminTransition = kind
  root.dataset.adminTransitionId = transitionId

  if (!shouldUseViewTransition()) {
    update()
    delete root.dataset.adminTransition
    delete root.dataset.adminTransitionId
    return
  }

  const transition = document.startViewTransition(() => {
    flushSync(update)
  })

  const cleanup = () => {
    if (root.dataset.adminTransitionId === transitionId) {
      delete root.dataset.adminTransition
      delete root.dataset.adminTransitionId
    }
  }

  void transition.finished.then(cleanup, cleanup)
}

function shouldUseViewTransition() {
  return (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function TodoRulesTab({
  selectedRuleId,
  onSelectRule,
}: AdminTabComponentProps) {
  return (
    <TodoRulesSection
      selectedRuleId={selectedRuleId}
      onSelectRule={onSelectRule}
    />
  )
}

function UsersTab(_props: AdminTabComponentProps) {
  return <UsersSection />
}

function AdminPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("rules")
  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)
  const adminTabs = [
    {
      value: "rules",
      label: t("admin.todoRulesTab"),
      component: TodoRulesTab,
    },
    {
      value: "users",
      label: t("admin.usersTab"),
      component: UsersTab,
    },
  ] satisfies ReadonlyArray<{
    value: string
    label: string
    component: ComponentType<AdminTabComponentProps>
  }>

  function selectRule(ruleId: number) {
    runAdminViewTransition(
      selectedRuleId === null ? "open" : "switch",
      () => setSelectedRuleId(ruleId),
    )
  }

  function closeRulePanel() {
    runAdminViewTransition("close", () => setSelectedRuleId(null))
  }

  function changeTab(value: string) {
    if (value !== "rules" && selectedRuleId !== null) {
      runAdminViewTransition("close", () => {
        setActiveTab(value)
        setSelectedRuleId(null)
      })
      return
    }

    setActiveTab(value)
  }

  function expandRuleDetail() {
    if (selectedRuleId === null) {
      return
    }

    navigate(`/admin/todo-rules/${selectedRuleId}`, {
      viewTransition: shouldUseViewTransition(),
    })
  }

  const tabs = (
    <Tabs
      value={activeTab}
      onValueChange={changeTab}
      className="space-y-6 [view-transition-name:admin-tabs]"
    >
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
            <Component
              selectedRuleId={selectedRuleId}
              onSelectRule={selectRule}
            />
          </TabsContent>
        )
      })}
    </Tabs>
  )

  return (
    <AppPage size="wide">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

      {selectedRuleId === null ? (
        tabs
      ) : (
        <ResizablePanelGroup
          orientation={isMobile ? "vertical" : "horizontal"}
          className="min-h-144"
        >
          <ResizablePanel
            id="admin-tabs"
            defaultSize={isMobile ? "45" : "58"}
            minSize={isMobile ? "25" : "35"}
          >
            <div className="h-full overflow-y-auto">{tabs}</div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          <ResizablePanel
            id="todo-rule-detail"
            defaultSize={isMobile ? "55" : "42"}
            minSize={isMobile ? "35" : "30"}
            maxSize={isMobile ? "75" : "65"}
          >
            <div className="h-full overflow-hidden rounded-lg border">
              <TodoRuleDetailPanel
                ruleId={selectedRuleId}
                onExpand={expandRuleDetail}
                onClose={closeRulePanel}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </AppPage>
  )
}

export { AdminPage as Component }
