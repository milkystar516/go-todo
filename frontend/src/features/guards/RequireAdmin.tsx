import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";

import { currentUserQueryOptions } from "../auth/queries";

export function RequireAdmin() {
  const { data: currentUser } = useQuery(currentUserQueryOptions);

  if (currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}