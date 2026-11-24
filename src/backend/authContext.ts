import { createContext, useContext } from 'react'

export type AuthStatus = 'preview' | 'loading' | 'signedOut' | 'checkingAgency' | 'needsAgency' | 'ready' | 'error'

export type AuthContextValue = {
  status: AuthStatus
  email: string
  error: string
  agencyId: string | null
  clearError: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  requestPasswordReset: (email: string) => Promise<void>
  createAgency: (name: string) => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useBackendAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useBackendAuth must be used inside BackendAuthProvider')
  return context
}
