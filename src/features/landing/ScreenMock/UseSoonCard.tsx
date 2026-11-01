import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";
import { FakeButton } from "./FakeButton.tsx";
import { Icon } from "./Icon.tsx";

export function UseSoonCard({
  icon,
  name,
  location,
  dateType,
  when,
  date,
  amount,
}: {
  icon: string;
  name: string;
  location: string;
  dateType: string;
  when: string;
  date: string;
  amount: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.soonDate}>
        <span>{dateType}</span>
        <strong>{when}</strong>
        <time>{date}</time>
      </div>
      <div className={styles.product}>
        <Icon>{icon}</Icon>
        <div>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.muted}>{location}</span>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span>{amount}</span>
        <FakeButton>{m["mock.updateAmount"]()}</FakeButton>
      </div>
    </div>
  );
}
