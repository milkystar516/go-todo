import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <main className="min-h-svh">
      <Outlet />
    </main>
  );
}