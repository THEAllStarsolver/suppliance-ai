import { useState, useEffect } from 'react'
import { getSampleShipments, analyzeShipment } from '../api'
import { Badge, ErrorBox } from '../components'

export default function Dashboard({ onSelectResult }) {
  const [shipments, setShipments] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [error, setError] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    getSampleShipments().then(setShipments).catch(() => setError('Failed to load shipments'))
  }, [])

  const analyzeAll = async () => {
    setAnalyzing(true)
    setError(null)
    for (const s of shipments) {
      setLoading(l => ({ ...l, [s.shipment_id]: true }))
      try {
        const res = await analyzeShipment(s)
        setResults(r => ({ ...r, [s.shipment_id]: res }))
      } catch (e) {
        setResults(r => ({ ...r, [s.shipment_id]: { error: e.response?.data?.detail || e.message } }))
      }
      setLoading(l => ({ ...l, [s.shipment_id]: false }))
    }
    setAnalyzing(false)
  }

  const analyzeSingle = async (shipment, e) => {
    e.stopPropagation()
    setLoading(l => ({ ...l, [shipment.shipment_id]: true }))
    try {
      const res = await analyzeShipment(shipment)
      setResults(r => ({ ...r, [shipment.shipment_id]: res }))
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setLoading(l => ({ ...l, [shipment.shipment_id]: false }))
  }

  const analyzed = Object.values(results).filter(r => !r.error)
  const totalRisk = analyzed.reduce((s, r) => s + r.decision.chosen_scenario.total_loss_usd, 0)
  const critical = analyzed.filter(r => ['CRITICAL', 'HIGH'].includes(r.risk_level)).length

  return (
    <div className="page">
      <div className="page-header">
        <h1>Shipment Dashboard</h1>
        <p>Monitor active shipments and trigger AI decision analysis</p>
      </div>

      {error && <div style={{ marginBottom: 16 }}><ErrorBox message={error} /></div>}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Shipments', value: shipments.length, sub: 'Active in system', color: null },
          { label: 'Analyzed', value: analyzed.length, sub: 'Decisions made', color: null },
          { label: 'Revenue at Risk', value: `$${totalRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'Total projected loss', color: 'var(--high)' },
          { label: 'Critical / High', value: critical, sub: 'Needs action', color: critical > 0 ? 'var(--critical)' : 'var(--low)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Active Shipments</div>
          <button className="btn btn-primary" onClick={analyzeAll} disabled={analyzing || shipments.length === 0}>
            {analyzing ? '⟳ Analyzing...' : '⚡ Analyze All'}
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>ID</th><th>Route</th><th>Cargo Value</th><th>Dealer Profit</th>
              <th>Supplier Rel.</th><th>Risk</th><th>Decision</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(s => {
              const res = results[s.shipment_id]
              const isLoading = loading[s.shipment_id]
              return (
                <tr key={s.shipment_id} className="clickable"
                  onClick={() => res && !res.error && onSelectResult(res)}>
                  <td style={{ fontWeight: 600 }}>{s.shipment_id}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.origin} → {s.destination}</td>
                  <td>${s.cargo_value_usd.toLocaleString()}</td>
                  <td>${s.dealer_profit_usd.toLocaleString()}</td>
                  <td>{(s.supplier_reliability * 100).toFixed(0)}%</td>
                  <td>{res && !res.error ? <Badge level={res.risk_level} /> : '—'}</td>
                  <td>{res && !res.error ? <Badge level={res.decision.chosen_action} /> : res?.error ? <span style={{ color: 'var(--high)', fontSize: 12 }}>Error</span> : '—'}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={isLoading} onClick={(e) => analyzeSingle(s, e)}>
                      {isLoading ? '...' : 'Analyze'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {analyzed.length > 0 && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Click any analyzed row to view full decision details →
        </p>
      )}
    </div>
  )
}
