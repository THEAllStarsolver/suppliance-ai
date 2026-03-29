import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function AuthView() {
  const { login, register, authError } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', company: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      if (mode === 'login') await login(form.email, form.password, form.company)
      else await register(form.email, form.password, form.company)
    } catch (ex) {
      setErr(ex.message || 'Authentication failed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SupplyChain AI
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>Decision & Audit Engine</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </div>
        </div>

        <div className="card">
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'register' && (
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" value={form.company} onChange={set('company')}
                    placeholder="Acme Logistics" required />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="you@company.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={set('password')}
                  placeholder="••••••••" required />
              </div>

              {(err || authError) && (
                <div className="error-box">⚠ {err || authError}</div>
              )}

              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                {loading ? '⟳ Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </span>
          </div>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => login('demo@supplychain.ai', 'demo123', 'Demo Logistics Co.')}>
              Continue as Demo User →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
