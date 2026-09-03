import { useTranslation } from "react-i18next"
import { NavLink, Outlet } from "react-router"

import { AppPage } from "../../app/components/AppPage"
import { PageHeader } from "../../app/components/PageHeader"
import { buttonVariants } from "#components/ui/button"
import { cn } from "#lib/utils"

import { adminTabs } from "./adminTabs"

function AdminPage() {
  const { t } = useTranslation()

  return (
    <AppPage size="wide">
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

      <div className="space-y-6">
        <nav
          aria-label={t("admin.title")}
          className="flex w-full items-center gap-1 border-b"
        >
          {adminTabs.map((tab) => (
            <NavLink
              key={tab.value}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  buttonVariants({
                    variant: "ghost",
                    size: "sm",
                  }),
                  "rounded-none border-b-2 border-transparent",
                  isActive &&
                    "border-foreground text-foreground",
                )
              }
            >
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </AppPage>
  )
}

export { AdminPage as Component }