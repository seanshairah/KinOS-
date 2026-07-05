"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@kinos/ui";

/**
 * Room navigation — each operating room is a light in the hall. The
 * active room glows lavender; a room holding attention carries a soft
 * ember count. Horizontal on phones, a quiet column on wider screens.
 */

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Family space" className="flex flex-row gap-1 md:flex-col">
      {items.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "group flex items-center justify-between gap-2 whitespace-nowrap rounded-card px-3.5 py-2.5 text-[13.5px] font-medium no-underline transition-all duration-300",
              active
                ? "bg-gradient-to-r from-halo/[.18] to-halo/[.06] text-ink shadow-[inset_0_0_0_1px_rgba(169,167,224,.22),0_0_18px_-6px_rgba(140,138,214,.35)]"
                : "text-ink-soft hover:translate-x-0.5 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cx(
                  "h-[6px] w-[6px] flex-none rounded-full transition-all duration-300",
                  active
                    ? "bg-halo shadow-[0_0_8px_rgba(169,167,224,.8)]"
                    : item.badge
                      ? "bg-ember shadow-[0_0_6px_rgba(217,138,61,.6)]"
                      : "bg-line-2 group-hover:bg-halo/60",
                )}
              />
              <span>{item.label}</span>
            </span>
            {item.badge ? (
              <span className="ml-1 rounded-pill border border-ember-soft bg-attn-bg px-1.5 py-0.5 font-mono text-[10px] leading-none text-ember-text">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
