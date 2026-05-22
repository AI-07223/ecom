"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { addAddress } from "@/app/_actions/addresses"

// Leaflet only loads in the browser — avoid SSR.
const MapPinPicker = dynamic(
  () => import("@/components/MapPinPicker").then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <MapSkeleton /> },
)

function MapSkeleton(): React.ReactElement {
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-zinc-100 animate-pulse"
      style={{ height: 320, borderRadius: "var(--radius)" }}
    />
  )
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
        {(["HOME", "WORK", "OTHER"] as const).map((l) => (
          <button
            type="button"
            key={l}
            onClick={() => setLabel(l)}
            className={`py-2 rounded-lg border text-sm font-medium ${
              label === l
                ? "border-brand-500 bg-brand-50 text-zinc-900"
                : "border-zinc-200 text-zinc-600"
            }`}
            style={{ borderRadius: "var(--radius)" }}
          >
            {l.charAt(0) + l.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div>
        <label
          htmlFor="full"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
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
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="building"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
          >
            Building
          </label>
          <input
            id="building"
            value={building}
            onChange={(e) => setBuilding(e.target.value.slice(0, 120))}
            placeholder="Tower B"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div>
          <label
            htmlFor="floor"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
          >
            Floor
          </label>
          <input
            id="floor"
            value={floor}
            onChange={(e) => setFloor(e.target.value.slice(0, 40))}
            placeholder="3rd"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="landmark"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
        >
          Landmark <span className="font-normal normal-case text-zinc-400">(optional)</span>
        </label>
        <input
          id="landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value.slice(0, 120))}
          placeholder="Opposite Forum Mall"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(e) => setMakeDefault(e.target.checked)}
          className="accent-brand-500"
        />
        Set as default address
      </label>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || fullAddress.trim().length < 8}
        className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-50"
        style={{
          background: "var(--color-brand-500)",
          borderRadius: "var(--radius)",
        }}
      >
        {submitting ? "Saving…" : "Save address"}
      </button>
    </form>
  )
}
