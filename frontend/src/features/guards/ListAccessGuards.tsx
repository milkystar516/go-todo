import { useQuery } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  useOutletContext,
  useParams,
} from "react-router";

import { ApiError } from "../../api/client";
import type { TodoListMember } from "../../api/types";
import { currentUserQueryOptions } from "../auth/queries";
import { todoListMembersQueryOptions } from "../todoLists/queries";

interface ListAccessContext {
  listId: string;
  membership: TodoListMember;
}

export function RequireListMember() {
  const { listId } = useParams<{ listId: string }>();
  const currentUserQuery = useQuery(currentUserQueryOptions);
  const membersQuery = useQuery({
    ...todoListMembersQueryOptions(listId ?? ""),
    enabled: Boolean(listId && currentUserQuery.data),
  });

  if (!listId) {
    return <Navigate to="/" replace />;
  }

  if (currentUserQuery.isPending) {
    return null;
  }

  if (currentUserQuery.isError) {
    return <p>Failed to load the current user.</p>;
  }

  if (!currentUserQuery.data) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = currentUserQuery.data;

  if (membersQuery.isPending) {
    return null;
  }

  if (membersQuery.isError) {
    if (
      membersQuery.error instanceof ApiError &&
      membersQuery.error.status === 401
    ) {
      return <Navigate to="/login" replace />;
    }

    if (
      membersQuery.error instanceof ApiError &&
      (membersQuery.error.status === 400 ||
        membersQuery.error.status === 404)
    ) {
      return <Navigate to="/" replace />;
    }

    return <p>Failed to load the todo list membership.</p>;
  }

  const membership = membersQuery.data.find(
    (member) => member.id === currentUser.id,
  );

  if (!membership) {
    return <Navigate to="/" replace />;
  }

  return <Outlet context={{ listId, membership }} />;
}

export function RequireListOwner() {
  const context = useOutletContext<ListAccessContext | null>();

  if (!context) {
    return <Navigate to="/" replace />;
  }

  if (context.membership.role !== "owner") {
    return <Navigate to={`/lists/${context.listId}`} replace />;
  }

  return <Outlet context={context} />;
}

export function useListAccess() {
  return useOutletContext<ListAccessContext>();
}
