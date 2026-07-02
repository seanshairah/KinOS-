"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@kinos/ui";

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
              "flex items-center justify-between rounded-card px-3.5 py-2.5 text-[13.5px] font-medium no-underline transition-colors",
              active
                ? "bg-dusk text-white"
                : "text-ink-soft hover:bg-paper-2 hover:text-ink",
            )}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className={cx(
                  "ml-2 rounded-pill px-2 py-0.5 font-mono text-[10.5px]",
                  active ? "bg-white/20 text-white" : "bg-ember-soft text-ember-text",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
