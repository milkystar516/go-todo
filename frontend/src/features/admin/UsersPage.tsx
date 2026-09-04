import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { AppPage } from "../../app/components/AppPage"
import { getErrorMessage } from "../../lib/apiError"
import { usersQueryOptions } from "../auth/queries"

import { AdminHeader } from "./components/AdminHeader"
import { UserDetailDialog } from "./components/UserDetailDialog"
import { UsersTable } from "./components/UserTable"

function UsersPage() {
  const { t } = useTranslation()
  const [selectedUserId, setSelectedUserId] =
    useState<number | null>(null)

  const usersQuery = useQuery(usersQueryOptions)

  return (
    <AppPage size="wide">
      <AdminHeader />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">
            {t("admin.users.title")}
          </h2>

          <p className="text-sm text-muted-foreground">
            {t("admin.users.description")}
          </p>
        </div>

        {usersQuery.isPending ? (
          <UsersTable loading />
        ) : usersQuery.isError ? (
          <p
            className="text-sm text-destructive"
            role="alert"
          >
            {getErrorMessage(
              usersQuery.error,
              t("common.requestFailed"),
            )}
          </p>
        ) : (
          <UsersTable
            users={usersQuery.data}
            onSelectUser={setSelectedUserId}
          />
        )}
      </section>

      {selectedUserId !== null && (
        <UserDetailDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </AppPage>
  )
}

export { UsersPage as Component }