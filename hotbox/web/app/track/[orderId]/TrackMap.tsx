"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet"

const RIDER_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='40' height='40'>
     <circle cx='16' cy='16' r='13' fill='%23d24a2a'/>
     <text x='16' y='21' text-anchor='middle' font-family='sans-serif' font-weight='900' font-size='15' fill='white'>🏍</text>
   </svg>`,
)
const CUSTOMER_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 36' width='32' height='48'>
     <path d='M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z' fill='%2318181b'/>
     <circle cx='12' cy='12' r='5' fill='white'/>
   </svg>`,
)
const riderIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,${RIDER_SVG}`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})
const customerIcon = L.icon({
  iconUrl: `data:image/svg+xml;utf8,${CUSTOMER_SVG}`,
  iconSize: [32, 48],
  iconAnchor: [16, 48],
})

function FitToMarkers({
  pts,
}: {
  pts: Array<[number, number]>
}): React.ReactElement | null {
  const map = useMap()
  useEffect(() => {
    if (pts.length === 0) return
    const bounds = L.latLngBounds(pts.map(([lat, lng]) => L.latLng(lat, lng)))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [pts, map])
  return null
}

interface Props {
  riderLat: number
  riderLng: number
  customerLat: number | null
  customerLng: number | null
  riderName: string
}

export function TrackMap({
  riderLat,
  riderLng,
  customerLat,
  customerLng,
}: Props): React.ReactElement {
  const points: Array<[number, number]> = useMemo(() => {
    const arr: Array<[number, number]> = [[riderLat, riderLng]]
    if (customerLat != null && customerLng != null)
      arr.push([customerLat, customerLng])
    return arr
  }, [riderLat, riderLng, customerLat, customerLng])

  const showLine = customerLat != null && customerLng != null

  // Use a ref to track if we've initialized; subsequent rider pings move
  // the marker smoothly without re-fitting bounds (so the user can pan).
  const initialized = useRef(false)
  useEffect(() => {
    initialized.current = true
  }, [])

  return (
    <div
      className="overflow-hidden rounded-2xl border border-zinc-200"
      style={{ borderRadius: "var(--radius)", height: 280 }}
    >
      <MapContainer
        center={[riderLat, riderLng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {!initialized.current && <FitToMarkers pts={points} />}
        <Marker position={[riderLat, riderLng]} icon={riderIcon} />
        {showLine && customerLat != null && customerLng != null && (
          <>
            <Marker
              position={[customerLat, customerLng]}
              icon={customerIcon}
            />
            <Polyline
              positions={[
                [riderLat, riderLng],
                [customerLat, customerLng],
              ]}
              pathOptions={{
                color: "#d24a2a",
                weight: 3,
                opacity: 0.6,
                dashArray: "8 6",
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}
