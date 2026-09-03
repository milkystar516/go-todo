import { useCallback, useRef, useState } from "react"

import { useClickOutside } from "#hooks/use-click-outside"
import { cn } from "#lib/utils"

import { TodoRuleDetailPanel } from "./components/TodoRuleDetailPanel"
import { TodoRuleSection } from "./components/TodoRuleSection"

export function TodoRulePage() {
  const [selectedRuleId, setSelectedRuleId] =
    useState<number | null>(null)

  const detailPanelRef = useRef<HTMLDivElement>(null)

  const detailOpen = selectedRuleId !== null

  const handleClickOutside = useCallback(
    (event: PointerEvent) => {
      const target = event.target

      if (
        target instanceof Element &&
        target.closest("[data-keep-rule-detail-open]")
      ) {
        return
      }

      setSelectedRuleId(null)
    },
    [],
  )

  useClickOutside(detailPanelRef, handleClickOutside)

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
          <div ref={detailPanelRef}>
            <TodoRuleDetailPanel
              ruleId={selectedRuleId}
              onClose={() => setSelectedRuleId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}