import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserDropdown } from "./UserDropdown";

export function SiteHeader() {
  return (
    <header className="z-50 flex h-[var(--app-header-height)] shrink-0 items-center border-b bg-background">
      <div className="flex w-full items-center justify-between gap-4 px-4">
        <div className="font-semibold">
          Go Todo
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
