import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { setUserId } from './api'
import Dashboard from './views/Dashboard'
import DetailView from './views/DetailView'
import CommandView from './views/CommandView'
import EntityManager from './views/EntityManager'
import InsightsView from './views/InsightsView'
import AuthView from './views/AuthView'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'detail', label: 'Shipment Detail', icon: '◈' },
  { id: 'command', label: 'Command Center', icon: '⚡' },
  { id: 'entities', label: 'Suppliers & Dealers', icon: '🏭' },
  { id: 'insights', label: 'Insights', icon: '📊' },
]

function Shell() {
  const { user, loading, logout } = useAuth()
  const [view, setView] = useState('dashboard')
  const [selectedResult, setSelectedResult] = useState(null)

  useEffect(() => {
    if (user?.uid) setUserId(user.uid)
    else setUserId(null)
  }, [user])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <AuthView />

  const handleSelectResult = (result) => {
    setSelectedResult(result)
    setView('detail')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>SupplyChain AI</h2>
          <p>{user.displayName || user.email}</p>
        </div>

        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => { setView(n.id); if (n.id !== 'detail') setSelectedResult(null) }}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, wordBreak: 'break-all' }}>
            {user.email}
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'dashboard' && <Dashboard onSelectResult={handleSelectResult} />}
        {view === 'detail' && (
          <DetailView
            result={selectedResult}
            onBack={selectedResult ? () => { setView('dashboard'); setSelectedResult(null) } : null}
          />
        )}
        {view === 'command' && <CommandView onSelectResult={handleSelectResult} />}
        {view === 'entities' && <EntityManager />}
        {view === 'insights' && <InsightsView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
