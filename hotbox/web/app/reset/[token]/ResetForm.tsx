"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

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
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          New password <span className="font-normal normal-case text-zinc-400">(min 8 chars)</span>
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500"
          style={{ borderRadius: "var(--radius)" }}
          autoFocus
        />
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
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
        type="submit"
        disabled={submitting || !canSubmit}
        className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50"
        style={{
          background: "var(--color-brand-500)",
          borderRadius: "var(--radius)",
        }}
      >
        {submitting ? "Setting password…" : "Set new password & sign in"}
      </button>
    </form>
  )
}
