import type { ReactNode } from "react";

import { cx } from "#/components/cx.ts";
import styles from "./Landing.module.css";

export function Feature({
  eyebrow,
  title,
  body,
  reverse,
  children,
}: {
  eyebrow: string;
  title: string;
  body: ReactNode;
  reverse?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cx(styles.feature, reverse && styles.reverse)}>
      <div className={styles.featureText}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {body}
      </div>
      <div className={styles.featureVisual}>{children}</div>
    </section>
  );
}
