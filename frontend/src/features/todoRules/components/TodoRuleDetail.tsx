import { TodoRuleDetailPage } from "../TodoRuleDetailPage"
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
  return mode === "split" ? (
    <TodoRuleDetailPanel
      ruleId={ruleId}
      onClose={onClose}
    />
  ) : (
    <TodoRuleDetailPage
      ruleId={ruleId}
      onDeleted={onDeleted}
    />
  )
}