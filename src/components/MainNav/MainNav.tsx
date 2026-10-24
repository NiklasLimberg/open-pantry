import { Link } from "@tanstack/react-router";
import { ListChecks, Package, Settings, ShoppingCart } from "lucide-react";

import styles from "./MainNav.module.css";

const primary = [
  { to: "/pantry", label: "Pantry", icon: Package },
  // The bottom bar has little room, so it uses the short label.
  { to: "/rules", label: "Rules", longLabel: "Stock rules", icon: ListChecks },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
] as const;

const settings = { to: "/settings", label: "Settings", icon: Settings } as const;

type Item = {
  to: string;
  label: string;
  longLabel?: string;
  icon: typeof Package;
};

function NavLink({ to, label, longLabel, icon: Icon }: Item) {
  return (
    <Link to={to} className={styles.link}>
      <Icon size={22} aria-hidden />
      {longLabel ? (
        <>
          <span className={styles.short}>{label}</span>
          <span className={styles.long}>{longLabel}</span>
        </>
      ) : (
        label
      )}
    </Link>
  );
}

/**
 * Main destinations (docs/design.md): a fixed sidebar on desktop and a bottom bar on phones. It is
 * one element; the stylesheet moves it. The current page carries aria-current="page".
 */
export function MainNav() {
  return (
    <nav className={styles.nav} aria-label="Main">
      <div className={styles.brand} aria-hidden>
        <b>◒</b> open<span>pantry</span>
      </div>
      <div className={styles.items}>
        {primary.map((item) => (
          <NavLink key={item.to} {...item} />
        ))}
      </div>
      <div className={styles.foot}>
        <NavLink {...settings} />
      </div>
    </nav>
  );
}
