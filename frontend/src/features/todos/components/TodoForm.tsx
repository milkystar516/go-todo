import { hashObject } from "@rjsf/utils";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";

import type { TodoFieldsInput } from "../../../api/todos";
import type { Todo, TodoRuleDetail } from "../../../api/types";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { Skeleton } from "#components/ui/skeleton";
import {
  TodoSchemaForm,
  type TodoSchemaFormHandle,
} from "./schema/TodoSchemaForm";

interface TodoFormProps {
  rule: TodoRuleDetail | null;
  todo?: Todo;
  readOnly?: boolean;
  showTitleInput?: boolean;
  isPending?: boolean;
  isRulePending?: boolean;
  ruleErrorMessage?: string | null;
  errorMessage?: string | null;
  submitLabel?: string;
  onSubmit?: (input: TodoFieldsInput) => void;
  onCancel?: () => void;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

export function TodoForm({
  rule,
  todo,
  readOnly = false,
  showTitleInput = true,
  isPending = false,
  isRulePending = false,
  ruleErrorMessage,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoFormProps) {
  const { t } = useTranslation();
  const idPrefix = `todo-${useId().replaceAll(":", "")}`;
  const schemaFormRef = useRef<TodoSchemaFormHandle>(null);
  const originalDueAt = toDateTimeLocal(todo?.due_at);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [dueAt, setDueAt] = useState(originalDueAt);

  const schemaRevisionKey = rule
    ? hashObject({
        ruleId: rule.id,
        contentSchema: rule.content_schema,
        uiSchema: rule.ui_schema,
      })
    : null;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !onSubmit ||
      readOnly ||
      !rule ||
      isRulePending ||
      ruleErrorMessage
    ) {
      return;
    }

    const content = schemaFormRef.current?.validateAndGetData();
    if (!content) {
      return;
    }

    onSubmit({
      title,
      due_at:
        todo && dueAt === originalDueAt
          ? todo.due_at
          : dueAt
            ? new Date(dueAt).toISOString()
            : null,
      content,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        {showTitleInput && (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-title`}>
              {t("todos.form.title")}
            </FieldLabel>
            <Input
              id={`${idPrefix}-title`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              disabled={readOnly || isPending}
              required
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-due-at`}>
            {t("todos.form.dueAt")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-due-at`}
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={readOnly || isPending}
          />
        </Field>
      </FieldGroup>

      {isRulePending ? (
        <Skeleton className="h-48 w-full" />
      ) : ruleErrorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {ruleErrorMessage}
        </p>
      ) : rule ? (
        <TodoSchemaForm
          key={schemaRevisionKey}
          ref={schemaFormRef}
          idPrefix={`${idPrefix}-content`}
          rule={rule}
          initialContent={todo?.content}
          readOnly={readOnly}
          disabled={isPending}
        />
      ) : null}

      {errorMessage && <FieldError>{errorMessage}</FieldError>}

      {!readOnly && onSubmit && (
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
            disabled={
              isPending ||
              isRulePending ||
              !rule ||
              Boolean(ruleErrorMessage)
            }
          >
            {submitLabel ?? t("common.save")}
          </Button>
        </div>
      )}
    </form>
  );
}