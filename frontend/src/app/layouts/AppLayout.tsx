import { NavLink, Outlet } from "react-router";

import styles from "./AppLayout.module.css";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <NavLink to="/todos" className={styles.brand}>
          Go Todo
        </NavLink>
      </header>

      <div className={styles.body}>
        <nav className={styles.navigation}>
          <NavLink to="/todos">Todos</NavLink>
        </nav>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}