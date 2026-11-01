import type { AnyFieldApi } from "@tanstack/react-form";
import { useState } from "react";

import { dateLocale, todayIn } from "#/features/inventory/format.ts";
import { parseTypedDate } from "#/features/scan/parse-date.ts";
import { m } from "#/paraglide/messages.js";

import { Field } from "#/components/Form/Field.tsx";
import { Input } from "#/components/Form/Input.tsx";

/** Shown back to the user so a typed shortcut is confirmed before it is saved. */
const dateFormat = () =>
  new Intl.DateTimeFormat(dateLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** What the field says under the input: the parsed date, or why there is none yet. */
function describeTyped(text: string, parsed: ReturnType<typeof parseTypedDate>) {
  if (parsed) {
    const date = dateFormat().format(new Date(`${parsed.iso}T00:00:00Z`));
    return parsed.monthOnly ? `${date} ${m["purchase.endOfMonth"]()}` : date;
  }
  return text.trim() ? m["purchase.dateInvalid"]() : m["purchase.dateExample"]();
}

/**
 * The printed date, typed the way it reads on the package (2803, 28.03.27, 03.27) and echoed back
 * as a full date. The field's value stays a calendar date, so the stored shape is unchanged.
 */
export function TypedDate({
  field,
  disabled,
  timeZone,
}: {
  field: AnyFieldApi;
  disabled: boolean;
  /** The pantry's time zone: "today" is its calendar date, whatever the device is set to. */
  timeZone: string;
}) {
  const [text, setText] = useState("");
  const [today] = useState(() => todayIn(timeZone));
  const parsed = parseTypedDate(text, today);
  const echo = describeTyped(text, parsed);

  return (
    <Field
      label={m["global.date"]()}
      hint={disabled ? undefined : echo}
      htmlFor={field.name}
      errors={field.state.meta.errors}
    >
      <Input
        id={field.name}
        value={disabled ? "" : text}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder={m["purchase.datePlaceholder"]()}
        onBlur={field.handleBlur}
        onChange={(event) => {
          setText(event.target.value);
          field.handleChange(parseTypedDate(event.target.value, today)?.iso ?? "");
        }}
      />
    </Field>
  );
}
