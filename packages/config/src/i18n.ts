/**
 * Locale + currency scaffolding. Ships English, Shona and Ndebele — the three
 * languages of the first homes KinOS is built for. Every user-facing string
 * lives in a dictionary (see the web app's lib/i18n) so adding a language is a
 * data change, not a refactor.
 */

export const SUPPORTED_LOCALES = ["en", "sn", "nd"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Display metadata per locale: English name, the name in its own tongue, and
 *  the BCP-47 tag for `<html lang>` and Intl formatting. */
export const LOCALE_META: Record<Locale, { label: string; native: string; htmlLang: string }> = {
  en: { label: "English", native: "English", htmlLang: "en" },
  sn: { label: "Shona", native: "chiShona", htmlLang: "sn" },
  nd: { label: "Ndebele", native: "isiNdebele", htmlLang: "nd" },
};

/** Narrow an untrusted string (cookie, header) to a supported locale. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

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
