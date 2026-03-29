export function Badge({ level }) {
  return <span className={`badge badge-${level}`}>{level}</span>
}

export function Card({ title, children, style }) {
  return (
    <div className="card" style={style}>
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  )
}

export function Spinner({ label = 'Analyzing shipment...' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorBox({ message }) {
  return <div className="error-box">⚠ {message}</div>
}

export function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  return (
    <div className="confidence-bar-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Decision Confidence</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className="confidence-bar-bg">
        <div className="confidence-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function InfoChip({ label, value }) {
  return (
    <div className="info-chip">
      <span className="chip-label">{label}</span>
      <span className="chip-val">{value}</span>
    </div>
  )
}

export function ScenarioCard({ scenario, isBest }) {
  const actionColor = {
    WAIT: 'var(--wait)',
    REROUTE: 'var(--reroute)',
    CANCEL: 'var(--cancel)',
    ESCALATE: 'var(--escalate)',
  }[scenario.action] || 'var(--text)'

  return (
    <div className={`scenario-card ${isBest ? 'best' : ''} ${!scenario.valid ? 'invalid' : ''}`}>
      {isBest && <div className="best-tag">✓ Selected</div>}
      <div className="scenario-action" style={{ color: actionColor }}>{scenario.action}</div>
      <div className="scenario-row">
        <span className="label">Cost</span>
        <span className="value">${scenario.cost_usd.toLocaleString()}</span>
      </div>
      <div className="scenario-row">
        <span className="label">Total Loss</span>
        <span className="value">${scenario.total_loss_usd.toLocaleString()}</span>
      </div>
      <div className="scenario-row">
        <span className="label">Delay</span>
        <span className="value">{scenario.delay_hours.toFixed(1)}h</span>
      </div>
      <div className="scenario-row">
        <span className="label">Risk Score</span>
        <span className="value">{(scenario.risk_score * 100).toFixed(0)}%</span>
      </div>
      <div className="scenario-row">
        <span className="label">Decision Score</span>
        <span className="value">{scenario.score.toFixed(4)}</span>
      </div>
      {!scenario.valid && scenario.rejection_reason && (
        <div className="rejection-note">✗ {scenario.rejection_reason}</div>
      )}
    </div>
  )
}
