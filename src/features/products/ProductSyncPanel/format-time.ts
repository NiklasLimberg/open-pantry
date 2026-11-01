import { dateLocale } from "#/features/inventory/format.ts";

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleString(dateLocale(), { dateStyle: "medium", timeStyle: "short" });
}
