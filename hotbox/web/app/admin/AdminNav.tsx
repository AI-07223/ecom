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
    <nav className="max-w-2xl mx-auto px-5 flex gap-1 overflow-x-auto border-b border-transparent -mb-px">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/")
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap ${
              active
                ? "border-b-2 border-brand-500 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
            style={
              active
                ? { borderColor: "var(--color-brand-500)" }
                : undefined
            }
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
