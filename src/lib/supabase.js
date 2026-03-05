import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  || ''
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (url && key) ? createClient(url, key) : null
export const hasSupabase = !!(url && key)

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: { hd: 'homzmart.com' },
      redirectTo: window.location.origin,
    },
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
