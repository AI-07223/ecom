"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Logo } from "@/components/brand/Logo"

const inputStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
  color: "var(--color-shell-fg)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner(): React.ReactElement {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get("next") || "/"

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error || "Login failed")
        return
      }
      const role = body.user?.role as string | undefined
      if (role === "admin") router.push("/admin")
      else if (role === "rider") router.push("/rider")
      else router.push(next)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md min-h-dvh flex flex-col px-6 pt-12 pb-12">
      <header className="mb-8">
        <Logo variant="full" size="md" />
        <p className="mt-5 text-base" style={{ color: "var(--color-charcoal-strong)" }}>
          Sign in
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={labelStyle}
          >
            Email or phone
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or 98765 43210"
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider"
              style={labelStyle}
            >
              Password
            </label>
            <Link
              href="/reset-request"
              className="text-xs underline underline-offset-4"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
            required
            minLength={1}
          />
        </div>

        {error && (
          <div
            className="text-sm rounded-lg px-4 py-3"
            style={{
              background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
              color: "var(--color-brand-flame-300)",
              border: "1px solid var(--color-brand-flame-700)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !identifier || !password}
          className="w-full py-3.5 font-bold disabled:opacity-50"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p
        className="mt-8 text-center text-sm"
        style={{ color: "var(--color-charcoal)" }}
      >
        New to Hot Box?{" "}
        <Link
          href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-4"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          Create account
        </Link>
      </p>

      <footer
        className="mt-auto pt-12 text-center text-xs"
        style={{ color: "var(--color-charcoal)" }}
      >
        Hot Box · Cloud Kitchen · Bangalore
      </footer>
    </main>
  )
}
