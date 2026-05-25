"use client"

import Link from "next/link"
import { useState } from "react"
import { Logo } from "@/components/brand/Logo"

export default function ResetRequestPage(): React.ReactElement {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-md min-h-dvh flex flex-col px-6 pt-12 pb-12">
      <header className="mb-8">
        <Logo variant="full" size="md" />
        <p className="mt-5 text-base" style={{ color: "var(--color-charcoal-strong)" }}>
          Reset your password
        </p>
      </header>

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--color-charcoal-strong)" }}>
            Enter the email you signed up with. We&rsquo;ll send you a link to
            set a new password.
          </p>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--color-charcoal)" }}
            >
              Email
            </label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 outline-none focus:ring-2"
              style={{
                background: "var(--color-shell-elev)",
                border: "1px solid var(--color-shell-line)",
                borderRadius: "var(--radius)",
                color: "var(--color-shell-fg)",
              }}
              autoFocus
            />
          </div>
          <button
            type="submit" disabled={submitting || !email}
            className="w-full py-3.5 font-bold disabled:opacity-50"
            style={{
              background: "var(--color-brand-yellow-300)",
              color: "var(--color-shell-bg)",
              borderRadius: "var(--radius)",
            }}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: "color-mix(in oklab, var(--color-veg) 12%, transparent)",
              border: "1px solid var(--color-veg)",
              color: "var(--color-veg)",
            }}
          >
            <p className="font-semibold">Check your email</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-shell-fg)" }}
            >
              If <span className="font-medium">{email}</span> is registered,
              you&rsquo;ll get a reset link within a minute. Look in spam if you
              don&rsquo;t see it.
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--color-charcoal)" }}>
            The link expires in 1 hour. If you didn&rsquo;t get one, the email
            may not be registered — try{" "}
            <Link
              href="/signup"
              className="underline underline-offset-4"
              style={{ color: "var(--color-brand-yellow-300)" }}
            >
              creating an account
            </Link>{" "}
            instead.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm">
        <Link
          href="/login"
          className="underline underline-offset-4"
          style={{ color: "var(--color-charcoal-strong)" }}
        >
          ← Back to sign in
        </Link>
      </p>
    </main>
  )
}
