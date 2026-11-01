import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";
import { FakeButton } from "./FakeButton.tsx";
import { Icon } from "./Icon.tsx";
import { Quarters } from "./Quarters.tsx";

export function StockCard({
  icon,
  name,
  meta,
  amount,
  quarters,
  date,
}: {
  icon: string;
  name: string;
  meta: string;
  amount: string;
  quarters?: number;
  date: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{meta}</span>
        </div>
      </div>
      <div className={styles.quantity}>
        <strong>{amount}</strong>
        <span className={styles.muted}>
          {quarters === undefined ? m["mock.remaining"]() : m["mock.remainingApprox"]()}
        </span>
      </div>
      {quarters !== undefined && <Quarters filled={quarters} />}
      <div className={styles.cardFooter}>
        <span className={styles.muted}>{date}</span>
        <FakeButton>{m["global.update"]()}</FakeButton>
      </div>
    </div>
  );
}
