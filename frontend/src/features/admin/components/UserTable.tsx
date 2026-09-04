import { useTranslation } from "react-i18next"

import type { User } from "../../../api/types"
import { Skeleton } from "#components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import { UserTableRow } from "./UserTableRow"

interface UsersTableProps {
  users?: User[]
  loading?: boolean
  onSelectUser?: (userId: number) => void
}

export function UsersTable({
  users = [],
  loading = false,
  onSelectUser,
}: UsersTableProps) {
  const { t } = useTranslation()

  return (
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
          {loading ? (
            <>
              <UsersTableSkeletonRow />
              <UsersTableSkeletonRow />
              <UsersTableSkeletonRow />
            </>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                {t("admin.users.empty")}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                onSelect={() =>
                  onSelectUser?.(user.id)
                }
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function UsersTableSkeletonRow() {
  return (
    <TableRow>
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
  )
}