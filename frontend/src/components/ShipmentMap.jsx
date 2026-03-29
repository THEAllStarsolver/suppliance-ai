import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from 'react-leaflet'
import { geocodeCity } from '../api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ROUTE_COLORS = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' }

function interpolate(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export default function ShipmentMap({ result, supplierCity, dealerCity }) {
  const [coords, setCoords] = useState({ origin: null, dest: null, supplier: null, dealer: null })
  const [loading, setLoading] = useState(true)

  const rw = result?.real_world_data
  const riskLevel = result?.risk_level || 'LOW'
  const routeColor = ROUTE_COLORS[riskLevel]
  const travelHours = rw?.route?.estimated_travel_hours || 1
  const delayHours = rw?.current_delay_hours || 0
  const progress = Math.min(Math.max(travelHours - delayHours, 0) / travelHours, 0.95)

  useEffect(() => {
    if (!rw) return
    async function load() {
      setLoading(true)
      const [supplierCoords, dealerCoords] = await Promise.all([
        supplierCity ? geocodeCity(supplierCity).catch(() => null) : Promise.resolve(null),
        dealerCity ? geocodeCity(dealerCity).catch(() => null) : Promise.resolve(null),
      ])
      setCoords({
        origin: rw?.route?.origin_coords || null,
        dest: rw?.route?.dest_coords || null,
        supplier: supplierCoords ? [supplierCoords.lat, supplierCoords.lon] : null,
        dealer: dealerCoords ? [dealerCoords.lat, dealerCoords.lon] : null,
      })
      setLoading(false)
    }
    load()
  }, [rw, supplierCity, dealerCity])

  if (loading || !coords.origin || !coords.dest) {
    return (
      <div style={{ height: 360, background: 'var(--surface2)', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 13 }}>
        {loading ? '⟳ Loading map...' : 'Coordinates unavailable — check city names'}
      </div>
    )
  }

  const center = interpolate(coords.origin, coords.dest, 0.5)
  const shipPos = interpolate(coords.origin, coords.dest, progress)

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={center} zoom={5} style={{ height: 360 }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors' />

        <Polyline positions={[coords.origin, coords.dest]}
          pathOptions={{ color: routeColor, weight: 3, dashArray: '6 4' }} />

        <Marker position={coords.origin}>
          <Popup><b>Origin</b></Popup>
        </Marker>
        <Marker position={coords.dest}>
          <Popup><b>Destination</b><br />ETA: {rw?.eta_hours?.toFixed(1)}h</Popup>
        </Marker>

        {coords.supplier && (
          <CircleMarker center={coords.supplier} radius={8}
            pathOptions={{ color: '#a78bfa', fillColor: '#a78bfa', fillOpacity: 0.8 }}>
            <Popup><b>Supplier</b><br />{supplierCity}</Popup>
          </CircleMarker>
        )}
        {coords.dealer && (
          <CircleMarker center={coords.dealer} radius={8}
            pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.8 }}>
            <Popup><b>Dealer</b><br />{dealerCity}</Popup>
          </CircleMarker>
        )}

        <CircleMarker center={shipPos} radius={10}
          pathOptions={{ color: '#fff', fillColor: routeColor, fillOpacity: 1, weight: 2 }}>
          <Popup>
            <b>Estimated Shipment Position</b><br />
            Progress: {(progress * 100).toFixed(0)}%<br />
            Delay: {delayHours.toFixed(1)}h
          </Popup>
        </CircleMarker>
      </MapContainer>

      <div style={{ background: 'var(--surface)', padding: '8px 14px', display: 'flex',
        gap: 16, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span>— <span style={{ color: routeColor }}>Route ({riskLevel} risk)</span></span>
        <span>● <span style={{ color: routeColor }}>Shipment ~{(progress * 100).toFixed(0)}% complete</span></span>
        {coords.supplier && <span>● <span style={{ color: '#a78bfa' }}>Supplier</span></span>}
        {coords.dealer && <span>● <span style={{ color: '#34d399' }}>Dealer</span></span>}
      </div>
    </div>
  )
}
