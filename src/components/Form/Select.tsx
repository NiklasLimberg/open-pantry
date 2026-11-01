import type { ComponentProps } from "react";

import { cx } from "../cx.ts";
import styles from "./Form.module.css";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(styles.input, className)} {...props} />;
}
