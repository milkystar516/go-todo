import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { getErrorMessage } from "../../../lib/apiError"
import { usersQueryOptions } from "../../auth/queries"

import { Skeleton } from "#components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import { UserDetailDialog } from "./UserDetailDialog"

export function UsersSection() {
  const { t } = useTranslation()
  const [selectedUserId, setSelectedUserId] =
    useState<number | null>(null)

  const usersQuery = useQuery(usersQueryOptions)

  if (usersQuery.isPending) {
    return <UsersTableSkeleton />
  }

  if (usersQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {getErrorMessage(
          usersQuery.error,
          t("common.requestFailed"),
        )}
      </p>
    )
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">
          {t("admin.users.title")}
        </h2>

        <p className="text-sm text-muted-foreground">
          {t("admin.users.description")}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t("admin.users.username")}
              </TableHead>

              <TableHead>
                {t("admin.users.nickname")}
              </TableHead>

              <TableHead>
                {t("admin.users.role")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {usersQuery.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("admin.users.empty")}
                </TableCell>
              </TableRow>
            )}

            {usersQuery.data.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => setSelectedUserId(user.id)}
              >
                <TableCell>
                  <button
                    type="button"
                    className="rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("admin.users.detail.open", {
                      username: user.username,
                    })}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedUserId(user.id)
                    }}
                  >
                    {user.username}
                  </button>
                </TableCell>

                <TableCell>
                  {user.nickname ?? "—"}
                </TableCell>

                <TableCell>
                  {t(`admin.users.roles.${user.role}`)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedUserId !== null && (
        <UserDetailDialog
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </section>
  )
}

function UsersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
