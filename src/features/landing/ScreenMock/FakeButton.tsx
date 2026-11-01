import type { ReactNode } from "react";

import { cx } from "#/components/cx.ts";
import styles from "./ScreenMock.module.css";

export function FakeButton({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return <span className={cx(styles.button, primary && styles.primary)}>{children}</span>;
}
