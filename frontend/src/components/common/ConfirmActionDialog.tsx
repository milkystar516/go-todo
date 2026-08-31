import type { MouseEvent, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog"
import type { Button } from "#components/ui/button"

interface ConfirmActionDialogProps {
  open: boolean
  title: ReactNode
  description: ReactNode
  confirmLabel: ReactNode
  cancelLabel?: ReactNode
  confirmVariant?: React.ComponentProps<typeof Button>["variant"]
  isPending?: boolean
  errorMessage?: ReactNode
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "destructive",
  isPending = false,
  errorMessage,
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  const { t } = useTranslation()

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    onConfirm()
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          {errorMessage && (
            <div className="text-sm text-destructive" role="alert">
              {errorMessage}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel ?? t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
