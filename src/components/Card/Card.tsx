import type { ComponentProps, ReactNode } from "react";

import styles from "./Card.module.css";

type CardProps = ComponentProps<"section"> & {
  title?: ReactNode;
  actions?: ReactNode;
};

export function Card({ title, actions, className, children, ...props }: CardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")} {...props}>
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
