import { useTranslation } from "react-i18next"
import { NavLink } from "react-router"

import { PageHeader } from "../../../app/components/PageHeader"
import { buttonVariants } from "#components/ui/button"
import { cn } from "#lib/utils"

import { adminTabs } from "../adminTabs"

export function AdminNavigation() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader
        title={t("admin.title")}
        description={t("admin.description")}
      />

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
    </>
  )
}