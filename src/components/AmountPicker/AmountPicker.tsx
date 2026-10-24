import type { StartAmount } from "#/domains/inventory/purchase.ts";

import styles from "./AmountPicker.module.css";

export const amountOptions = [
  { value: "4", label: "Full" },
  { value: "3", label: "¾" },
  { value: "2", label: "½" },
  { value: "1", label: "¼" },
  { value: "used", label: "Used up" },
] as const;

export type Amount = (typeof amountOptions)[number]["value"];

/** Choices for a package that is just being added: anything but Used up. */
export const startAmountOptions = amountOptions.filter(
  (option): option is Extract<(typeof amountOptions)[number], { value: StartAmount }> =>
    option.value !== "used",
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
  options = amountOptions as unknown as ReadonlyArray<{ value: T; label: string }>,
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
