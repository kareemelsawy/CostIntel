// ─── Theme system (mirroring Pulse v7) ───────────────────────────────────────
export const DARK_THEME = {
  bg: '#0D0F14', surface: '#141720', surfaceHover: '#1C2030', border: '#252A3A',
  accent: '#4F8EF7', accentDim: '#2A3F6F', green: '#22C55E', amber: '#F59E0B',
  red: '#EF4444', purple: '#A78BFA', teal: '#14B8A6', orange: '#F97316',
  text: '#E2E8F0', textMuted: '#64748B', textDim: '#94A3B8',
  inputBg: '#0D0F14', shadow: 'rgba(0,0,0,0.5)', cardShadow: '0 8px 32px rgba(0,0,0,0.3)',
}

export const LIGHT_THEME = {
  bg: '#F1F5F9', surface: '#FFFFFF', surfaceHover: '#F8FAFC', border: '#E2E8F0',
  accent: '#3B82F6', accentDim: '#DBEAFE', green: '#16A34A', amber: '#D97706',
  red: '#DC2626', purple: '#7C3AED', teal: '#0D9488', orange: '#EA580C',
  text: '#0F172A', textMuted: '#64748B', textDim: '#334155',
  inputBg: '#F8FAFC', shadow: 'rgba(0,0,0,0.08)', cardShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

export let COLORS = { ...DARK_THEME }
export function setThemeColors(isDark) {
  const t = isDark ? DARK_THEME : LIGHT_THEME
  Object.keys(t).forEach(k => { COLORS[k] = t[k] })
}

export const CATEGORIES = [
  'Wardrobes','Tv Unit','Dressings','Shoe Racks','Commodes','Buffet',
  'Display Unit','Unit Drawers','Kitchen Storage Units','Bathroom Storage Units',
  'File Cabinets & Bookcases','Office Wardrobes','Coffee Corners','Other',
]

export const DOOR_TYPES = ['Hinged', 'Sliding', 'Open']
