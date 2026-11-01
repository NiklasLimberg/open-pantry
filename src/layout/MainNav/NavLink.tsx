import { Link } from "@tanstack/react-router";
import type { Package } from "lucide-react";

import styles from "./MainNav.module.css";

export type NavItem = {
  to: string;
  label: () => string;
  longLabel?: () => string;
  icon: typeof Package;
};

export function NavLink({ to, label, longLabel, icon: Icon }: NavItem) {
  return (
    <Link to={to} className={styles.link}>
      <Icon size={22} aria-hidden />
      {longLabel ? (
        <>
          <span className={styles.short}>{label()}</span>
          <span className={styles.long}>{longLabel()}</span>
        </>
      ) : (
        label()
      )}
    </Link>
  );
}
