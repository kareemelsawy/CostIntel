export const DARK_THEME = {
  bg:'#0D0F14',surface:'#141720',surfaceHover:'#1C2030',border:'#252A3A',
  accent:'#7C3AED',accentDim:'#2D1B69',green:'#22C55E',amber:'#F59E0B',
  red:'#EF4444',purple:'#A78BFA',teal:'#14B8A6',orange:'#F97316',
  text:'#E2E8F0',textMuted:'#64748B',textDim:'#94A3B8',
  inputBg:'#0D0F14',shadow:'rgba(0,0,0,0.5)',cardShadow:'0 8px 32px rgba(0,0,0,0.3)',
}
export const LIGHT_THEME = {
  bg:'#F1F5F9',surface:'#FFFFFF',surfaceHover:'#F8FAFC',border:'#E2E8F0',
  accent:'#6D28D9',accentDim:'#EDE9FE',green:'#16A34A',amber:'#D97706',
  red:'#DC2626',purple:'#7C3AED',teal:'#0D9488',orange:'#EA580C',
  text:'#0F172A',textMuted:'#64748B',textDim:'#334155',
  inputBg:'#F8FAFC',shadow:'rgba(0,0,0,0.08)',cardShadow:'0 4px 16px rgba(0,0,0,0.08)',
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
export const DOOR_TYPES = ['Hinged','Sliding','Open']
export const HANDLE_TYPES = ['Normal','Handleless']
export const UNIT_TYPES = ['Floor Standing','Wall Mounted']

// CSV columns — matches the Attributes.csv template exactly (no material fields)
export const CSV_COLUMNS = [
  'SKU','Product name','Image Link','Seller Name','Sub Category','Commercial Material',
  'Width (cm)','Depth (cm)','Height (cm)','Door Type','No. of Doors',
  'No. of Drawers','No. of Shelves','No. of Spaces','No. of Hangers',
  'Internal Division','Unit Type','Has Mirror','Mirror Count',
  'Primary Color','Handle Type','Has Back Panel','Selling Price',
]
