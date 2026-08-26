"use client"

import { useQuery } from "@tanstack/react-query"
import { HomeIcon, ShieldCheckIcon } from "lucide-react"
import type * as React from "react"
import { useTranslation } from "react-i18next"

import { NavMain } from "#components/nav-main"
import { NavTodoLists } from "#components/nav-todo-lists"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "#components/ui/sidebar"
import { currentUserQueryOptions } from "../features/auth/queries"

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const currentUserQuery = useQuery(currentUserQueryOptions)
  const navItems = [
    {
      title: t("sidebar.nav.home"),
      url: "/",
      icon: <HomeIcon />,
    },
    ...(currentUserQuery.data?.role === "admin"
      ? [
          {
            title: t("sidebar.nav.admin"),
            url: "/admin",
            icon: <ShieldCheckIcon />,
          },
        ]
      : []),
  ]

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <NavMain items={navItems} />
      </SidebarHeader>
      <SidebarContent>
        <NavTodoLists />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
