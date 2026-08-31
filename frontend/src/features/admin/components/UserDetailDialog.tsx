import { useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROLES, type Role, type User } from "../../../api/types"
import { getErrorMessage } from "../../../lib/apiError"
import {
  currentUserQueryOptions,
  updateUserRoleMutationOptions,
  userQueryOptions,
} from "../../auth/queries"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select"
import { Skeleton } from "#components/ui/skeleton"

interface UserDetailDialogProps {
  userId: number
  onClose: () => void
}

function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value)
}

export function UserDetailDialog({
  userId,
  onClose,
}: UserDetailDialogProps) {
  const { t } = useTranslation()
  const userQuery = useQuery(userQueryOptions(userId))
  const currentUserQuery = useQuery(currentUserQueryOptions)
  const user = userQuery.data
  const currentUser = currentUserQuery.data
  const [isRoleMutationPending, setIsRoleMutationPending] =
    useState(false)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isRoleMutationPending) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("admin.users.detail.title")}
          </DialogTitle>

          <DialogDescription>
            {t("admin.users.detail.description")}
          </DialogDescription>
        </DialogHeader>

        {(userQuery.isPending || currentUserQuery.isPending) && (
          <UserDetailSkeleton />
        )}

        {(userQuery.isError || currentUserQuery.isError) && (
          <p className="text-sm text-destructive" role="alert">
            {getErrorMessage(
              userQuery.error ?? currentUserQuery.error,
              t("common.requestFailed"),
            )}
          </p>
        )}

        {!currentUserQuery.isPending &&
          !currentUserQuery.isError &&
          !currentUser && (
            <p className="text-sm text-destructive" role="alert">
              {t("common.requestFailed")}
            </p>
          )}

        {user && currentUser ? (
          <UserRoleEditor
            key={user.id}
            user={user}
            currentUser={currentUser}
            onPendingChange={setIsRoleMutationPending}
            onClose={onClose}
          />
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function UserDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

interface UserRoleEditorProps {
  user: User
  currentUser: User
  onPendingChange: (isPending: boolean) => void
  onClose: () => void
}

function UserRoleEditor({
  user,
  currentUser,
  onPendingChange,
  onClose,
}: UserRoleEditorProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [role, setRole] = useState<Role>(user.role)
  const roleMutation = useMutation(
    updateUserRoleMutationOptions(queryClient),
  )
  const isOwnUser = user.id === currentUser.id

  function handleRoleChange(value: string) {
    if (isRole(value)) {
      roleMutation.reset()
      setRole(value)
    }
  }

  function handleConfirm() {
    if (role === user.role || isOwnUser) {
      return
    }

    onPendingChange(true)

    roleMutation.mutate(
      { userId: user.id, role },
      {
        onSuccess: onClose,
        onSettled: () => {
          onPendingChange(false)
        },
      },
    )
  }

  return (
    <>
      <div className="space-y-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{t("admin.users.id")}</dt>
          <dd>{user.id}</dd>

          <dt className="text-muted-foreground">
            {t("admin.users.username")}
          </dt>
          <dd>{user.username}</dd>

          <dt className="text-muted-foreground">
            {t("admin.users.nickname")}
          </dt>
          <dd>{user.nickname ?? "—"}</dd>
        </dl>

        <div className="space-y-2">
          <label htmlFor="user-role" className="text-sm font-medium">
            {t("admin.users.role")}
          </label>

          <Select
            value={role}
            onValueChange={handleRoleChange}
            disabled={isOwnUser || roleMutation.isPending}
          >
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {ROLES.map((roleOption) => (
                <SelectItem key={roleOption} value={roleOption}>
                  {t(`admin.users.roles.${roleOption}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isOwnUser && (
            <p className="text-xs text-muted-foreground">
              {t("admin.users.detail.ownRole")}
            </p>
          )}
        </div>

        {roleMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getErrorMessage(
              roleMutation.error,
              t("common.requestFailed"),
            )}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={roleMutation.isPending}
        >
          {t("common.cancel")}
        </Button>

        <Button
          type="button"
          disabled={
            role === user.role || isOwnUser || roleMutation.isPending
          }
          onClick={handleConfirm}
        >
          {roleMutation.isPending
            ? t("admin.users.detail.saving")
            : t("common.confirm")}
        </Button>
      </DialogFooter>
    </>
  )
}
