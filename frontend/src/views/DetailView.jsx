import { useState, useEffect } from 'react'
import { analyzeShipment, getAudit, getBusinessTypes, getSuppliers } from '../api'
import { Badge, Card, Spinner, ErrorBox, ConfidenceBar, InfoChip, ScenarioCard } from '../components'
import ShipmentMap from '../components/ShipmentMap'
import ApprovalModal from '../components/ApprovalModal'

const SAMPLE = {
  shipment_id: 'SHP-CUSTOM',
  origin: 'Chicago',
  destination: 'Houston',
  expected_delivery: new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 19) + 'Z',
  cargo_value_usd: 9000,
  dealer_profit_usd: 1800,
  dealer_order_frequency: 24,
  dealer_payment_score: 0.85,
  supplier_reliability: 0.75,
  budget_usd: 700,
  sla_hours: 48,
  business_type: 'electronics',
  execution_mode: 'recommendation',
}

export default function DetailView({ result: propResult, onBack }) {
  const [form, setForm] = useState(SAMPLE)
  const [result, setResult] = useState(propResult || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [audit, setAudit] = useState(null)
  const [tab, setTab] = useState('decision')
  const [bizTypes, setBizTypes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [approvalDone, setApprovalDone] = useState(false)

  useEffect(() => {
    getBusinessTypes().then(setBizTypes).catch(() => {})
    getSuppliers().then(setSuppliers).catch(() => {})
  }, [])

  useEffect(() => {
    if (propResult) { setResult(propResult); setTab('decision') }
  }, [propResult])

  const set = (k) => (e) => setForm(f => ({
    ...f, [k]: e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value
  }))

  const submit = async () => {
    setLoading(true); setError(null); setAudit(null); setApprovalDone(false)
    try {
      const res = await analyzeShipment(form)
      setResult(res); setTab('decision')
    } catch (e) { setError(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const loadAudit = async () => {
    if (!result?.audit_id) return
    try { const a = await getAudit(result.audit_id); setAudit(a); setTab('audit') }
    catch { setError('Failed to load audit record') }
  }

  const approval = result?.decision?.approval_request
  const showApproval = approval?.requires_approval && !approvalDone

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={onBack}>← Back</button>}
        <div>
          <h1>Shipment Detail & Decision</h1>
          <p>Analyze a shipment — live data, map, scenarios, approval workflow</p>
        </div>
      </div>

      {/* Input Form */}
      <Card title="Shipment Input" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          {[
            ['shipment_id','Shipment ID','text'], ['origin','Origin City','text'],
            ['destination','Destination City','text'], ['expected_delivery','Expected Delivery (ISO)','text'],
            ['cargo_value_usd','Cargo Value (USD)','number'], ['dealer_profit_usd','Dealer Profit (USD)','number'],
            ['dealer_order_frequency','Dealer Orders/Year','number'], ['dealer_payment_score','Payment Score (0-1)','number'],
            ['supplier_reliability','Supplier Reliability (0-1)','number'], ['budget_usd','Budget (USD)','number'],
            ['sla_hours','SLA Hours','number'],
          ].map(([key, label, type]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <input type={type} value={form[key]} onChange={set(key)} step={type === 'number' ? 'any' : undefined} />
            </div>
          ))}

          {/* Business Type */}
          <div className="form-group">
            <label>Business Type</label>
            <select value={form.business_type} onChange={set('business_type')}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
              {bizTypes.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              {bizTypes.length === 0 && <option value="electronics">Electronics</option>}
            </select>
          </div>

          {/* Execution Mode */}
          <div className="form-group">
            <label>Execution Mode</label>
            <select value={form.execution_mode} onChange={set('execution_mode')}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
              <option value="recommendation">Recommendation Mode</option>
              <option value="auto">Auto Execution Mode</option>
            </select>
          </div>

          {/* Supplier selector */}
          {suppliers.length > 0 && (
            <div className="form-group">
              <label>Supplier (optional)</label>
              <select value={form.supplier_id || ''} onChange={set('supplier_id')}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }}>
                <option value="">— Use manual reliability —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.location})</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? '⟳ Analyzing...' : '⚡ Analyze Shipment'}
          </button>
          {result && <button className="btn btn-ghost" onClick={loadAudit}>📋 Load Audit Trail</button>}
        </div>
      </Card>

      {error && <div style={{ marginBottom: 16 }}><ErrorBox message={error} /></div>}
      {loading && <Spinner />}

      {result && !loading && (
        <>
          {/* Live Data Inputs */}
          <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            📡 Live Data Inputs
          </div>
          <div className="info-row" style={{ marginBottom: 20 }}>
            <InfoChip label="Weather" value={result.real_world_data.weather.condition} />
            <InfoChip label="Weather Risk" value={`${(result.real_world_data.weather.risk_factor * 100).toFixed(0)}%`} />
            <InfoChip label="Distance" value={`${result.real_world_data.route.distance_km} km`} />
            <InfoChip label="Travel Time" value={`${result.real_world_data.route.estimated_travel_hours}h`} />
            <InfoChip label="Base Cost" value={`$${result.real_world_data.route.base_cost_usd}`} />
            <InfoChip label="Current Delay" value={`${result.real_world_data.current_delay_hours}h`} />
            <InfoChip label="ETA" value={`${result.real_world_data.eta_hours?.toFixed(1) ?? '—'}h`} />
            <InfoChip label="Delay Reason" value={result.real_world_data.delay_reason || '—'} />
            <InfoChip label="Risk Level" value={<Badge level={result.risk_level} />} />
          </div>

          {/* Map */}
          <div style={{ marginBottom: 20 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Route Map</div>
            <ShipmentMap result={result} />
          </div>

          {/* Execution status banner */}
          {result.decision.execution_status && (
            <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13,
              background: result.decision.execution_status === 'auto_executed'
                ? 'rgba(34,197,94,0.1)' : result.decision.execution_status === 'awaiting_approval'
                ? 'rgba(245,158,11,0.1)' : 'rgba(79,142,247,0.08)',
              border: `1px solid ${result.decision.execution_status === 'auto_executed'
                ? 'rgba(34,197,94,0.3)' : result.decision.execution_status === 'awaiting_approval'
                ? 'rgba(245,158,11,0.3)' : 'rgba(79,142,247,0.2)'}`,
              color: result.decision.execution_status === 'auto_executed' ? 'var(--low)'
                : result.decision.execution_status === 'awaiting_approval' ? 'var(--medium)' : 'var(--text)'
            }}>
              Status: <strong>{result.decision.execution_status.replace('_', ' ').toUpperCase()}</strong>
              {result.decision.execution_status === 'auto_executed' && ' — Executed automatically (high confidence)'}
              {result.decision.execution_status === 'awaiting_approval' && ' — Awaiting your approval below'}
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            {['decision', 'scenarios', 'explanation', 'audit'].map(t => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            ))}
          </div>

          {tab === 'decision' && (
            <div className="grid-2" style={{ gap: 16 }}>
              <Card title="Decision">
                <div style={{ marginBottom: 16 }}>
                  <Badge level={result.decision.chosen_action} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    {[
                      ['Cost', `$${result.decision.chosen_scenario.cost_usd.toLocaleString()}`],
                      ['Total Loss', `$${result.decision.chosen_scenario.total_loss_usd.toLocaleString()}`],
                      ['Delay', `${result.decision.chosen_scenario.delay_hours.toFixed(1)}h`],
                      ['Risk Score', `${(result.decision.chosen_scenario.risk_score * 100).toFixed(0)}%`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <ConfidenceBar value={result.decision.confidence_score} />
              </Card>

              <Card title="Action Steps">
                <ul className="action-steps">
                  {result.decision.action_steps.map((step, i) => (
                    <li key={i}><div className="step-num">{i + 1}</div><span>{step}</span></li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {tab === 'scenarios' && (
            <div className="scenario-grid">
              {result.scenarios.map(s => (
                <ScenarioCard key={s.action} scenario={s}
                  isBest={s.action === result.decision.chosen_action && s.valid} />
              ))}
            </div>
          )}

          {tab === 'explanation' && (
            <Card title="AI Explanation">
              <div className="explanation-box">{result.explanation}</div>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                Audit ID: <code style={{ color: 'var(--accent)' }}>{result.audit_id}</code>
              </div>
            </Card>
          )}

          {tab === 'audit' && (
            <Card title="Audit Trail — Step-by-Step Reasoning">
              {!audit ? (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                    Click "Load Audit Trail" above to fetch the full trace.
                  </p>
                  <button className="btn btn-ghost" onClick={loadAudit}>📋 Load Audit Trail</button>
                </div>
              ) : (
                <div className="audit-section">
                  {[
                    ['1. Timestamp', new Date(audit.timestamp).toLocaleString()],
                    ['2. Shipment ID', audit.shipment_id],
                    ['3. User ID', audit.user_id || 'anonymous'],
                    ['4. API Sources', (audit.api_sources || []).join(', ') || 'fallback'],
                    ['5. Weather', `${audit.real_world_data.weather?.condition} — risk ${(audit.real_world_data.weather?.risk_factor * 100).toFixed(0)}%`],
                    ['6. Distance', `${audit.real_world_data.route?.distance_km} km`],
                    ['7. Current Delay', `${audit.real_world_data.current_delay_hours}h`],
                    ['8. Final Action', audit.final_decision.action],
                    ['9. Risk Level', audit.final_decision.risk_level],
                    ['10. Confidence', `${(audit.final_decision.confidence * 100).toFixed(0)}%`],
                    ['11. Cost', `$${audit.final_decision.cost_usd}`],
                    ['12. Total Loss', `$${audit.final_decision.total_loss_usd}`],
                    ['13. Execution Status', audit.execution_status || 'pending'],
                  ].map(([k, v]) => (
                    <div className="audit-row" key={k}>
                      <span className="audit-key">{k}</span>
                      <span className="audit-val">{v}</span>
                    </div>
                  ))}

                  {audit.rejected_options?.length > 0 && (
                    <>
                      <div style={{ margin: '16px 0 8px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        14. Rejected Options
                      </div>
                      {audit.rejected_options.map((r, i) => (
                        <div className="audit-row" key={i}>
                          <span className="audit-key" style={{ color: 'var(--cancel)' }}>{r.action}</span>
                          <span className="audit-val">{r.reason}</span>
                        </div>
                      ))}
                    </>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      15. Explanation
                    </div>
                    <div className="explanation-box">{audit.explanation}</div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Human-in-the-loop approval modal */}
      {showApproval && (
        <ApprovalModal
          approval={approval}
          auditId={result.audit_id}
          onDone={(action) => setApprovalDone(true)}
        />
      )}
    </div>
  )
}
