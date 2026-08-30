import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router";

import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { RequireAuth } from "../features/guards/RequireAuth";
import { RequireAdmin } from "../features/guards/RequireAdmin";
import { RequireListMember } from "../features/guards/ListAccessGuards";

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route element={<AuthLayout />}>
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
            <Route
              path="admin"
              lazy={() => import("../features/admin/AdminPage")}
            />
            <Route
              path="admin/todo-rules/new"
              lazy={() =>
                import(
                  "../features/todoRules/TodoRuleCreatePage"
                )
              }
            />
            <Route
              path="admin/todo-rules/:ruleId"
              lazy={() =>
                import(
                  "../features/todoRules/TodoRuleDetailPage"
                )
              }
            />
            <Route
              path="admin/todo-rules/:ruleId/edit"
              lazy={() =>
                import(
                  "../features/todoRules/TodoRuleEditPage"
                )
              }
            />
          </Route>
        </Route>
      </Route>
    </Route>,
  ),
);
