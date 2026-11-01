import { m } from "#/paraglide/messages.js";

import styles from "./ScreenMock.module.css";
import { FakeButton } from "./FakeButton.tsx";
import { Icon } from "./Icon.tsx";

export function ScanSheet() {
  return (
    <div className={styles.sheet}>
      <div className={styles.viewfinder}>
        <span className={styles.barcode} />
        <span className={styles.small}>{m["mock.scanSheet.barcode"]()}</span>
      </div>
      <div className={styles.product}>
        <Icon>🥛</Icon>
        <div>
          <strong className={styles.name}>{m["mock.item.milk"]()}</strong>
          <span className={styles.muted}>{m["mock.scanSheet.meta"]()}</span>
        </div>
      </div>
      <span>{m["mock.scanSheet.question"]()}</span>
      <FakeButton primary>{m["mock.scanSheet.add"]()}</FakeButton>
      <FakeButton>{m["mock.scanSheet.updateOpened"]()}</FakeButton>
      <FakeButton>{m["mock.scanSheet.updateUnopened"]()}</FakeButton>
    </div>
  );
}
