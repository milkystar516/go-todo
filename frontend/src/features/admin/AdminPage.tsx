import { Outlet } from "react-router"

import { AppPage } from "../../app/components/AppPage"

import { AdminNavigation } from "./components/AdminNavigation"

function AdminPage() {
  return (
    <AppPage size="wide">
      <AdminNavigation />
      <Outlet />
    </AppPage>
  )
}

export { AdminPage as Component }