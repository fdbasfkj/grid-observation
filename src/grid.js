export const categories = [
  { key: '1', label: '低风险', color: '#dec453' },
  { key: '2', label: '中风险', color: '#24a0aa' },
  { key: '3', label: '高风险', color: '#cf644c' },
  { key: 'unknown', label: '未分类', color: '#9da9ac' },
]

const byKey = new Map(categories.map((category) => [category.key, category]))
export const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

export function categoryFor(properties) {
  const rank = properties?.R_rank
  if (typeof rank !== 'number' && typeof rank !== 'string') return byKey.get('unknown')
  const key = String(rank).trim().replace(/\.0+$/, '')
  return byKey.get(key) ?? byKey.get('unknown')
}

export function monthLabel(month) {
  if (!month) return '选择月份'
  const [year, monthNumber] = month.split('-')
  return `${year} 年 ${Number(monthNumber)} 月`
}

export function formatCoordinates(coordinates) {
  if (!coordinates) return '—'
  const [longitude, latitude] = coordinates
  const lon = `${Math.abs(longitude).toFixed(5)}° ${longitude < 0 ? 'W' : 'E'}`
  const lat = `${Math.abs(latitude).toFixed(5)}° ${latitude < 0 ? 'S' : 'N'}`
  return `${lon} · ${lat}`
}
