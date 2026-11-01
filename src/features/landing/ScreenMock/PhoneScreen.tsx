import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";

/** Mobile chrome: title bar on top, Scan button and bottom navigation below. */
export function PhoneScreen({
  title,
  active,
  children,
}: {
  title: string;
  active: "pantry" | "rules" | "shopping" | "settings";
  children: ReactNode;
}) {
  return (
    <div className={styles.phoneLayout}>
      <div className={styles.statusBar}>
        <span>{m["mock.phone.time"]()}</span>
        <span className={styles.sync}>
          <span className={styles.dot} />
          {m["mock.phone.upToDate"]()}
        </span>
      </div>
      <div className={styles.phoneBody}>
        <strong className={styles.phoneTitle}>{title}</strong>
        {children}
      </div>
      <span className={styles.fab}>{m["global.scan"]()}</span>
      <div className={styles.bottomNav}>
        {(
          [
            ["pantry", m["global.pantry"]()],
            ["rules", m["global.rules"]()],
            ["shopping", m["global.shopping"]()],
            ["settings", m["global.settings"]()],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className={key === active ? styles.navActive : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
