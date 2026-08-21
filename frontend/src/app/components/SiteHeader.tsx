import { SearchIcon } from "lucide-react";

import { Input } from "#components/ui/input";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-[var(--app-header-height)] shrink-0 items-center border-b bg-background">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4">
        <div className="font-semibold">
          Go Todo
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              type="search"
              placeholder="Search"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* LanguageSwitcher와 현재 사용자 정보는 다음 단계에서 */}
        </div>
      </div>
    </header>
  );
}