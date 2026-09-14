import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LogOutIcon } from "lucide-react"
import { useNavigate } from "react-router"

import { logout } from "../../api/auth"
import { currentUserQueryOptions } from "../../features/auth/queries"
import { clearSessionCache } from "../../features/auth/sessionCache"
import { Button } from "#components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"

export function UserDropdown() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { data: currentUser } =
    useQuery(currentUserQueryOptions)

  const logoutMutation = useMutation({
    mutationFn: logout,

    onSuccess: () => {
      clearSessionCache(queryClient)
      navigate("/login", { replace: true })
    },
  })

  if (!currentUser) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
            variant="ghost"
            className="h-auto min-w-28 flex-col items-end gap-0 px-3 py-1.5 text-right"
            >
            <span className="text-sm font-medium">
                {currentUser.nickname ?? currentUser.username}
            </span>

            {currentUser.nickname && (
                <span className="text-xs text-muted-foreground">
                @{currentUser.username}
                </span>
            )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-48"
      >
        <DropdownMenuItem
          onSelect={() =>
            logoutMutation.mutate()
          }
          disabled={logoutMutation.isPending}
        >
          <LogOutIcon />
          {t("header.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}