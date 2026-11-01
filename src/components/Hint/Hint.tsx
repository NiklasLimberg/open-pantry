import type { ComponentProps } from "react";

import { cx } from "../cx.ts";
import styles from "./Hint.module.css";

type HintProps = ComponentProps<"p"> & {
  /** Smaller type, for a note under a form field. */
  small?: boolean;
  /** Space below, for a note that sits above other content in a card. */
  spaced?: boolean;
};

/** Secondary text: explanations, empty states and notes under fields. */
export function Hint({ small, spaced, className, ...props }: HintProps) {
  return (
    <p
      className={cx(styles.hint, small && styles.small, spaced && styles.spaced, className)}
      {...props}
    />
  );
}
