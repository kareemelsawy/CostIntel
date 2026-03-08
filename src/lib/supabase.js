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
// Explicit whitelist of DB columns — any extra fields on the SKU object (has_sliding_system, _isNew, etc.)
// will cause Supabase PostgREST to reject the entire upsert with a 42703 column-not-found error.
const SKU_DB_COLUMNS = [
  'sku_code','name','image_link','seller','sub_category','commercial_material',
  'width_cm','depth_cm','height_cm','door_type','doors_count','drawers_count',
  'shelves_count','spaces_count','hangers_count','internal_division','unit_type',
  'has_mirror','mirror_count','primary_color','handle_type','has_back_panel',
  'body_material_id','back_material_id','door_material_id','selling_price',
]
function skuForDb(sku) {
  const out = {}
  SKU_DB_COLUMNS.forEach(col => { if (sku[col] !== undefined) out[col] = sku[col] })
  return out
}

export async function dbUpsertSKU(sku) {
  if (!supabase) return { error: 'No DB' }
  const payload = skuForDb(sku)
  const { error } = await supabase.from('skus').upsert(payload, { onConflict: 'sku_code' })
  if (error) console.error('[dbUpsertSKU]', error.code, error.message, payload)
  return { error }
}

export async function dbUpsertSKUs(skus) {
  if (!supabase) return { error: 'No DB' }
  const payload = skus.map(skuForDb)
  const { error } = await supabase.from('skus').upsert(payload, { onConflict: 'sku_code' })
  if (error) console.error('[dbUpsertSKUs]', error.code, error.message, 'first row:', payload[0])
  return { error }
}

export async function dbDeleteSKU(sku_code) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('skus').update({ is_active: false }).eq('sku_code', sku_code)
  return { error }
}

export async function dbClearAllSKUs() {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('skus').update({ is_active: false }).eq('is_active', true)
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

// ─── User profiles ────────────────────────────────────────────────────────────
// profiles table mirrors auth.users — upserted on every login
export async function dbUpsertProfile(user) {
  if (!supabase) return { error: 'No DB' }
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
    avatar_url: user.user_metadata?.avatar_url || '',
    last_seen: new Date().toISOString(),
  }, { onConflict: 'id' })
  return { error }
}

export async function dbLoadProfiles() {
  if (!supabase) return { data: [], error: null }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('last_seen', { ascending: false })
  return { data: data || [], error }
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
