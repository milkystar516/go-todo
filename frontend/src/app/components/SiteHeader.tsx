import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "#components/ui/input";

import { LanguageSwitcher } from "./LanguageSwitcher";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="z-50 flex h-[var(--app-header-height)] shrink-0 items-center border-b bg-background">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4">
        <div className="font-semibold">
          Go Todo
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              aria-label={t("header.search")}
              placeholder={t("header.search")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {/* current user는 /me 연결 후 여기에 추가 */}
        </div>
      </div>
    </header>
  );
}