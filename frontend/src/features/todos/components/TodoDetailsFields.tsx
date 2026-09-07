import { useTranslation } from "react-i18next";

import { Field, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";

interface TodoDetailsFieldsProps {
  dueAtId: string;
  dueAt: string;
  disabled?: boolean;
  onDueAtChange: (value: string) => void;
}

export function TodoDetailsFields({
  dueAtId,
  dueAt,
  disabled = false,
  onDueAtChange,
}: TodoDetailsFieldsProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("todos.form.details")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Field className="gap-2 sm:grid sm:grid-cols-[8rem_1fr] sm:items-center">
        <FieldLabel htmlFor={dueAtId}>
          {t("todos.form.dueAt")}
        </FieldLabel>

        <Input
          id={dueAtId}
          type="datetime-local"
          value={dueAt}
          onChange={(event) => onDueAtChange(event.target.value)}
          disabled={disabled}
        />
      </Field>
    </section>
  );
}