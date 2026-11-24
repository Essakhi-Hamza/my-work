import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
let client: Promise<SupabaseClient> | null = null

export function isSupabaseConfigured() {
  const isLocalUrl = supabaseUrl.startsWith('http://localhost') || supabaseUrl.startsWith('http://127.0.0.1')
  const isRemoteUrl = supabaseUrl.startsWith('https://')
  return Boolean(
    (isLocalUrl || isRemoteUrl) &&
    supabasePublishableKey &&
    !supabaseUrl.includes('YOUR_PROJECT') &&
    !supabasePublishableKey.includes('YOUR_SUPABASE'),
  )
}

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the local environment.')
  }
  if (!client) {
    client = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }),
    ).catch((error: unknown) => {
      client = null
      throw error
    })
  }
  return client
}
