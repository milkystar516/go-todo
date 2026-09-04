import { useTranslation } from "react-i18next"

import type { User } from "../../../api/types"
import {
  TableCell,
  TableRow,
} from "#components/ui/table"

interface UserTableRowProps {
  user: User
  onSelect: () => void
}

export function UserTableRow({
  user,
  onSelect,
}: UserTableRowProps) {
  const { t } = useTranslation()

  return (
    <TableRow
      className="cursor-pointer"
      onClick={onSelect}
    >
      <TableCell>
        <button
          type="button"
          className="rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t(
            "admin.users.detail.open",
            {
              username: user.username,
            },
          )}
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
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
  )
}