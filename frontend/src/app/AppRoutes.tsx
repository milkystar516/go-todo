import {
  createBrowserRouter,
  createRoutesFromElements,
  redirect,
  Route,
} from "react-router";

import { queryClient } from "./queryClient";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { RequireAuth } from "../features/guards/RequireAuth";
import { RequireAdmin } from "../features/guards/RequireAdmin";
import { RequireListMember } from "../features/guards/ListAccessGuards";
import { currentUserQueryOptions } from "../features/auth/queries";
import {
  AdminTabRoute,
  adminTabs,
} from "../features/admin/adminTabs";

async function redirectAuthenticatedUser() {
  const currentUser = await queryClient.fetchQuery(
    currentUserQueryOptions,
  );

  return currentUser ? redirect("/") : null;
}

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
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

          <Route path="lists/:listId" element={<RequireListMember />}>
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
                lazy={() => import("../features/admin/AdminPage")}
              >
                <Route
                  index
                  loader={() => redirect("/admin/todo-rules")}
                />

                {adminTabs.map((tab) => (
                  <Route
                    key={tab.value}
                    path={tab.path}
                    element={
                      <AdminTabRoute component={tab.component} />
                    }
                  />
                ))}
              </Route>

              <Route
                path="todo-rules/new"
                lazy={() =>
                  import(
                    "../features/todoRules/TodoRuleCreatePage"
                  )
                }
              />
              <Route
                path="todo-rules/:ruleId"
                lazy={() =>
                  import(
                    "../features/todoRules/TodoRuleDetailPage"
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
            </Route>
          </Route>
        </Route>
      </Route>
    </Route>,
  ),
);
