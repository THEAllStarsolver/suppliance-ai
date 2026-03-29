import { useState } from 'react'
import { approveDecision, rejectDecision } from '../api'

export default function ApprovalModal({ approval, auditId, onDone }) {
  const [loading, setLoading] = useState(null)
  const [done, setDone] = useState(null)

  if (!approval?.requires_approval) return null

  const handle = async (action) => {
    setLoading(action)
    try {
      if (action === 'approve') await approveDecision(auditId)
      else await rejectDecision(auditId)
      setDone(action)
      setTimeout(() => onDone?.(action), 1200)
    } catch (e) {
      setLoading(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: 440, border: '1px solid rgba(239,68,68,0.4)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          🤖 AI Recommendation — Approval Required
        </div>
        <div className="explanation-box" style={{ marginBottom: 16 }}>
          {approval.reason}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['Action', approval.recommended_action],
            ['Confidence', `${(approval.confidence * 100).toFixed(0)}%`],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</div>
              <div style={{ fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0', fontWeight: 600,
            color: done === 'approve' ? 'var(--low)' : 'var(--high)' }}>
            {done === 'approve' ? '✓ Decision Approved' : '✗ Decision Rejected'}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
              disabled={!!loading} onClick={() => handle('approve')}>
              {loading === 'approve' ? '...' : '✓ Approve'}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center',
              borderColor: 'rgba(239,68,68,0.4)', color: 'var(--high)' }}
              disabled={!!loading} onClick={() => handle('reject')}>
              {loading === 'reject' ? '...' : '✗ Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
