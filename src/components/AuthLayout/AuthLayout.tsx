import type { ReactNode } from "react";

import { Card } from "../Card/Card.tsx";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle.tsx";
import styles from "./AuthLayout.module.css";

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <ThemeToggle className={styles.theme} />
      <p className={styles.brand}>Open Pantry</p>
      <Card title={title} className={styles.card}>
        {children}
      </Card>
    </main>
  );
}
