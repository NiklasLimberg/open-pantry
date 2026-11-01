import type { ComponentProps } from "react";

import { cx } from "../cx.ts";
import styles from "./Form.module.css";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(styles.input, className)} {...props} />;
}
