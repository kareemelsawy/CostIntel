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

// ─── SKU persistence ──────────────────────────────────────────────────────────
// Strip internal-only fields before sending to DB
function skuForDb(sku) {
  const { _isNew, ...rest } = sku
  return rest
}

export async function dbUpsertSKU(sku) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('skus').upsert(skuForDb(sku), { onConflict: 'sku_code' })
  return { error }
}

export async function dbUpsertSKUs(skus) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('skus').upsert(skus.map(skuForDb), { onConflict: 'sku_code' })
  return { error }
}

export async function dbDeleteSKU(sku_code) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('skus').update({ is_active: false }).eq('sku_code', sku_code)
  return { error }
}

// ─── Material / Accessory / Commercial persistence ────────────────────────────
export async function dbUpsertMaterial(mat) {
  if (!supabase) return { error: 'No DB' }
  const { _isNew, ...rest } = mat
  const { error } = await supabase.from('materials').upsert(rest, { onConflict: 'material_id' })
  return { error }
}

export async function dbDeleteMaterial(material_id) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('materials').update({ is_active: false }).eq('material_id', material_id)
  return { error }
}

export async function dbUpdateMaterialPrice(material_id, price, price_good) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('materials').update({ price, price_good }).eq('material_id', material_id)
  return { error }
}

export async function dbUpsertAccessory(acc) {
  if (!supabase) return { error: 'No DB' }
  const { _isNew, ...rest } = acc
  const { error } = await supabase.from('accessories').upsert(rest, { onConflict: 'acc_id' })
  return { error }
}

export async function dbDeleteAccessory(acc_id) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('accessories').update({ is_active: false }).eq('acc_id', acc_id)
  return { error }
}

export async function dbUpdateAccessoryPrice(acc_id, price, price_good) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('accessories').update({ price, price_good }).eq('acc_id', acc_id)
  return { error }
}

export async function dbUpdateCommercial(key, value) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('commercial_settings').update({ value }).eq('key', key)
  return { error }
}

// ─── Engine overrides persistence ─────────────────────────────────────────────
export async function dbLoadEngineOverrides() {
  if (!supabase) return { data: null, error: null }
  const { data, error } = await supabase.from('engine_overrides').select('*').order('created_at', { ascending: true })
  return { data, error }
}

export async function dbUpsertEngineOverride(override) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('engine_overrides').upsert(override, { onConflict: 'override_key' })
  return { error }
}

export async function dbDeleteEngineOverride(override_key) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('engine_overrides').delete().eq('override_key', override_key)
  return { error }
}
