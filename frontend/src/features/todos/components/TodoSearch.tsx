import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "#components/ui/input";

export function TodoSearch() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        type="search"
        placeholder={t("header.search")}
        aria-label={t("header.search")}
        className="pl-9"
      />
    </div>
  );
}