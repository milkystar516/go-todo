"use client"

import type { ReactNode } from "react"
import { Link, useLocation } from "react-router"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: ReactNode
  }[]
}) {
  const location = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.url === "/"
          ? location.pathname === "/"
          : location.pathname === item.url ||
            location.pathname.startsWith(`${item.url}/`)

        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.title}
            >
              <Link to={item.url}>
              {item.icon}
              <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
