import { Outlet } from "react-router";

import { SidebarLeft } from "#components/sidebar-left";
import {
  SidebarInset,
  SidebarProvider,
} from "#components/ui/sidebar";

export function AppLayout() {
  return (
    <SidebarProvider className="min-h-0 flex-1">
      <SidebarLeft
        className="top-[var(--app-header-height)] h-[calc(100svh-var(--app-header-height))]"
      />

      <SidebarInset className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
