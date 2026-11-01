import { m } from "#/paraglide/messages.js";

import { cx } from "#/components/cx.ts";
import styles from "./ScreenMock.module.css";
import { Icon } from "./Icon.tsx";

export function RuleCard({
  icon,
  name,
  criteria,
  sentence,
  have,
  progress,
  status,
}: {
  icon: string;
  name: string;
  criteria: string;
  sentence: string;
  have: string;
  /** 0–1 share of the target available. */
  progress: number;
  /** Shortage text, or undefined when covered. */
  status?: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{criteria}</span>
        </div>
      </div>
      <span>{sentence}</span>
      <span className={styles.progress}>
        <span style={{ width: `${Math.min(1, progress) * 100}%` }} />
      </span>
      <div className={styles.batchHead}>
        <span className={styles.small}>{have}</span>
        <span className={cx(styles.pill, status && styles.warn)}>
          {status ?? m["mock.covered"]()}
        </span>
      </div>
    </div>
  );
}
