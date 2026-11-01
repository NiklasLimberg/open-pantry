import { cx } from "#/components/cx.ts";
import styles from "./ScreenMock.module.css";

export function ShoppingRow({
  name,
  detail,
  amount,
  checked,
}: {
  name: string;
  detail: string;
  amount: string;
  checked?: boolean;
}) {
  return (
    <div className={cx(styles.shoppingRow, checked && styles.checked)}>
      <span className={styles.checkbox}>{checked ? "✓" : ""}</span>
      <div className={styles.shoppingText}>
        <strong>{name}</strong>
        <span className={styles.muted}>{detail}</span>
      </div>
      <strong className={styles.buyAmount}>{amount}</strong>
    </div>
  );
}
