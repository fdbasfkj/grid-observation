const publicBase = new URL(import.meta.env.BASE_URL, window.location.href)
const assetUrl = (path) => new URL(path, publicBase)

async function readJson(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export async function getCatalog(signal) {
  if (import.meta.env.DEV) return readJson('/api/months', signal)
  return readJson(assetUrl('data/catalog.json'), signal)
}

export async function getMonthGeoJSON(entry, signal) {
  const data = await readJson(assetUrl(entry.url), signal)
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('地图文件不是有效的 FeatureCollection。')
  }
  return data
}
