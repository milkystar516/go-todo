import { useTranslation } from "react-i18next";

import { Field, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";

interface TodoTitleFieldProps {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function TodoTitleField({
  id,
  value,
  disabled = false,
  onChange,
}: TodoTitleFieldProps) {
  const { t } = useTranslation();

  return (
    <Field>
      <FieldLabel htmlFor={id} className="sr-only">
        {t("todos.form.title")}
      </FieldLabel>

      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("todos.form.titlePlaceholder")}
        maxLength={200}
        disabled={disabled}
        required
        className="h-11 text-base"
      />
    </Field>
  );
}