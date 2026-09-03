import { useQuery } from "@tanstack/react-query"

import { todoRuleQueryOptions } from "../queries"
import { TodoRuleDetailFull } from "./TodoRuleDetailFull"
import { TodoRuleDetailPanel } from "./TodoRuleDetailPanel"

interface TodoRuleDetailProps {
  ruleId: number
  mode: "split" | "full"
  onClose: () => void
  onDeleted: () => void
}

export function TodoRuleDetail({
  ruleId,
  mode,
  onClose,
  onDeleted,
}: TodoRuleDetailProps) {
  const todoRuleQuery = useQuery(todoRuleQueryOptions(ruleId))

  return mode === "split" ? (
    <TodoRuleDetailPanel
      ruleId={ruleId}
      todoRuleQuery={todoRuleQuery}
      onClose={onClose}
    />
  ) : (
    <TodoRuleDetailFull
      todoRuleQuery={todoRuleQuery}
      onDeleted={onDeleted}
    />
  )
}