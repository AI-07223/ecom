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
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--color-charcoal)" }}
        >
          Payment screenshot{" "}
          <span
            className="normal-case font-bold"
            style={{ color: "var(--color-brand-flame-400)" }}
          >
            required
          </span>
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
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium"
          style={{
            color: "var(--color-shell-fg)",
            // Style the native file button via ::-webkit-file-upload-button
            // through Tailwind file: prefix (resolves to inline-tinted bg).
          }}
          required
        />
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-charcoal)" }}
        >
          Take a screenshot of the success page in your UPI app and upload
          here. We auto-compress to save space; original quality not needed.
        </p>
        {file && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-veg)" }}
          >
            ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB) — ready
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="utr"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--color-charcoal)" }}
        >
          UPI reference (UTR){" "}
          <span
            className="font-normal normal-case"
            style={{ color: "var(--color-charcoal)" }}
          >
            optional
          </span>
        </label>
        <input
          id="utr"
          inputMode="text"
          autoCapitalize="characters"
          value={utr}
          onChange={(e) =>
            setUtr(
              e.target.value
                .replace(/[^A-Z0-9]/gi, "")
                .slice(0, 30)
                .toUpperCase(),
            )
          }
          placeholder="e.g. 423187659012"
          className="w-full px-4 py-3 outline-none focus:ring-2 tabular-nums font-mono tracking-wider"
          style={{
            background: "var(--color-shell-elev)",
            border: "1px solid var(--color-shell-line)",
            borderRadius: "var(--radius)",
            color: "var(--color-shell-fg)",
          }}
        />
        <p
          className="text-xs mt-1"
          style={{ color: "var(--color-charcoal)" }}
        >
          Helps the admin verify faster. Find it in your UPI app under
          transaction history.
        </p>
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
        {submitting ? "Uploading…" : "Submit for verification"}
      </button>
    </form>
  )
}
