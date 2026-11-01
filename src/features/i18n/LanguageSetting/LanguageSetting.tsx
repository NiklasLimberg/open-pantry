import * as RadioGroup from "@radix-ui/react-radio-group";

import { changeLocale } from "#/features/i18n/locale.ts";
import { m } from "#/paraglide/messages.js";
import { getLocale, type Locale } from "#/paraglide/runtime.js";

import { Card } from "#/components/Card/Card.tsx";
import { Hint } from "#/components/Hint/Hint.tsx";
import styles from "./LanguageSetting.module.css";

// Each language is named in itself, so it can be found whichever language is active.
const options: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

/** The language of the app and of the Open Food Facts product names, kept in a cookie. */
export function LanguageSetting() {
  return (
    <Card title={m["language.title"]()}>
      <Hint spaced>{m["language.hint"]()}</Hint>
      {/* No network involved: the stock carries product names in every language. */}
      <RadioGroup.Root
        value={getLocale()}
        onValueChange={(value) => {
          const locale = options.find((option) => option.value === value)?.value;
          if (locale) {
            changeLocale(locale);
          }
        }}
        aria-label={m["language.group"]()}
        className={styles.group}
      >
        {options.map(({ value, label }) => (
          <RadioGroup.Item key={value} value={value} className={styles.item}>
            {label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </Card>
  );
}
