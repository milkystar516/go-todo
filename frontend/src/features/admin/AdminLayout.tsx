import {
  Outlet,
  useMatches,
  type UIMatch,
} from "react-router"

import { AdminHeader } from "./components/AdminHeader"
import { AppPage } from "../../app/components/AppPage"

export interface AdminLayoutHandle {
  showAdminHeader?: (
    match: UIMatch,
  ) => boolean
}

export function AdminLayout() {
  const matches = useMatches()

  const visibilityMatch = [...matches]
    .reverse()
    .find((match) => {
      const handle =
        match.handle as
          | AdminLayoutHandle
          | undefined

      return handle?.showAdminHeader
    })

  const handle =
    visibilityMatch?.handle as
      | AdminLayoutHandle
      | undefined

  const showAdminHeader =
    handle?.showAdminHeader &&
    visibilityMatch
      ? handle.showAdminHeader(
          visibilityMatch,
        )
      : true

  return (
    <AppPage size="wide">
      {showAdminHeader && (
        <AdminHeader />
      )}

      <Outlet />
    </AppPage>
  )
}