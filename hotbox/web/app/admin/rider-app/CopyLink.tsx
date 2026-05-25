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
      className="px-5 py-2.5 font-semibold text-sm"
      style={{
        background: "var(--color-shell-bg)",
        border: "1px solid var(--color-shell-line)",
        color: "var(--color-charcoal-strong)",
        borderRadius: "var(--radius)",
      }}
    >
      {copied ? "Copied!" : "Copy install link"}
    </button>
  )
}
