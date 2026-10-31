import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { setTheme, useTheme, type Theme } from "#/domains/theme/theme.ts";
import styles from "./ThemeToggle.module.css";

const next: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const label: Record<Theme, () => string> = {
  system: () => m["theme.system"](),
  light: () => m["theme.light"](),
  dark: () => m["theme.dark"](),
};
const icon: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/** One icon button that cycles System → Light → Dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const Icon = icon[theme];
  const description = m["theme.switch"]({ current: label[theme](), next: label[next[theme]]() });
  return (
    <button
      type="button"
      onClick={() => setTheme(next[theme])}
      aria-label={description}
      title={description}
      className={[styles.button, className].filter(Boolean).join(" ")}
    >
      <Icon size={20} aria-hidden />
    </button>
  );
}
