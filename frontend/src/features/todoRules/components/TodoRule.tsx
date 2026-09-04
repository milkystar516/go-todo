import type { TodoRule as TodoRuleData } from "../../../api/types"
import {
  TableCell,
  TableRow,
} from "#components/ui/table"

import type { TodoRuleTableColumn } from "./TodoRuleTable"

interface TodoRuleProps {
  rule: TodoRuleData
  columns: TodoRuleTableColumn[]
  selected: boolean
  onSelect: () => void
}

export function TodoRule({
  rule,
  columns,
  selected,
  onSelect,
}: TodoRuleProps) {
  return (
    <TableRow
      className="cursor-pointer"
      data-state={
        selected ? "selected" : undefined
      }
      data-keep-rule-detail-open
      onClick={onSelect}
    >
      {columns.map((column) => (
        <TableCell key={column.id}>
          {column.cell(rule, onSelect)}
        </TableCell>
      ))}
    </TableRow>
  )
}