import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ListTodoIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"

import type { TodoList } from "../api/types"
import { ConfirmActionDialog } from "#components/common/ConfirmActionDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "#components/ui/sidebar"
import { currentUserQueryOptions } from "../features/auth/queries"
import {
  leaveTodoListMutationOptions,
  todoListsQueryOptions,
} from "../features/todoLists/queries"
import { getErrorMessage } from "../lib/apiError"

export function NavTodoLists() {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserQuery = useQuery(currentUserQueryOptions)
  const listsQuery = useQuery(todoListsQueryOptions)
  const [leavingList, setLeavingList] = useState<TodoList | null>(null)
  const leaveMutation = useMutation(
    leaveTodoListMutationOptions(
      queryClient,
      currentUserQuery.data?.id ?? 0,
    ),
  )

  function selectListToLeave(list: TodoList) {
    leaveMutation.reset()
    setLeavingList(list)
  }

  async function handleLeave() {
    if (!leavingList || !currentUserQuery.data) {
      return
    }

    const listPath = `/lists/${leavingList.id}`

    await leaveMutation.mutateAsync(leavingList.id)

    if (
      location.pathname === listPath ||
      location.pathname.startsWith(`${listPath}/`)
    ) {
      navigate("/")
    }
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("sidebar.todoLists.title")}</SidebarGroupLabel>
        <SidebarGroupAction
          type="button"
          aria-label={t("sidebar.todoLists.add")}
          title={t("sidebar.todoLists.addUnavailable")}
          disabled
          className="disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon />
        </SidebarGroupAction>

        <SidebarGroupContent>
          <SidebarMenu>
            {listsQuery.isPending &&
              Array.from({ length: 3 }, (_, index) => (
                <SidebarMenuSkeleton key={index} showIcon />
              ))}

            {listsQuery.isError && (
              <SidebarMenuItem>
                <p className="px-3 py-2 text-xs text-destructive" role="alert">
                  {t("sidebar.todoLists.loadFailed")}
                </p>
              </SidebarMenuItem>
            )}

            {listsQuery.data?.length === 0 && (
              <SidebarMenuItem>
                <p className="px-3 py-2 text-xs text-sidebar-foreground/60">
                  {t("sidebar.todoLists.empty")}
                </p>
              </SidebarMenuItem>
            )}

            {listsQuery.data?.map((list) => {
              const url = `/lists/${list.id}`
              const isActive =
                location.pathname === url ||
                location.pathname.startsWith(`${url}/`)

              return (
                <SidebarMenuItem key={list.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={list.name}
                  >
                    <Link to={url}>
                      <ListTodoIcon />
                      <span>{list.name}</span>
                    </Link>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction
                        type="button"
                        showOnHover
                        aria-label={t("sidebar.todoLists.options", {
                          name: list.name,
                        })}
                      >
                        <MoreHorizontalIcon />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side={isMobile ? "bottom" : "right"}
                      align="start"
                    >
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => selectListToLeave(list)}
                      >
                        <LogOutIcon />
                        {t("sidebar.todoLists.leave")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <ConfirmActionDialog
        open={leavingList !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLeavingList(null)
          }
        }}
        title={t("sidebar.todoLists.leaveTitle")}
        description={t("sidebar.todoLists.leaveDescription", {
          name: leavingList?.name,
        })}
        confirmLabel={t("sidebar.todoLists.leave")}
        isPending={leaveMutation.isPending}
        errorMessage={
          leaveMutation.isError
            ? getErrorMessage(
                leaveMutation.error,
                t("common.requestFailed"),
              )
            : null
        }
        onConfirm={handleLeave}
      />
    </>
  )
}
