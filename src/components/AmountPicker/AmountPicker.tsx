import type { StartAmount } from "#/domains/inventory/purchase.ts";
import { m } from "#/paraglide/messages.js";

import styles from "./AmountPicker.module.css";

export type Amount = "4" | "3" | "2" | "1" | "used";

/** Labels are read when called, because the language is only known per request. */
export const amountOptions = (): ReadonlyArray<{ value: Amount; label: string }> => [
  { value: "4", label: m["global.amount.full"]() },
  { value: "3", label: m["global.amount.threeQuarters"]() },
  { value: "2", label: m["global.amount.half"]() },
  { value: "1", label: m["global.amount.quarter"]() },
  { value: "used", label: m["global.amount.usedUp"]() },
];

/** Choices for a package that is just being added: anything but Used up. */
export const startAmountOptions = () =>
  amountOptions().filter(
    (option): option is { value: StartAmount; label: string } => option.value !== "used",
  );

type Props<T extends Amount> = {
  /** Groups the radios; must differ between pickers on the same page. */
  name: string;
  legend: string;
  /** Hide the legend visually; screen readers still read it. */
  legendHidden?: boolean;
  value: T;
  onChange: (value: T) => void;
  /** Defaults to every amount, Used up included. */
  options?: ReadonlyArray<{ value: T; label: string }>;
};

/** Full, ¾, ½, ¼ and Used up as a row of radio buttons (docs/data-and-rules.md). */
export function AmountPicker<T extends Amount = Amount>({
  name,
  legend,
  legendHidden = false,
  value,
  onChange,
  options = amountOptions() as unknown as ReadonlyArray<{ value: T; label: string }>,
}: Props<T>) {
  return (
    <fieldset className={styles.amounts}>
      <legend className={legendHidden ? styles.legendHidden : styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
