import {
  useMemo,
  useState,
  type SubmitEvent,
} from "react";
import { useTranslation } from "react-i18next";

import type { TodoListWriteInput } from "../../../api/todoLists";
import type { TodoRule, User } from "../../../api/types";

import { Button } from "#components/ui/button";
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
} from "#components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import { Spinner } from "#components/ui/spinner";

type TodoListFormUser = Pick<
  User,
  "id" | "username" | "nickname"
>;

export interface TodoListFormInitialValue {
  name: string;
  defaultRuleId: number;
  members: TodoListFormUser[];
}

export interface TodoListFormValue {
  list: TodoListWriteInput;
  memberIds: number[];
}

interface TodoListFormProps {
  initialValue?: TodoListFormInitialValue;
  rules: TodoRule[];
  users: TodoListFormUser[];
  isPending?: boolean;
  errorMessage?: string | null;
  submitLabel?: string;
  onSubmit: (
    value: TodoListFormValue,
  ) => void | Promise<void>;
  onCancel?: () => void;
}

function getUserLabel(user: TodoListFormUser) {
  if (user.nickname?.trim()) {
    return `${user.nickname} (@${user.username})`;
  }

  return `@${user.username}`;
}

function getUserSearchValue(user: TodoListFormUser) {
  return user.nickname
    ? `${user.nickname} ${user.username}`
    : user.username;
}

export function TodoListForm({
  initialValue,
  rules,
  users,
  isPending = false,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoListFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(initialValue?.name ?? "");
  const [defaultRuleId, setDefaultRuleId] = useState<number | null>(
    initialValue?.defaultRuleId ?? null,
  );
  const [memberIds, setMemberIds] = useState<number[]>(
    () => initialValue?.members.map((member) => member.id) ?? [],
  );
  const [formError, setFormError] = useState<string | null>(null);

  const selectedMembers = useMemo(
    () => users.filter((user) => memberIds.includes(user.id)),
    [memberIds, users],
  );

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFormError(null);

    const normalizedName = name.trim();

    if (!normalizedName) {
      setFormError(t("todoLists.form.nameRequired"));
      return;
    }

    if (defaultRuleId === null) {
      setFormError(
        t("todoLists.form.defaultRuleRequired"),
      );
      return;
    }

    try {
      await onSubmit({
        list: {
          name: normalizedName,
          default_rule_id: defaultRuleId,
        },
        memberIds,
      });
    } catch {
      // The owning mutation renders its error without losing form state.
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="todo-list-name">
            {t("todoLists.form.title")}
          </FieldLabel>

          <Input
            id="todo-list-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFormError(null);
            }}
            maxLength={50}
            disabled={isPending}
            required
          />
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
              setDefaultRuleId(Number(value));
              setFormError(null);
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
              );
              setFormError(null);
            }}
            itemToStringValue={getUserSearchValue}
            disabled={isPending}
          >
            <ComboboxChips className="w-full">
              <ComboboxValue>
                {(members: TodoListFormUser[]) => (
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
                {(user: TodoListFormUser) => (
                  <ComboboxItem
                    key={user.id}
                    value={user}
                  >
                    <div className="min-w-0">
                      <div className="truncate">
                        {user.nickname ?? user.username}
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
            {t("todoLists.form.membersDescription")}
          </FieldDescription>
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

        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner aria-hidden="true" />}
          {submitLabel ?? t("common.save")}
        </Button>
      </div>
    </form>
  );
}