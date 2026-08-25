import { Route, Routes } from "react-router";

import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { TodosPage } from "../features/todos/TodosPage";
import { SignupPage } from "../features/auth/SignupPage";
import { RequireAuth } from "../features/guards/RequireAuth";
import { RequireAdmin } from "../features/guards/RequireAdmin";
import { AdminPage } from "../features/auth/AdminPage";

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

            <Route element={<RequireAdmin />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}