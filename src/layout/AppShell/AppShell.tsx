import type { ReactNode } from "react";

import { MainNav } from "#/layout/MainNav/MainNav.tsx";
import styles from "./AppShell.module.css";

/** The signed-in frame: main navigation, and room beside it for the page on desktop. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <MainNav />
      <div className={styles.content}>{children}</div>
    </>
  );
}
