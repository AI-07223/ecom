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

const errBoxStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
  color: "var(--color-brand-flame-300)",
  border: "1px solid var(--color-brand-flame-700)",
}

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
    <main className="mx-auto max-w-md min-h-dvh flex flex-col px-6 pt-12 pb-12">
      <header className="mb-8">
        <Logo variant="full" size="md" />
        <p className="mt-5 text-base" style={{ color: "var(--color-charcoal-strong)" }}>
          Create your account
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={labelStyle}>
            Email
          </label>
          <input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={labelStyle}>
            Mobile number
          </label>
          <div className="flex items-stretch overflow-hidden focus-within:ring-2" style={inputStyle}>
            <span
              className="px-4 py-3 border-r"
              style={{
                background: "var(--color-shell-bg)",
                color: "var(--color-charcoal-strong)",
                borderColor: "var(--color-shell-line)",
              }}
            >
              +91
            </span>
            <input
              id="phone" type="tel" autoComplete="tel-national" inputMode="numeric" required
              value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210" maxLength={10}
              className="flex-1 px-4 py-3 outline-none bg-transparent"
              style={{ color: "var(--color-shell-fg)" }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={labelStyle}>
            Name <span className="font-normal normal-case" style={{ color: "var(--color-charcoal)" }}>(optional)</span>
          </label>
          <input
            id="name" type="text" autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={labelStyle}>
            Password <span className="font-normal normal-case" style={{ color: "var(--color-charcoal)" }}>(min 8 chars)</span>
          </label>
          <input
            id="password" type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={labelStyle}>
            Confirm password
          </label>
          <input
            id="confirm" type="password" autoComplete="new-password" required minLength={8}
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={{
              ...inputStyle,
              border: confirm && !passwordsMatch
                ? "1px solid var(--color-brand-flame-500)"
                : inputStyle.border,
            }}
          />
          {confirm && !passwordsMatch && (
            <p className="text-xs mt-1" style={{ color: "var(--color-brand-flame-400)" }}>
              Passwords don&rsquo;t match
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3" style={errBoxStyle}>
            {error}
          </div>
        )}

        <button
          type="submit" disabled={submitting || !canSubmit}
          className="w-full py-3.5 font-bold disabled:opacity-50"
          style={{
            background: "var(--color-brand-yellow-300)",
            color: "var(--color-shell-bg)",
            borderRadius: "var(--radius)",
          }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm" style={{ color: "var(--color-charcoal)" }}>
        Already have an account?{" "}
        <Link
          href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold underline underline-offset-4"
          style={{ color: "var(--color-brand-yellow-300)" }}
        >
          Sign in
        </Link>
      </p>
    </main>
  )
}
