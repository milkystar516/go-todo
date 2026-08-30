import { RouterProvider } from "react-router/dom";

import { appRouter } from "./app/AppRoutes";

export default function App() {
  return <RouterProvider router={appRouter} />;
}
