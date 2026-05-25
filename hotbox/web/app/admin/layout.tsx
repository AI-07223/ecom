import Link from "next/link"
import { notFound } from "next/navigation"
import { Logo } from "@/components/brand/Logo"
import { getCurrentUser } from "@/lib/session"
import { AdminNav } from "./AdminNav"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  // Per spec: non-admins get 404 (we don't leak that the route exists).
  if (!user || user.role !== "admin") notFound()

  return (
    <div className="min-h-dvh" style={{ background: "var(--color-shell-bg)" }}>
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: "color-mix(in oklab, var(--color-shell-bg) 90%, transparent)",
          borderBottom: "1px solid var(--color-shell-line)",
        }}
      >
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            aria-label="Hot Box admin"
          >
            <Logo variant="flame-only" size="sm" />
            <span
              className="font-bold tracking-tight"
              style={{ color: "var(--color-shell-fg)" }}
            >
              Hot Box · Admin
            </span>
          </Link>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--color-charcoal)" }}
          >
            {user.phone}
          </span>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-2xl mx-auto px-5 py-6 pb-20">{children}</main>
    </div>
  )
}
