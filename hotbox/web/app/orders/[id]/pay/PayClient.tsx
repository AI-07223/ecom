"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { submitPaymentProof } from "@/app/_actions/payment-proof"

export function PayClient({ orderId }: { orderId: string }): React.ReactElement {
  const router = useRouter()
  const [utr, setUtr] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = file !== null

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!file) {
      setError("Please attach a screenshot of your UPI payment.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("orderId", orderId)
      if (utr.trim()) fd.append("utr", utr.trim())
      fd.append("screenshot", file)
      const r = await submitPaymentProof(fd)
      if (!r.ok) {
        setError(r.error)
        return
      }
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="screenshot"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          Payment screenshot <span className="text-red-600 normal-case font-normal">required</span>
        </label>
        <input
          id="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            if (f) setError(null)
          }}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:text-zinc-700 file:font-medium"
          required
        />
        <p className="text-xs text-zinc-500 mt-1">
          Take a screenshot of the success page in your UPI app and upload
          here. We auto-compress to save space; original quality not needed.
        </p>
        {file && (
          <p className="text-xs text-emerald-700 mt-1">
            ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB) — ready
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="utr"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          UPI reference (UTR) <span className="font-normal normal-case text-zinc-400">optional</span>
        </label>
        <input
          id="utr"
          inputMode="text"
          autoCapitalize="characters"
          value={utr}
          onChange={(e) =>
            setUtr(e.target.value.replace(/[^A-Z0-9]/gi, "").slice(0, 30).toUpperCase())
          }
          placeholder="e.g. 423187659012"
          className="w-full px-4 py-3 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-brand-500 tabular-nums font-mono tracking-wider"
          style={{ borderRadius: "var(--radius)" }}
        />
        <p className="text-xs text-zinc-500 mt-1">
          Helps the admin verify faster. Find it in your UPI app under
          transaction history.
        </p>
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
        {submitting ? "Uploading…" : "Submit for verification"}
      </button>
    </form>
  )
}
