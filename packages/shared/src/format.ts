import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "./constants";

/** Formats an amount as Philippine peso, e.g. formatPhp(1500) -> "₱1,500.00". */
export function formatPhp(amount: number): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
  }).format(amount);
}

/** Formats a date in Asia/Manila local time — for anything shown to a user, per docs/design.md. */
export function formatManilaDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, { ...options, timeZone: DEFAULT_TIMEZONE }).format(
    date,
  );
}

/** Formats a date+time in Asia/Manila local time. */
export function formatManilaDateTime(date: Date): string {
  return formatManilaDate(date, { dateStyle: "medium", timeStyle: "short" });
}
