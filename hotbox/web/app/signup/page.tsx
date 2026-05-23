"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

export default function SignupPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  )
}

function SignupInner(): React.ReactElement {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get("next") || "/"

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordsMatch = password === confirm
  const canSubmit =
    email.length > 0 && phone.length >= 10 && password.length >= 8 && passwordsMatch

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone,
          name: name.trim() || null,
          password,
        }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error || "Signup failed")
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
    <main className="mx-auto max-w-md min-h-screen flex flex-col px-6 pt-12 pb-12">
      <header className="mb-8">
        <h1
          className="font-display text-7xl leading-none"
          style={{ color: "var(--color-brand-500)" }}
        >
          HOTBOX
        </h1>
        <p className="mt-3 text-zinc-700">Create your account</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Email
          </label>
          <input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Mobile number
          </label>
          <div className="flex items-stretch rounded-xl border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500" style={{ borderRadius: "var(--radius)" }}>
            <span className="px-4 py-3 bg-zinc-50 text-zinc-600 border-r border-zinc-200">+91</span>
            <input
              id="phone" type="tel" autoComplete="tel-national" inputMode="numeric" required
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210" maxLength={10}
              className="flex-1 px-4 py-3 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Name <span className="font-normal normal-case text-zinc-400">(optional)</span>
          </label>
          <input
            id="name" type="text" autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Password <span className="font-normal normal-case text-zinc-400">(min 8 chars)</span>
          </label>
          <input
            id="password" type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Confirm password
          </label>
          <input
            id="confirm" type="password" autoComplete="new-password" required minLength={8}
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-brand-500 ${confirm && !passwordsMatch ? "border-red-400" : "border-zinc-300"}`}
            style={{ borderRadius: "var(--radius)" }}
          />
          {confirm && !passwordsMatch && (
            <p className="text-xs text-red-600 mt-1">Passwords don&rsquo;t match</p>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit" disabled={submitting || !canSubmit}
          className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ background: "var(--color-brand-500)", borderRadius: "var(--radius)" }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link
          href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-4"
          style={{ color: "var(--color-brand-500)" }}
        >
          Sign in
        </Link>
      </p>
    </main>
  )
}
