"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

type Step = "phone" | "code"

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

  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error || "Couldn't send OTP. Please try again.")
        return
      }
      setStep("code")
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error || "Couldn't verify. Try again.")
        return
      }
      // Redirect to admin/rider home if appropriate
      const role = body.user?.role as string | undefined
      if (role === "admin") router.push("/admin")
      else if (role === "rider") router.push("/rider")
      else router.push(next)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md min-h-screen flex flex-col px-6 pt-16 pb-12">
      <header className="mb-10">
        <h1
          className="text-4xl font-black tracking-tight"
          style={{
            color: "var(--color-brand-500)",
            fontFamily: "var(--font-display)",
          }}
        >
          Hotbox
        </h1>
        <p className="mt-2 text-zinc-600">
          {step === "phone"
            ? "Enter your phone to continue."
            : `We sent a 6-digit code to ${phone}.`}
        </p>
      </header>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Mobile number
            </label>
            <div className="flex items-stretch rounded-xl border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-4 py-3 bg-zinc-50 text-zinc-600 border-r border-zinc-200">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-4 py-3 outline-none"
                required
                maxLength={14}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || phone.length < 10}
            className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{
              background: "var(--color-brand-500)",
              borderRadius: "var(--radius)",
            }}
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              6-digit code
            </label>
            <input
              id="code"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full px-4 py-4 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500 tracking-[0.5em] text-2xl text-center font-mono"
              required
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{
              background: "var(--color-brand-500)",
              borderRadius: "var(--radius)",
            }}
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("phone")
              setCode("")
              setError(null)
            }}
            className="w-full text-sm text-zinc-600 underline underline-offset-4"
          >
            Use a different number
          </button>
        </form>
      )}

      <footer className="mt-auto text-xs text-zinc-400 text-center pt-12">
        Hotbox &middot; Bangalore
      </footer>
    </main>
  )
}
