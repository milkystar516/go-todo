import { useState } from "react"

import { cn } from "#lib/utils"

import { TodoRuleDetailPanel } from "./components/TodoRuleDetailPanel"
import { TodoRuleSection } from "./components/TodoRuleSection"

export function TodoRulePage() {
  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)

  const detailOpen = selectedRuleId !== null

  return (
    <div
      className={cn(
        "grid min-w-0 items-start",
        "grid-cols-1",
        "md:transition-[grid-template-columns]",
        "md:duration-200",
        "md:ease-out",
        "motion-reduce:transition-none",
        detailOpen
          ? "md:grid-cols-[minmax(0,1fr)_29rem]"
          : "md:grid-cols-[minmax(0,1fr)_0rem]",
      )}
    >
      <div className="min-w-0">
        <TodoRuleSection
          selectedRuleId={selectedRuleId}
          onSelectRule={setSelectedRuleId}
        />
      </div>

      <div
        className={cn(
          "min-w-0 overflow-hidden",
          detailOpen && "md:pl-4",
        )}
      >
        {selectedRuleId !== null && (
          <TodoRuleDetailPanel
            ruleId={selectedRuleId}
            onClose={() => setSelectedRuleId(null)}
          />
        )}
      </div>
    </div>
  )
}