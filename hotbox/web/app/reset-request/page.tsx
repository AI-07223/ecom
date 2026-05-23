"use client"

import Link from "next/link"
import { useState } from "react"

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
    <main className="mx-auto max-w-md min-h-screen flex flex-col px-6 pt-16 pb-12">
      <header className="mb-10">
        <h1
          className="font-display text-7xl leading-none"
          style={{ color: "var(--color-brand-500)" }}
        >
          HOTBOX
        </h1>
        <p className="mt-3 text-zinc-700">Reset your password</p>
      </header>

      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-zinc-600">
            Enter the email you signed up with. We&rsquo;ll send you a link
            to set a new password.
          </p>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Email
            </label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
              style={{ borderRadius: "var(--radius)" }}
              autoFocus
            />
          </div>
          <button
            type="submit" disabled={submitting || !email}
            className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: "var(--color-brand-500)", borderRadius: "var(--radius)" }}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 text-emerald-900 px-5 py-4">
            <p className="font-semibold">Check your email</p>
            <p className="text-sm mt-1">
              If <span className="font-medium">{email}</span> is registered,
              you&rsquo;ll get a reset link within a minute. Look in spam if
              you don&rsquo;t see it.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            The link expires in 1 hour. If you didn&rsquo;t get one, the email
            may not be registered — try{" "}
            <Link href="/signup" className="underline underline-offset-4">
              creating an account
            </Link>{" "}
            instead.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="text-zinc-600 underline underline-offset-4">
          ← Back to sign in
        </Link>
      </p>
    </main>
  )
}
