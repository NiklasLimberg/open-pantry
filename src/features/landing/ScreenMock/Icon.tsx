import styles from "./ScreenMock.module.css";

export function Icon({ children }: { children: string }) {
  return <span className={styles.icon}>{children}</span>;
}
