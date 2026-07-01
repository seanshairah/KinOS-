/**
 * Locale + currency scaffolding. Ships English; the structure keeps every
 * user-facing string in a dictionary so adding Shona/Ndebele/French later is
 * a data change, not a refactor.
 */

export const SUPPORTED_LOCALES = ["en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_CURRENCIES = ["USD", "ZWG", "ZAR", "GBP", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function formatMoney(
  amount: number,
  currency: string,
  locale: string = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatSignalTime(iso: string, timezone?: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(d);
}
