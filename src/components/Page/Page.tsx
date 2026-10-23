import type { ReactNode } from "react";

import { ThemeToggle } from "../ThemeToggle/ThemeToggle.tsx";
import styles from "./Page.module.css";

type PageProps = {
  title: string;
  /** Short text next to the title, e.g. the viewer's role. */
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Page({ title, badge, actions, children }: PageProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {title}
          {badge && <span className={styles.badge}>{badge}</span>}
        </h1>
        <div className={styles.actions}>
          {actions}
          <ThemeToggle />
        </div>
      </header>
      {children}
    </main>
  );
}
