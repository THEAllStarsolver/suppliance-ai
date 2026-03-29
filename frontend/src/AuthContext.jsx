import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Try Firebase auth; if config is demo, fall back to local mock user
    let unsubscribe
    try {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }, () => {
        // Firebase not configured — use demo mode
        setUser(_demoUser())
        setLoading(false)
      })
    } catch {
      setUser(_demoUser())
      setLoading(false)
    }
    return () => unsubscribe?.()
  }, [])

  const login = async (email, password, companyName) => {
    setAuthError(null)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return cred.user
    } catch (e) {
      if (e.code === 'auth/invalid-api-key' || e.code === 'auth/configuration-not-found') {
        // Demo mode fallback
        const mock = { ..._demoUser(), email, displayName: companyName || email.split('@')[0] }
        setUser(mock)
        return mock
      }
      setAuthError(e.message)
      throw e
    }
  }

  const register = async (email, password, companyName) => {
    setAuthError(null)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: companyName })
      return cred.user
    } catch (e) {
      if (e.code === 'auth/invalid-api-key' || e.code === 'auth/configuration-not-found') {
        const mock = { ..._demoUser(), email, displayName: companyName }
        setUser(mock)
        return mock
      }
      setAuthError(e.message)
      throw e
    }
  }

  const logout = async () => {
    try { await signOut(auth) } catch {}
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

function _demoUser() {
  return { uid: 'demo-user-001', email: 'demo@supplychain.ai', displayName: 'Demo Logistics Co.' }
}
