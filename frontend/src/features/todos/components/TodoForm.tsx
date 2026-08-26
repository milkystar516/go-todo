import CoreForm from "@rjsf/core";
import RjsfForm from "@rjsf/shadcn";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import type { TodoUpdateInput } from "../../../api/todos";
import type { Todo, TodoRuleDetail } from "../../../api/types";
import { Button } from "#components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field";
import { Input } from "#components/ui/input";
import { rjsfValidator } from "../forms/rjsfValidator";

interface TodoFormProps {
  rule: TodoRuleDetail;
  todo?: Todo;
  readOnly?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  submitLabel?: string;
  onSubmit?: (input: TodoUpdateInput) => void | Promise<void>;
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
  isPending = false,
  errorMessage,
  submitLabel,
  onSubmit,
  onCancel,
}: TodoFormProps) {
  const { t } = useTranslation();
  const rjsfRef = useRef<CoreForm<Record<string, unknown>>>(null);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [dueAt, setDueAt] = useState(toDateTimeLocal(todo?.due_at));
  const [content, setContent] = useState<Record<string, unknown>>(
    todo?.content ?? {},
  );

  useEffect(() => {
    setTitle(todo?.title ?? "");
    setDueAt(toDateTimeLocal(todo?.due_at));
    setContent(todo?.content ?? {});
  }, [rule.id, todo]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSubmit || readOnly || !rjsfRef.current?.validateForm()) {
      return;
    }

    const validatedContent =
      rjsfRef.current.state.formData ?? content;

    try {
      await onSubmit({
        title,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        content: validatedContent,
      });
    } catch {
      // The owning mutation renders its error without losing form state.
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor={`todo-title-${todo?.id ?? "new"}`}>
            {t("todos.form.title")}
          </FieldLabel>
          <Input
            id={`todo-title-${todo?.id ?? "new"}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            disabled={readOnly || isPending}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`todo-due-at-${todo?.id ?? "new"}`}>
            {t("todos.form.dueAt")}
          </FieldLabel>
          <Input
            id={`todo-due-at-${todo?.id ?? "new"}`}
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={readOnly || isPending}
          />
        </Field>
      </FieldGroup>

      <RjsfForm
        ref={rjsfRef}
        tagName="div"
        schema={rule.content_schema}
        uiSchema={rule.ui_schema}
        formData={content}
        validator={rjsfValidator}
        onChange={({ formData }) => setContent(formData ?? {})}
        readonly={readOnly}
        disabled={isPending}
        liveValidate="onBlur"
        omitExtraData
        showErrorList={false}
      >
        <></>
      </RjsfForm>

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
          <Button type="submit" disabled={isPending}>
            {submitLabel ?? t("common.save")}
          </Button>
        </div>
      )}
    </form>
  );
}
