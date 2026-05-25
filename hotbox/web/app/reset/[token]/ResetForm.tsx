"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const inputStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
  color: "var(--color-shell-fg)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

export function ResetForm({ token }: { token: string }): React.ReactElement {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordsMatch = password === confirm
  const canSubmit = password.length >= 8 && passwordsMatch

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error || "Reset failed")
        return
      }
      router.push("/")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={labelStyle}
        >
          New password{" "}
          <span
            className="font-normal normal-case"
            style={{ color: "var(--color-charcoal)" }}
          >
            (min 8 chars)
          </span>
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 outline-none focus:ring-2"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={labelStyle}
        >
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-3 outline-none focus:ring-2"
          style={{
            ...inputStyle,
            border:
              confirm && !passwordsMatch
                ? "1px solid var(--color-brand-flame-500)"
                : inputStyle.border,
          }}
        />
        {confirm && !passwordsMatch && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-brand-flame-400)" }}
          >
            Passwords don&rsquo;t match
          </p>
        )}
      </div>

      {error && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{
            background:
              "color-mix(in oklab, var(--color-brand-flame-500) 18%, transparent)",
            color: "var(--color-brand-flame-300)",
            border: "1px solid var(--color-brand-flame-700)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="w-full py-3.5 font-bold disabled:opacity-50"
        style={{
          background: "var(--color-brand-yellow-300)",
          color: "var(--color-shell-bg)",
          borderRadius: "var(--radius)",
        }}
      >
        {submitting ? "Setting password…" : "Set new password & sign in"}
      </button>
    </form>
  )
}
