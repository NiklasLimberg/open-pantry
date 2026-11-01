import type { ComponentProps, ReactNode } from "react";

import { cx } from "../cx.ts";
import styles from "./Card.module.css";

type CardProps = ComponentProps<"section"> & {
  title?: ReactNode;
  actions?: ReactNode;
};

export function Card({ title, actions, className, children, ...props }: CardProps) {
  return (
    <section className={cx(styles.card, className)} {...props}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
