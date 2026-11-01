import styles from "./ScreenMock.module.css";

export function Quarters({ filled }: { filled: number }) {
  return (
    <span className={styles.quarters}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= filled ? styles.filled : undefined} />
      ))}
    </span>
  );
}
