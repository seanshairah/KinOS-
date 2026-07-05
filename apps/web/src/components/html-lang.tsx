"use client";

import { useEffect } from "react";

/**
 * Sets the document language for the app segment to the member's chosen
 * locale, for screen readers and the browser. Kept off the root layout so
 * the marketing pages stay static and CDN-cached (reading the locale cookie
 * there would force every page dynamic). Renders nothing.
 */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
