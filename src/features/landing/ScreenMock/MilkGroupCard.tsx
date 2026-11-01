import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";
import { FakeButton } from "./FakeButton.tsx";
import { Icon } from "./Icon.tsx";
import { Quarters } from "./Quarters.tsx";

export function MilkGroupCard() {
  return (
    <div className={styles.card}>
      <div className={styles.product}>
        <Icon>🥛</Icon>
        <div>
          <strong className={styles.name}>{m["mock.item.milk"]()}</strong>
          <span className={styles.muted}>{m["mock.milkMeta"]()}</span>
        </div>
      </div>
      <div className={styles.quantity}>
        <strong>{m["mock.milkAmount"]()}</strong>
        <span className={styles.muted}>{m["mock.approxRemaining"]()}</span>
      </div>
      <span className={styles.muted}>{m["mock.milkSplit"]()}</span>
      <div className={styles.batches}>
        <span className={styles.batchesTitle}>{m["mock.individualCartons"]()}</span>
        <div className={styles.batch}>
          <div className={styles.batchHead}>
            <strong>{m["mock.carton1"]()}</strong>
            <span className={styles.muted}>{m["global.opened"]()}</span>
          </div>
          <div className={styles.batchAmount}>
            <span>{m["mock.left.half"]()}</span>
            <Quarters filled={2} />
          </div>
          <div className={styles.batchHead}>
            <span className={styles.warnText}>{m["mock.mhdTomorrow"]()}</span>
            <FakeButton>{m["global.update"]()}</FakeButton>
          </div>
        </div>
        <div className={styles.batch}>
          <div className={styles.batchHead}>
            <strong>{m["mock.carton2"]()}</strong>
            <span className={styles.muted}>{m["global.unopened"]()}</span>
          </div>
          <div className={styles.batchAmount}>
            <span>{m["global.amount.full"]()}</span>
            <Quarters filled={4} />
          </div>
          <div className={styles.batchHead}>
            <span className={styles.muted}>{m["mock.mhd28oct"]()}</span>
            <FakeButton>{m["global.update"]()}</FakeButton>
          </div>
        </div>
      </div>
    </div>
  );
}
