import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { registerUnauthorizedHandler, tokenStorage } from '../api/client'
import type { AuthResponse, Role } from '../api/types'

interface AuthUser {
  userId: number
  name: string
  email: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  setSession: (auth: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const USER_STORAGE_KEY = 'seatsync.user'

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())

  const logout = useCallback(() => {
    tokenStorage.clear()
    localStorage.removeItem(USER_STORAGE_KEY)
    setUser(null)
  }, [])

  const setSession = useCallback((auth: AuthResponse) => {
    tokenStorage.set(auth.token)
    const authUser: AuthUser = { userId: auth.userId, name: auth.name, email: auth.email, role: auth.role }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  useMemo(() => {
    registerUnauthorizedHandler(() => {
      tokenStorage.clear()
      localStorage.removeItem(USER_STORAGE_KEY)
      setUser(null)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, setSession, logout }),
    [user, setSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
