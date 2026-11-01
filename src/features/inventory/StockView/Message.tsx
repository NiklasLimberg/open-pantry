import { Card } from "#/components/Card/Card.tsx";
import styles from "./StockView.module.css";

export function Message({ children }: { children: string }) {
  return (
    <Card>
      <p className={styles.empty}>{children}</p>
    </Card>
  );
}
