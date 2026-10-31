import { Link } from "@tanstack/react-router";
import { ListChecks, Package, Settings, ShoppingCart } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import styles from "./MainNav.module.css";

// Labels are functions so they are read in the current language at render time.
const primary = [
  { to: "/pantry", label: () => m["global.pantry"](), icon: Package },
  // The bottom bar has little room, so it uses the short label.
  {
    to: "/rules",
    label: () => m["global.rules"](),
    longLabel: () => m["global.stockRules"](),
    icon: ListChecks,
  },
  { to: "/shopping", label: () => m["global.shopping"](), icon: ShoppingCart },
] as const;

const settings = { to: "/settings", label: () => m["global.settings"](), icon: Settings } as const;

type Item = {
  to: string;
  label: () => string;
  longLabel?: () => string;
  icon: typeof Package;
};

function NavLink({ to, label, longLabel, icon: Icon }: Item) {
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

/**
 * Main destinations (docs/design.md): a fixed sidebar on desktop and a bottom bar on phones. It is
 * one element; the stylesheet moves it. The current page carries aria-current="page".
 */
export function MainNav() {
  return (
    <nav className={styles.nav} aria-label={m["nav.label"]()}>
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
