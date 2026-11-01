import type { ReactNode } from "react";

import styles from "./Landing.module.css";

export function Extra({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className={styles.extra}>
      <h3>{title}</h3>
      <p>{children}</p>
    </li>
  );
}
