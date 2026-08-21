import { Route, Routes } from "react-router";

import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { RootLayout } from "./layouts/RootLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { TodosPage } from "../features/todos/TodosPage";
import { SignupPage } from "../features/auth/SignupPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route index element={<TodosPage />} />
        </Route>
      </Route>
    </Routes>
  );
}