import { useQuery } from "@tanstack/react-query";

import { currentUserQueryOptions } from "../../features/auth/queries";
import { TodoSearch } from "../../features/todos/components/TodoSearch";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function SiteHeader() {
  const { data: currentUser } = useQuery(currentUserQueryOptions);

  return (
    <header className="z-50 flex h-[var(--app-header-height)] shrink-0 items-center border-b bg-background">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4">
        <div className="font-semibold">
          Go Todo
        </div>

        <div className="mx-auto w-full max-w-xl">
          {currentUser && <TodoSearch />}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}