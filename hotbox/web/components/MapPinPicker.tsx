"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useMemo, useState } from "react"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"

/**
 * Drop-a-pin map picker built on Leaflet + OpenStreetMap (no API key).
 *
 * - Centered on the provided lat/lng (typically the restaurant) so the
 *   first interaction makes geographic sense.
 * - Single draggable marker; tapping anywhere moves the marker.
 * - If the user grants browser geolocation, the marker can auto-jump to
 *   their current position via the "Use my location" button.
 * - Mobile-first: 320px+ width, touch gestures enabled.
 */

interface Props {
  /** Initial map center if no marker is set yet. */
  initialCenter: { latitude: number; longitude: number }
  /** Initial marker location (defaults to initialCenter). */
  initialMarker?: { latitude: number; longitude: number } | null
  /** Notifies parent on every change. */
  onChange: (coords: { latitude: number; longitude: number }) => void
  /** Pixel height. Defaults to a comfortable mobile-friendly size. */
  height?: number
}

// Leaflet's default marker icons reference image URLs that break in
// bundled environments. Inline an SVG as the marker.
const PIN_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 36' width='32' height='48'>
     <path d='M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z' fill='%23d24a2a'/>
     <circle cx='12' cy='12' r='5' fill='white'/>
   </svg>`,
)
const pinIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,${PIN_SVG}`,
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -40],
})

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterOnMarker({
  lat,
  lng,
  active,
}: {
  lat: number
  lng: number
  active: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (active) map.setView([lat, lng], Math.max(map.getZoom(), 16))
  }, [lat, lng, active, map])
  return null
}

export function MapPinPicker({
  initialCenter,
  initialMarker,
  onChange,
  height = 320,
}: Props): React.ReactElement {
  const start = initialMarker ?? initialCenter
  const [pos, setPos] = useState({ lat: start.latitude, lng: start.longitude })
  const [recenter, setRecenter] = useState(false)

  const center = useMemo<[number, number]>(
    () => [initialCenter.latitude, initialCenter.longitude],
    [initialCenter.latitude, initialCenter.longitude],
  )

  function move(lat: number, lng: number): void {
    setPos({ lat, lng })
    setRecenter(false)
    onChange({ latitude: lat, longitude: lng })
  }

  function useMyLocation(): void {
    if (!("geolocation" in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (g) => {
        setPos({ lat: g.coords.latitude, lng: g.coords.longitude })
        setRecenter(true)
        onChange({ latitude: g.coords.latitude, longitude: g.coords.longitude })
      },
      () => {
        /* permission denied — keep current pin */
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    )
  }

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-2xl border border-zinc-200 relative"
        style={{ borderRadius: "var(--radius)", height }}
      >
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={15}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker
            position={[pos.lat, pos.lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng()
                move(lat, lng)
              },
            }}
          />
          <ClickToMove onMove={move} />
          <RecenterOnMarker lat={pos.lat} lng={pos.lng} active={recenter} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span className="tabular-nums">
          {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          className="underline underline-offset-4 hover:opacity-70"
        >
          Use my location
        </button>
      </div>
      {/* Hidden inputs so server forms can read the coords without a JS bridge */}
      <input type="hidden" name="latitude" value={pos.lat} readOnly />
      <input type="hidden" name="longitude" value={pos.lng} readOnly />
      {/* Diagnostic: when initialCenter differs we want React to know about the centroid */}
      <input
        type="hidden"
        name="_initialCenter"
        value={`${center[0]},${center[1]}`}
        readOnly
      />
    </div>
  )
}
