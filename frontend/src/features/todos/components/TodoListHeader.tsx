import { useTranslation } from "react-i18next";

interface TodoListHeaderProps {
  title: string;
  totalCount: number;
}

export function TodoListHeader({
  title,
  totalCount,
}: TodoListHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("todos.count", { count: totalCount })}
      </p>
    </header>
  );
}
