import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";

import { currentUserQueryOptions } from "../auth/queries";

export function RequireAuth() {
  const { data: currentUser, isPending, isError } =
    useQuery(currentUserQueryOptions);

  if (isPending) {
    return null;
  }

  if (isError) {
    return <p>Failed to load the current user.</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}