import { useState, useEffect } from 'react'
import { addSupplier, getSuppliers, addDealer, getDealers } from '../api'
import { Card, ErrorBox } from '../components'

const SUPPLIER_DEFAULTS = { name: '', location: '', reliability: 0.8, avg_delay: 8, cost_index: 1.0 }
const DEALER_DEFAULTS = { name: '', location: '', profit: 1000, payment_delay: 15, order_frequency: 12 }

export default function EntityManager() {
  const [tab, setTab] = useState('suppliers')
  const [suppliers, setSuppliers] = useState([])
  const [dealers, setDealers] = useState([])
  const [sForm, setSForm] = useState(SUPPLIER_DEFAULTS)
  const [dForm, setDForm] = useState(DEALER_DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(() => {})
    getDealers().then(setDealers).catch(() => {})
  }, [])

  const setS = (k) => (e) => setSForm(f => ({ ...f, [k]: e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value }))
  const setD = (k) => (e) => setDForm(f => ({ ...f, [k]: e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value }))

  const submitSupplier = async (e) => {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      const s = await addSupplier(sForm)
      setSuppliers(prev => [...prev, s])
      setSForm(SUPPLIER_DEFAULTS)
      setSuccess('Supplier added')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const submitDealer = async (e) => {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      const d = await addDealer(dForm)
      setDealers(prev => [...prev, d])
      setDForm(DEALER_DEFAULTS)
      setSuccess('Dealer added')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Suppliers & Dealers</h1>
        <p>Manage your business entities — these influence decision scoring</p>
      </div>

      <div className="tabs">
        {['suppliers', 'dealers'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === 'suppliers' ? suppliers.length : dealers.length})
          </div>
        ))}
      </div>

      {error && <div style={{ marginBottom: 16 }}><ErrorBox message={error} /></div>}
      {success && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: 'var(--low)', fontSize: 13 }}>
        ✓ {success}
      </div>}

      {tab === 'suppliers' && (
        <div className="grid-2" style={{ gap: 20 }}>
          <Card title="Add Supplier">
            <form onSubmit={submitSupplier}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['name','Name','text'],['location','Location (City)','text']].map(([k,l,t]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input type={t} value={sForm[k]} onChange={setS(k)} required />
                  </div>
                ))}
                {[['reliability','Reliability (0-1)'],['avg_delay','Avg Delay (hours)'],['cost_index','Cost Index (0.5-2.0)']].map(([k,l]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input type="number" step="any" value={sForm[k]} onChange={setS(k)} required />
                  </div>
                ))}
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? '...' : '+ Add Supplier'}
                </button>
              </div>
            </form>
          </Card>

          <Card title={`Suppliers (${suppliers.length})`}>
            {suppliers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No suppliers added yet</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Location</th><th>Reliability</th><th>Avg Delay</th><th>Cost</th></tr></thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.location}</td>
                      <td><span style={{ color: s.reliability >= 0.7 ? 'var(--low)' : 'var(--high)' }}>{(s.reliability * 100).toFixed(0)}%</span></td>
                      <td>{s.avg_delay}h</td>
                      <td>{s.cost_index}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'dealers' && (
        <div className="grid-2" style={{ gap: 20 }}>
          <Card title="Add Dealer">
            <form onSubmit={submitDealer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['name','Name','text'],['location','Location (City)','text']].map(([k,l,t]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input type={t} value={dForm[k]} onChange={setD(k)} required />
                  </div>
                ))}
                {[['profit','Profit (USD)'],['payment_delay','Payment Delay (days)'],['order_frequency','Order Frequency (per year)']].map(([k,l]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input type="number" step="any" value={dForm[k]} onChange={setD(k)} required />
                  </div>
                ))}
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? '...' : '+ Add Dealer'}
                </button>
              </div>
            </form>
          </Card>

          <Card title={`Dealers (${dealers.length})`}>
            {dealers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No dealers added yet</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Location</th><th>Profit</th><th>Pay Delay</th><th>Orders/yr</th></tr></thead>
                <tbody>
                  {dealers.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.location}</td>
                      <td>${d.profit.toLocaleString()}</td>
                      <td>{d.payment_delay}d</td>
                      <td>{d.order_frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
