import {
  useMemo,
  useState,
  type SubmitEvent,
} from "react"
import { useTranslation } from "react-i18next"

import type { TodoRule, UserSummary } from "../../../api/types"
import { Button } from "#components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "#components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select"
import { Spinner } from "#components/ui/spinner"

export interface TodoListFormValue {
  name: string
  memberIds: number[]
  defaultRuleId: number
}

interface TodoListFormProps {
  rules: TodoRule[]
  users: UserSummary[]
  isPending?: boolean
  errorMessage?: string | null
  onSubmit: (
    value: TodoListFormValue,
  ) => void | Promise<void>
  onCancel?: () => void
}

function getUserLabel(user: UserSummary) {
  if (user.nickname?.trim()) {
    return `${user.nickname} (@${user.username})`
  }

  return `@${user.username}`
}

function getUserSearchValue(user: UserSummary) {
  return user.nickname
    ? `${user.nickname} ${user.username}`
    : user.username
}

export function TodoListForm({
  rules,
  users,
  isPending = false,
  errorMessage,
  onSubmit,
  onCancel,
}: TodoListFormProps) {
  const { t } = useTranslation()

  const [name, setName] = useState("")
  const [memberIds, setMemberIds] = useState<number[]>([])
  const [defaultRuleId, setDefaultRuleId] =
    useState<number | null>(null)
  const [formError, setFormError] =
    useState<string | null>(null)

  const selectedMembers = useMemo(
    () =>
      users.filter((user) =>
        memberIds.includes(user.id),
      ),
    [memberIds, users],
  )

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setFormError(null)

    const normalizedName = name.trim()

    if (!normalizedName) {
      setFormError(
        t("todoLists.form.nameRequired"),
      )
      return
    }

    if (defaultRuleId === null) {
      setFormError(
        t("todoLists.form.defaultRuleRequired"),
      )
      return
    }

    await onSubmit({
      name: normalizedName,
      memberIds,
      defaultRuleId,
    })
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="todo-list-name">
            {t("todoLists.form.name")}
          </FieldLabel>

          <Input
            id="todo-list-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setFormError(null)
            }}
            maxLength={50}
            disabled={isPending}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="todo-list-members">
            {t("todoLists.form.members")}
          </FieldLabel>

          <Combobox
            items={users}
            multiple
            value={selectedMembers}
            onValueChange={(members) => {
              setMemberIds(
                members.map((member) => member.id),
              )
              setFormError(null)
            }}
            itemToStringValue={getUserSearchValue}
            disabled={isPending}
          >
            <ComboboxChips className="w-full">
              <ComboboxValue>
                {(members: UserSummary[]) => (
                  <>
                    {members.map((member) => (
                      <ComboboxChip
                        key={member.id}
                        aria-label={getUserLabel(member)}
                      >
                        {getUserLabel(member)}
                      </ComboboxChip>
                    ))}

                    <ComboboxChipsInput
                      id="todo-list-members"
                      placeholder={
                        members.length === 0
                          ? t(
                              "todoLists.form.membersPlaceholder",
                            )
                          : undefined
                      }
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>

            <ComboboxContent>
              <ComboboxEmpty>
                {t("todoLists.form.noUsers")}
              </ComboboxEmpty>

              <ComboboxList>
                {(user: UserSummary) => (
                  <ComboboxItem
                    key={user.id}
                    value={user}
                  >
                    <div className="min-w-0">
                      <div className="truncate">
                        {user.nickname ??
                          user.username}
                      </div>

                      {user.nickname && (
                        <div className="truncate text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          <FieldDescription>
            {t(
              "todoLists.form.membersDescription",
            )}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="todo-list-default-rule">
            {t("todoLists.form.defaultRule")}
          </FieldLabel>

          <Select
            value={
              defaultRuleId === null
                ? undefined
                : String(defaultRuleId)
            }
            onValueChange={(value) => {
              setDefaultRuleId(Number(value))
              setFormError(null)
            }}
            disabled={isPending}
          >
            <SelectTrigger
              id="todo-list-default-rule"
              className="w-full"
            >
              <SelectValue
                placeholder={t(
                  "todoLists.form.defaultRulePlaceholder",
                )}
              />
            </SelectTrigger>

            <SelectContent>
              {rules.map((rule) => (
                <SelectItem
                  key={rule.id}
                  value={String(rule.id)}
                >
                  {rule.rule_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      {(formError || errorMessage) && (
        <FieldError>
          {formError ?? errorMessage}
        </FieldError>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("common.cancel")}
          </Button>
        )}

        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending && (
            <Spinner aria-hidden="true" />
          )}
          {t("todoLists.create.submit")}
        </Button>
      </div>
    </form>
  )
}