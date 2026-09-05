import {
  createBrowserRouter,
  createRoutesFromElements,
  redirect,
  Route,
} from "react-router";

import { queryClient } from "./queryClient";
import { RootRouteErrorBoundary } from "./components/RootRouteErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { RequireAuth } from "../features/guards/RequireAuth";
import { RequireAdmin } from "../features/guards/RequireAdmin";
import { currentUserQueryOptions } from "../features/auth/queries";
import { RequireListMember } from "../features/guards/ListAccessGuards";

async function redirectAuthenticatedUser() {
  const currentUser = await queryClient.ensureQueryData(
    currentUserQueryOptions,
  );

  return currentUser ? redirect("/") : null;
}

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={<RootLayout />}
      errorElement={<RootRouteErrorBoundary />}
    >
      <Route
        loader={redirectAuthenticatedUser}
        element={<AuthLayout />}
      >
        <Route
          path="login"
          lazy={() => import("../features/auth/LoginPage")}
        />

        <Route
          path="signup"
          lazy={() => import("../features/auth/SignupPage")}
        />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route
            index
            lazy={() =>
              import("../features/todoLists/TodosListPage")
            }
          />

          <Route
            path="lists/new"
            lazy={() =>
              import("../features/todoLists/TodoListCreatePage")
            }
          />

          <Route
            path="lists/:listId"
            element={<RequireListMember />}
          >
            <Route
              index
              lazy={() =>
                import("../features/todoLists/TodosListPage")
              }
            />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin">
              <Route
                index
                loader={() => redirect("/admin/todo-rules")}
              />

              <Route
                path="users"
                lazy={() => import("../features/admin/UsersPage")}
              />

              <Route
                path="todo-rules/new"
                lazy={() =>
                  import(
                    "../features/todoRules/TodoRuleCreatePage"
                  )
                }
              />

              <Route
                path="todo-rules/:ruleId/edit"
                lazy={() =>
                  import(
                    "../features/todoRules/TodoRuleEditPage"
                  )
                }
              />

              <Route
                path="todo-rules/:ruleId?"
                lazy={async () => {
                  const { TodoRulePage } = await import(
                    "../features/todoRules/TodoRulePage"
                  );

                  return { Component: TodoRulePage };
                }}
              />
            </Route>
          </Route>
        </Route>
      </Route>
    </Route>,
  ),
);