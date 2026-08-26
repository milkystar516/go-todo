import { Plus } from "lucide-react"

import { Button } from "#components/ui/button"

type TodoQuickAddProps = {
  onAdd: () => void
  disabled?: boolean
}

export function TodoQuickAdd({
  onAdd,
  disabled = false,
}: TodoQuickAddProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-12 w-full justify-start gap-3 rounded-lg bg-background px-4 text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
      onClick={onAdd}
      disabled={disabled}
    >
      <Plus className="size-5" />
      <span>할 일 추가</span>
    </Button>
  )
}