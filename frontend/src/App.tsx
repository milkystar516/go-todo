import { Route, Routes } from "react-router";

import { AppLayout } from "./app/layouts/AppLayout";
import { TodosPage } from "./features/todos/TodosPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodosPage />} />
      </Route>
    </Routes>
  );
}