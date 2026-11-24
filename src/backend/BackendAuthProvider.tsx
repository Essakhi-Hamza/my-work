import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthStatus, type AuthContextValue } from './authContext'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'

export function BackendAuthProvider({ children }: PropsWithChildren) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'preview')
  const [error, setError] = useState('')
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!configured) return

    let active = true
    let unsubscribe: (() => void) | null = null
    void (async () => {
      try {
        const client = await getSupabaseClient()
        if (!active) return
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
          if (!active) return
          setSession(nextSession)
          setAgencyId(null)
          setError('')
          setStatus(nextSession ? 'checkingAgency' : 'signedOut')
        })
        unsubscribe = () => subscription.unsubscribe()

        const { data, error: sessionError } = await client.auth.getSession()
        if (!active) return
        if (sessionError) {
          setError(sessionError.message)
          setStatus('error')
          return
        }
        setSession(data.session)
        setStatus(data.session ? 'checkingAgency' : 'signedOut')
      } catch (cause) {
        if (!active) return
        setError(getErrorMessage(cause))
        setStatus('error')
      }
    })()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [configured, retryCount])

  const userId = session?.user.id
  useEffect(() => {
    if (!configured || !userId) return
    let active = true

    void (async () => {
      try {
        const client = await getSupabaseClient()
        const { data, error: membershipError } = await client
          .from('agency_memberships')
          .select('agency_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        if (!active) return
        if (membershipError) {
          setError(membershipError.message)
          setStatus('error')
          return
        }
        const membership = data as { agency_id: string } | null
        setAgencyId(membership?.agency_id ?? null)
        setStatus(membership ? 'ready' : 'needsAgency')
      } catch (cause) {
        if (!active) return
        setError(getErrorMessage(cause))
        setStatus('error')
      }
    })()

    return () => {
      active = false
    }
  }, [configured, userId])

  const value = useMemo<AuthContextValue>(() => ({
    status,
    email: session?.user.email ?? '',
    error,
    agencyId,
    clearError: () => setError(''),
    signIn: async (email, password) => {
      setError('')
      const client = await getSupabaseClient()
      const { error: signInError } = await client.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    },
    signUp: async (name, email, password) => {
      setError('')
      const client = await getSupabaseClient()
      const { data, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (signUpError) throw signUpError
      return data.session !== null
    },
    requestPasswordReset: async (email) => {
      setError('')
      const client = await getSupabaseClient()
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (resetError) throw resetError
    },
    createAgency: async (name) => {
      setError('')
      if (!session?.user.id) throw new Error('Sign in before creating an agency.')
      const client = await getSupabaseClient()
      const { data, error: agencyError } = await client.rpc('create_agency', { p_name: name.trim() })
      if (agencyError) throw agencyError
      if (!data) throw new Error('The agency was created without returning an agency ID.')
      setAgencyId(data)
      setStatus('ready')
    },
    signOut: async () => {
      const client = await getSupabaseClient()
      const { error: signOutError } = await client.auth.signOut()
      if (signOutError) {
        setError(signOutError.message)
        setStatus('error')
      }
    },
    retry: () => {
      setError('')
      setStatus('loading')
      setRetryCount((current) => current + 1)
    },
  }), [agencyId, error, session, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
