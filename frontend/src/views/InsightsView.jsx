import { useState, useEffect } from 'react'
import { getInsights } from '../api'
import { Card, Spinner, ErrorBox } from '../components'

export default function InsightsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getInsights().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><Spinner label="Loading insights..." /></div>
  if (error) return <div className="page"><ErrorBox message={error} /></div>

  const { profit_analysis, supplier_performance, loss_analysis, ai_recommendations,
    total_shipments, total_revenue_at_risk, avg_confidence } = data

  return (
    <div className="page">
      <div className="page-header">
        <h1>Business Intelligence</h1>
        <p>Aggregated insights from all analyzed shipments</p>
      </div>

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Shipments Analyzed', value: total_shipments },
          { label: 'Total Revenue at Risk', value: `$${total_revenue_at_risk.toLocaleString()}`, color: 'var(--high)' },
          { label: 'Avg Decision Confidence', value: `${(avg_confidence * 100).toFixed(0)}%`, color: 'var(--accent)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Profit Analysis */}
        <Card title="Profit Analysis">
          {profit_analysis.top_dealers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Top Performers</div>
              {profit_analysis.top_dealers.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{d.id}</span>
                  <span style={{ color: d.net >= 0 ? 'var(--low)' : 'var(--high)' }}>
                    Net: ${d.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
              {profit_analysis.low_performers.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 8px' }}>Low Performers</div>
                  {profit_analysis.low_performers.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{d.id}</span>
                      <span style={{ color: 'var(--high)' }}>
                        Net: ${d.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </Card>

        {/* Loss Analysis */}
        <Card title="Loss Analysis">
          {[
            ['Delay-Induced Loss', loss_analysis.delay_induced_loss, 'var(--medium)'],
            ['Cancellation Loss', loss_analysis.cancellation_loss, 'var(--high)'],
            ['Reroute Cost', loss_analysis.reroute_cost, 'var(--reroute)'],
            ['Total Loss', loss_analysis.total_loss, 'var(--critical)'],
            ['Avg Route Distance', `${loss_analysis.avg_route_distance_km} km`, null],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 700, color: color || 'var(--text)' }}>
                {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Supplier Performance */}
      <Card title="Supplier Performance" style={{ marginBottom: 20 }}>
        {supplier_performance.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No supplier data yet</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Supplier ID</th><th>Avg Reliability</th><th>Avg Loss/Shipment</th><th>Shipments</th></tr>
            </thead>
            <tbody>
              {supplier_performance.map(s => (
                <tr key={s.supplier_id}>
                  <td style={{ fontWeight: 600 }}>{s.supplier_id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                        <div style={{ width: `${s.avg_reliability * 100}%`, height: '100%',
                          background: s.avg_reliability >= 0.7 ? 'var(--low)' : 'var(--high)',
                          borderRadius: 3 }} />
                      </div>
                      <span>{(s.avg_reliability * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--high)' }}>${s.avg_loss.toLocaleString()}</td>
                  <td>{s.shipment_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* AI Recommendations */}
      <Card title="AI Recommendations">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ai_recommendations.map((rec, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px',
              background: 'var(--surface2)', borderRadius: 8, fontSize: 13,
              borderLeft: '3px solid var(--accent)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
