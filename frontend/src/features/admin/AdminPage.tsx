import { useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet } from "react-router"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { useIsMobile } from "#hooks/use-mobile"
import { buttonVariants } from "#components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#components/ui/resizable"
import { cn } from "#lib/utils"

import { TodoRuleDetailPanel } from "../todoRules/components/TodoRuleDetailPanel"
import {
  adminTabs,
  type AdminTabComponentProps,
} from "./adminTabs"

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

function AdminPage() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)

  function selectRule(ruleId: number) {
    runAdminViewTransition(
      selectedRuleId === null ? "open" : "switch",
      () => setSelectedRuleId(ruleId),
    )
  }

  function closeRulePanel() {
    runAdminViewTransition("close", () => setSelectedRuleId(null))
  }

  const adminContent = (
    <div className="space-y-6 [view-transition-name:admin-tabs]">
      <nav
        aria-label={t("admin.title")}
        className="flex w-full items-center gap-1 border-b"
      >
        {adminTabs.map((tab) => (
          <NavLink
            key={tab.value}
            to={tab.to}
            viewTransition
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-none border-b-2 border-transparent",
                isActive && "border-foreground text-foreground",
              )
            }
            onClick={() => {
              if (tab.value !== "rules" && selectedRuleId !== null) {
                setSelectedRuleId(null)
              }
            }}
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>

      <Outlet
        context={{
          selectedRuleId,
          onSelectRule: selectRule,
        } satisfies AdminTabComponentProps}
      />
    </div>
  )

  return (
    <AppPage size="wide">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

      {selectedRuleId === null ? (
        adminContent
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
            <div className="h-full overflow-y-auto">{adminContent}</div>
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
