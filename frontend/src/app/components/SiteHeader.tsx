import { LanguageSwitcher } from "./LanguageSwitcher";
import { TodoSearch } from "../../features/todos/components/TodoSearch";

export function SiteHeader() {
  return (
    <header className="z-50 flex h-[var(--app-header-height)] shrink-0 items-center border-b bg-background">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4">
        <div className="font-semibold">
          Go Todo
        </div>

        <div className="mx-auto w-full max-w-xl">
          {<TodoSearch />}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

        </div>
      </div>
    </header>
  );
}