import type { ReactNode } from "react";

import { cx } from "#/components/cx.ts";
import styles from "./ScreenMock.module.css";

type FrameProps = {
  /** Describes the picture for screen readers. */
  label: string;
  variant?: "phone" | "panel";
  children: ReactNode;
  className?: string;
};

export function ScreenFrame({ label, variant = "panel", children, className }: FrameProps) {
  return (
    <figure className={cx(styles.frame, styles[variant], className)}>
      <div className={styles.screen} aria-hidden="true">
        {children}
      </div>
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}
