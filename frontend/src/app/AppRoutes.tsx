import { Route, Routes } from "react-router";

import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { TodosPage } from "../features/todoLists/TodosListPage";
import { SignupPage } from "../features/auth/SignupPage";
import { RequireAuth } from "../features/guards/RequireAuth";
import { RequireAdmin } from "../features/guards/RequireAdmin";
import { RequireListMember } from "../features/guards/ListAccessGuards";
import { AdminPage } from "../features/admin/AdminPage";
import { TodoRuleCreatePage } from "../features/todoRules/TodoRuleCreatePage";
import { TodoRuleDetailPage } from "../features/todoRules/TodoRuleDetailPage";
import { TodoRuleEditPage } from "../features/todoRules/TodoRuleEditPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<TodosPage />} />

            <Route path="lists/:listId" element={<RequireListMember />}>
              <Route index element={<TodosPage />} />
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="admin" element={<AdminPage />} />
              <Route
                path="admin/todo-rules/new"
                element={<TodoRuleCreatePage />}
              />
              <Route
                path="admin/todo-rules/:ruleId"
                element={<TodoRuleDetailPage />}
              />
              <Route
                path="admin/todo-rules/:ruleId/edit"
                element={<TodoRuleEditPage />}
              />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
