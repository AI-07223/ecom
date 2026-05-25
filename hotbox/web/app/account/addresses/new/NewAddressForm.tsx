"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { addAddress } from "@/app/_actions/addresses"

const MapPinPicker = dynamic(
  () => import("@/components/MapPinPicker").then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <MapSkeleton /> },
)

function MapSkeleton(): React.ReactElement {
  return (
    <div
      className="rounded-2xl animate-pulse"
      style={{
        height: 320,
        background: "var(--color-shell-elev)",
        border: "1px solid var(--color-shell-line)",
        borderRadius: "var(--radius)",
      }}
    />
  )
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-shell-elev)",
  border: "1px solid var(--color-shell-line)",
  borderRadius: "var(--radius)",
  color: "var(--color-shell-fg)",
}

const labelStyle: React.CSSProperties = {
  color: "var(--color-charcoal)",
}

interface Props {
  defaultCenter: { latitude: number; longitude: number }
}

export function NewAddressForm({ defaultCenter }: Props): React.ReactElement {
  const router = useRouter()
  const [label, setLabel] = useState<"HOME" | "WORK" | "OTHER">("HOME")
  const [fullAddress, setFullAddress] = useState("")
  const [building, setBuilding] = useState("")
  const [floor, setFloor] = useState("")
  const [landmark, setLandmark] = useState("")
  const [coords, setCoords] = useState(defaultCenter)
  const [makeDefault, setMakeDefault] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await addAddress({
        label,
        fullAddress: fullAddress.trim(),
        building: building.trim() || null,
        floor: floor.trim() || null,
        landmark: landmark.trim() || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: makeDefault,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push("/account/addresses")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <MapPinPicker
        initialCenter={defaultCenter}
        onChange={(c) => setCoords(c)}
      />

      <div className="grid grid-cols-3 gap-2">
        {(["HOME", "WORK", "OTHER"] as const).map((l) => {
          const isActive = label === l
          return (
            <button
              type="button"
              key={l}
              onClick={() => setLabel(l)}
              className="py-2 text-sm font-medium"
              style={{
                background: isActive
                  ? "color-mix(in oklab, var(--color-brand-yellow-300) 14%, var(--color-shell-elev))"
                  : "var(--color-shell-elev)",
                border: `1px solid ${isActive ? "var(--color-brand-yellow-300)" : "var(--color-shell-line)"}`,
                borderRadius: "var(--radius)",
                color: isActive
                  ? "var(--color-brand-yellow-300)"
                  : "var(--color-charcoal-strong)",
              }}
            >
              {l.charAt(0) + l.slice(1).toLowerCase()}
            </button>
          )
        })}
      </div>

      <div>
        <label
          htmlFor="full"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={labelStyle}
        >
          Address
        </label>
        <textarea
          id="full"
          required
          rows={2}
          value={fullAddress}
          onChange={(e) => setFullAddress(e.target.value.slice(0, 500))}
          placeholder="House / flat no, street, neighborhood"
          className="w-full px-4 py-3 outline-none focus:ring-2"
          style={inputStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="building"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={labelStyle}
          >
            Building
          </label>
          <input
            id="building"
            value={building}
            onChange={(e) => setBuilding(e.target.value.slice(0, 120))}
            placeholder="Tower B"
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="floor"
            className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={labelStyle}
          >
            Floor
          </label>
          <input
            id="floor"
            value={floor}
            onChange={(e) => setFloor(e.target.value.slice(0, 40))}
            placeholder="3rd"
            className="w-full px-4 py-3 outline-none focus:ring-2"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="landmark"
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={labelStyle}
        >
          Landmark{" "}
          <span
            className="font-normal normal-case"
            style={{ color: "var(--color-charcoal)" }}
          >
            (optional)
          </span>
        </label>
        <input
          id="landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value.slice(0, 120))}
          placeholder="Opposite Forum Mall"
          className="w-full px-4 py-3 outline-none focus:ring-2"
          style={inputStyle}
        />
      </div>

      <label
        className="flex items-center gap-3 text-sm"
        style={{ color: "var(--color-shell-fg)" }}
      >
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
          style={{ accentColor: "var(--color-brand-yellow-300)" }}
        />
        Set as default address
      </label>

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
        disabled={submitting || fullAddress.trim().length < 8}
        className="w-full py-3.5 font-bold disabled:opacity-50"
        style={{
          background: "var(--color-brand-yellow-300)",
          color: "var(--color-shell-bg)",
          borderRadius: "var(--radius)",
        }}
      >
        {submitting ? "Saving…" : "Save address"}
      </button>
    </form>
  )
}
