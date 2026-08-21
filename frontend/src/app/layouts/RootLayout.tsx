import { Outlet } from "react-router";

import { SiteHeader } from "../components/SiteHeader";

export function RootLayout() {
  return (
    <div className="flex h-svh flex-col [--app-header-height:3.5rem]">
      <SiteHeader />

      <div className="flex min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}