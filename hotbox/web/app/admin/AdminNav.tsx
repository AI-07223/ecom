"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Inbox" },
  { href: "/admin/riders", label: "Riders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/rider-app", label: "Rider App" },
  { href: "/admin/settings", label: "Settings" },
]

export function AdminNav(): React.ReactElement {
  const path = usePathname() || "/"
  return (
    <nav className="max-w-2xl mx-auto px-5 flex gap-1 overflow-x-auto -mb-px">
      {TABS.map((t) => {
        // Match exact path or any descendant route. Special-case "/admin"
        // so it only matches the inbox, not every sub-page.
        const active =
          t.href === "/admin"
            ? path === "/admin"
            : path === t.href || path.startsWith(t.href + "/")
        return (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            style={{
              color: active
                ? "var(--color-brand-yellow-300)"
                : "var(--color-charcoal-strong)",
              borderBottom: active
                ? "2px solid var(--color-brand-yellow-300)"
                : "2px solid transparent",
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
