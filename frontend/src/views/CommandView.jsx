import { useState, useEffect } from 'react'
import { getSampleShipments, analyzeShipment } from '../api'
import { Badge, Card, Spinner, ErrorBox } from '../components'

export default function CommandView({ onSelectResult }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const shipments = await getSampleShipments()
      const analyzed = []
      for (const s of shipments) {
        try {
          const res = await analyzeShipment(s)
          analyzed.push(res)
        } catch (e) {
          // skip failed
        }
      }
      setResults(analyzed)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { runAll() }, [])

  const totalLoss = results.reduce((s, r) => s + r.decision.chosen_scenario.total_loss_usd, 0)
  const totalCost = results.reduce((s, r) => s + r.decision.chosen_scenario.cost_usd, 0)
  const critical = results.filter(r => r.risk_level === 'CRITICAL')
  const high = results.filter(r => r.risk_level === 'HIGH')

  // Potential savings: difference between worst scenario and chosen scenario per shipment
  const savings = results.reduce((s, r) => {
    const worst = Math.max(...r.scenarios.map(sc => sc.total_loss_usd))
    return s + (worst - r.decision.chosen_scenario.total_loss_usd)
  }, 0)

  const sorted = [...results].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    return order[a.risk_level] - order[b.risk_level]
  })

  return (
    <div className="page">
      <div className="command-header">
        <div>
          <h1>Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Top-priority actions across all active shipments
          </p>
        </div>
        <button className="btn btn-primary" onClick={runAll} disabled={loading}>
          {loading ? '⟳ Refreshing...' : '↺ Refresh'}
        </button>
      </div>

      {error && <div style={{ marginBottom: 16 }}><ErrorBox message={error} /></div>}

      {loading ? <Spinner label="Running analysis on all shipments..." /> : (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Revenue at Risk', value: `$${totalLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--high)' },
              { label: 'Total Action Cost', value: `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: null },
              { label: 'Potential Savings', value: `$${savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--low)' },
              { label: 'Critical Alerts', value: critical.length + high.length, color: critical.length > 0 ? 'var(--critical)' : 'var(--medium)' },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
              </div>
            ))}
          </div>

          {critical.length > 0 && (
            <Card title="🚨 Critical — Immediate Action Required" style={{ marginBottom: 16, borderColor: 'rgba(220,38,38,0.4)' }}>
              <div className="critical-list">
                {critical.map(r => <CriticalItem key={r.shipment_id} result={r} onClick={() => onSelectResult(r)} />)}
              </div>
            </Card>
          )}

          {high.length > 0 && (
            <Card title="⚠ High Risk" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className="critical-list">
                {high.map(r => <CriticalItem key={r.shipment_id} result={r} onClick={() => onSelectResult(r)} />)}
              </div>
            </Card>
          )}

          <Card title="All Shipments — Priority Order">
            <div className="critical-list">
              {sorted.map(r => <CriticalItem key={r.shipment_id} result={r} onClick={() => onSelectResult(r)} />)}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function CriticalItem({ result, onClick }) {
  const s = result.decision.chosen_scenario
  return (
    <div className="critical-item" onClick={onClick}>
      <div className="critical-item-left">
        <div className="critical-item-id">{result.shipment_id}</div>
        <div className="critical-item-route" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {result.real_world_data.route.distance_km} km · Delay {result.real_world_data.current_delay_hours}h · {result.real_world_data.weather.condition}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loss</div>
          <div style={{ fontWeight: 700, color: 'var(--high)' }}>${s.total_loss_usd.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confidence</div>
          <div style={{ fontWeight: 700 }}>{(result.decision.confidence_score * 100).toFixed(0)}%</div>
        </div>
        <Badge level={result.risk_level} />
        <Badge level={result.decision.chosen_action} />
        <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
      </div>
    </div>
  )
}
