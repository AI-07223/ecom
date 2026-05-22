"use client"

import { useState } from "react"

export function CopyLink({ url }: { url: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Older Safari fallback
      const ta = document.createElement("textarea")
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white font-semibold text-sm text-zinc-700"
      style={{ borderRadius: "var(--radius)" }}
    >
      {copied ? "Copied!" : "Copy install link"}
    </button>
  )
}
