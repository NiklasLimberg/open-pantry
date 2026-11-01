import styles from "./Form.module.css";

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className={styles.error}>
      {message}
    </p>
  );
}
