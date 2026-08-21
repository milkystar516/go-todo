import { Outlet } from "react-router";

import { SiteHeader } from "../components/SiteHeader";

export function RootLayout() {
  return (
    <div className="flex h-svh flex-col [--app-header-height:3.5rem]">
      <SiteHeader />

      <div className="grid min-h-0 min-w-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}