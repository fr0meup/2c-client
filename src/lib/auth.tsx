import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = '2c_auth'

interface AuthState {
  token: string
  userUuid: string
  secretKey: string
}

interface AuthContextValue {
  auth: AuthState | null
  login: (token: string, userUuid: string, secretKey: string, persist?: boolean) => void
  logout: () => void
}

function loadAuth(): AuthState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.token && parsed.userUuid && parsed.secretKey) return parsed
  } catch { /* ignore */ }
  return null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth)

  const login = useCallback((token: string, userUuid: string, secretKey: string, persist = false) => {
    const state = { token, userUuid, secretKey }
    if (persist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
    setAuth(state)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
