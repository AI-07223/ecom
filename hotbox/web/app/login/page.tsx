"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

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
    <main className="mx-auto max-w-md min-h-screen flex flex-col px-6 pt-16 pb-12">
      <header className="mb-10">
        <h1
          className="font-display text-7xl leading-none"
          style={{ color: "var(--color-brand-500)" }}
        >
          HOTBOX
        </h1>
        <p className="mt-3 text-zinc-700">Sign in</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
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
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
            required
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Password
            </label>
            <Link
              href="/reset-request"
              className="text-xs text-zinc-600 underline underline-offset-4 hover:opacity-80"
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
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
            required
            minLength={1}
          />
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !identifier || !password}
          className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{
            background: "var(--color-brand-500)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-600">
        New to Hotbox?{" "}
        <Link
          href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-4"
          style={{ color: "var(--color-brand-500)" }}
        >
          Create account
        </Link>
      </p>

      <footer className="mt-auto pt-12 text-center text-xs text-zinc-400">
        Hotbox · Bangalore
      </footer>
    </main>
  )
}
