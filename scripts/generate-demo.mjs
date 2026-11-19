import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const demoDirectory = fileURLToPath(new URL('../public/demo/', import.meta.url))
const tileDirectory = resolve(demoDirectory, 'months')
const months = ['2026-08', '2026-09', '2026-10', '2026-11']
const degrees = Math.PI / 180

// Authored study footprint used only for the simulated monthly grid.
const studyArea = [
  [98.81, 30.37], [99.07, 31.26], [99.51, 31.76], [99.4, 32.28],
  [100.58, 32.33], [101.03, 33.15], [101.62, 33.42], [102.67, 33.18],
  [103.41, 33.74], [104.37, 33.63], [104.79, 32.88], [105.72, 33.12],
  [106.36, 32.46], [107.08, 32.66], [107.55, 31.95], [108.49, 31.81],
  [109.16, 31.32], [109.48, 30.63], [109.05, 29.97], [109.33, 29.31],
  [108.74, 28.53], [107.57, 28.64], [107.3, 27.81], [106.53, 28.03],
  [105.89, 27.47], [105.24, 27.76], [104.84, 27.14], [104.03, 27.03],
  [103.47, 26.38], [102.65, 26.16], [102.17, 26.67], [101.52, 26.38],
  [100.92, 26.78], [100.53, 27.39], [100.76, 28.18], [100.2, 28.56],
  [100.17, 29.23], [99.43, 29.29], [99.16, 29.83], [99.29, 30.04],
]

const outlyingAreas = [
  [98.52, 29.31, 0.33, 0.29],
  [99.63, 28.17, 0.31, 0.37],
  [100.27, 26.57, 0.21, 0.22],
  [101.11, 33.66, 0.19, 0.16],
  [103.71, 25.87, 0.29, 0.18],
  [105.26, 33.49, 0.30, 0.16],
  [108.68, 32.23, 0.22, 0.25],
  [109.55, 28.51, 0.24, 0.28],
]

const emptyAreas = [
  [100.55, 31.25, 0.30, 0.35],
  [102.17, 31.99, 0.29, 0.19],
  [101.86, 27.38, 0.37, 0.20],
  [105.13, 29.54, 0.24, 0.12],
  [108.28, 30.56, 0.20, 0.27],
]

function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i]
    const [bx, by] = ring[j]
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) {
      inside = !inside
    }
  }
  return inside
}

function ellipseDistance(x, y, [centerX, centerY, radiusX, radiusY]) {
  return ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2
}

function between(a, b, fraction) {
  return a + (b - a) * fraction
}

function noiseSample(x, y, seed) {
  let hash = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ seed
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d)
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b)
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff
}

function smoothNoise(x, y, seed) {
  const col = Math.floor(x)
  const row = Math.floor(y)
  const dx = x - col
  const dy = y - row
  const sx = dx * dx * (3 - 2 * dx)
  const sy = dy * dy * (3 - 2 * dy)
  return between(
    between(noiseSample(col, row, seed), noiseSample(col + 1, row, seed), sx),
    between(noiseSample(col, row + 1, seed), noiseSample(col + 1, row + 1, seed), sx),
    sy,
  )
}

function inStudyArea(lon, lat) {
  const x = lon + 0.45 * (smoothNoise(lon * 1.9, lat * 1.9, 23) - 0.5)
  const y = lat + 0.38 * (smoothNoise(lon * 2.1, lat * 2.1, 71) - 0.5)
  return (inRing(x, y, studyArea) || outlyingAreas.some(area => ellipseDistance(x, y, area) < 1)) &&
    !emptyAreas.some(area => ellipseDistance(x, y, area) < 1)
}

function feature(geometry, properties, id) {
  return id === undefined
    ? { type: 'Feature', properties, geometry }
    : { type: 'Feature', id, properties, geometry }
}

function demoCells() {
  const cells = []
  const earthRadiusKm = 6371.0088
  // A 0.11° × 0.095° cell is approximately square near 30° north in Web Mercator.
  const westOrigin = 98100
  const southOrigin = 25650
  const lonStep = 110
  const latStep = 95
  for (let row = 0; row < 89; row += 1) {
    const south = (southOrigin + row * latStep) / 1000
    const north = (southOrigin + (row + 1) * latStep) / 1000
    const centerY = (south + north) / 2
    const areaKm2 = Math.round(earthRadiusKm ** 2 * (lonStep / 1000) * degrees *
      (Math.sin(north * degrees) - Math.sin(south * degrees)) * 100) / 100
    for (let col = 0; col < 108; col += 1) {
      const west = (westOrigin + col * lonStep) / 1000
      const east = (westOrigin + (col + 1) * lonStep) / 1000
      const centerX = (west + east) / 2
      if (!inStudyArea(centerX, centerY)) continue
      const id = `SW-${String(row + 1).padStart(2, '0')}-${String(col + 1).padStart(3, '0')}`
      const geometry = { type: 'Polygon', coordinates: [
        [[west, south], [east, south], [east, north], [west, north], [west, south]],
      ] }
      cells.push({ id, geometry, areaKm2, centerX, centerY })
    }
  }
  return cells
}

function demoStatus(lon, lat, issue) {
  const hotspots = [
    [100.47 + issue * 0.21, 31.63 - issue * 0.09, 0.84, 0.48, 0.69 - issue * 0.035],
    [102.21 - issue * 0.09, 28.31 + issue * 0.13, 0.69, 0.57, 0.51 + issue * 0.023],
    [103.63 + issue * 0.12, 32.54 - issue * 0.04, 0.62, 0.51, 0.57 - issue * 0.011],
    [105.66 + issue * 0.14, 30.22 + issue * 0.08, 0.89, 0.55, 0.59 + issue * 0.038],
    [107.72 - issue * 0.11, 29.11 + issue * 0.18, 0.82, 0.55, 0.47 + issue * 0.035],
    [106.75 + issue * 0.05, 31.88 - issue * 0.08, 0.47, 0.53, 0.44 + issue * 0.017],
    [104.92 - issue * 0.16, 27.88 + issue * 0.09, 0.67, 0.48, 0.62 - issue * 0.038],
    [103.14 + issue * 0.08, 30.46 - issue * 0.15, 0.42, 0.69, 0.43 + issue * 0.027],
    [108.72 - issue * 0.08, 31.49 - issue * 0.07, 0.54, 0.57, 0.51 + issue * 0.022],
  ]
  const quality = smoothNoise(lon * 2.35 + issue * 0.22, lat * 2.82 - issue * 0.11, 1953)
  const localQuality = smoothNoise(lon * 8.6, lat * 8.6, 52)
  if (quality + localQuality * 0.22 > 1.005) return { category: 'unknown', value: null }

  let risk = 0.23
  for (const hotspot of hotspots) {
    risk += hotspot[4] * Math.exp(-ellipseDistance(lon, lat, hotspot))
  }
  risk += 0.31 * (smoothNoise(lon * 2.5 + issue * 0.15, lat * 2.65, 621) - 0.5)
  risk += 0.16 * (smoothNoise(lon * 8.3, lat * 8.3 + issue * 0.32, 413) - 0.5)
  const value = Math.max(0, Math.min(100, Math.round(1000 * risk) / 10))
  const category = value >= 69 ? 'change' : (value >= 46 ? 'attention' : 'stable')
  return { category, value }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`)
}

function writeMonthlyData() {
  mkdirSync(tileDirectory, { recursive: true })
  const cells = demoCells()
  const extents = cells.map(({ geometry }) => geometry.coordinates[0])
  const bbox = [
    Math.min(...extents.map(ring => ring[0][0])),
    Math.min(...extents.map(ring => ring[0][1])),
    Math.max(...extents.map(ring => ring[2][0])),
    Math.max(...extents.map(ring => ring[2][1])),
  ]
  for (const [issue, month] of months.entries()) {
    const features = cells.map(({ id, geometry, areaKm2, centerX, centerY }) =>
      feature(geometry, { id, areaKm2, ...demoStatus(centerX, centerY, issue) }, id))
    writeJson(resolve(tileDirectory, `${month}.geojson`), {
      type: 'FeatureCollection', month, demo: true, bbox, features,
    })
  }
  writeJson(resolve(demoDirectory, 'catalog.json'), {
    demo: true,
    months: months.toReversed().map(month => ({
      month, count: cells.length, url: `demo/months/${month}.geojson`,
    })),
  })
  console.log(`Wrote ${months.length} months with ${cells.length} cells each.`)
}

const referenceBounds = [86, 17, 121, 43]

function inBounds([x, y], [west, south, east, north]) {
  return x >= west && x <= east && y >= south && y <= north
}

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

function roundPoint([x, y]) {
  return [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]
}

function areaOfRing(ring) {
  let doubledArea = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    doubledArea += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return doubledArea / 2
}

function deduplicate(path) {
  return path.filter((point, i) => i === 0 || !samePoint(point, path[i - 1]))
}

function simplify(path, tolerance) {
  if (path.length <= 2) return path
  const start = path[0]
  const end = path.at(-1)
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = dx * dx + dy * dy
  let maxDistance = tolerance * tolerance
  let split = 0
  for (let i = 1; i < path.length - 1; i += 1) {
    const [x, y] = path[i]
    const fraction = length === 0 ? 0 : Math.max(0, Math.min(1,
      ((x - start[0]) * dx + (y - start[1]) * dy) / length))
    const distance = (x - between(start[0], end[0], fraction)) ** 2 +
      (y - between(start[1], end[1], fraction)) ** 2
    if (distance > maxDistance) {
      maxDistance = distance
      split = i
    }
  }
  if (split === 0) return [start, end]
  return [...simplify(path.slice(0, split + 1), tolerance).slice(0, -1),
    ...simplify(path.slice(split), tolerance)]
}

function clipSegment(a, b, extent) {
  let enter = 0
  let exit = 1
  for (let axis = 0; axis < 2; axis += 1) {
    const delta = b[axis] - a[axis]
    if (delta === 0) {
      if (a[axis] < extent[axis] || a[axis] > extent[axis + 2]) return null
      continue
    }
    const first = (extent[axis] - a[axis]) / delta
    const second = (extent[axis + 2] - a[axis]) / delta
    enter = Math.max(enter, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (enter >= exit) return null
  }
  return [enter === 0 ? a : [between(a[0], b[0], enter), between(a[1], b[1], enter)],
    exit === 1 ? b : [between(a[0], b[0], exit), between(a[1], b[1], exit)]]
}

function clipLine(path, extent, tolerance) {
  const lines = []
  let current = []
  for (let i = 1; i < path.length; i += 1) {
    const clipped = clipSegment(path[i - 1], path[i], extent)
    if (!clipped || (current.length && !samePoint(current.at(-1), clipped[0]))) {
      if (current.length) lines.push(current)
      current = []
    }
    if (!clipped) continue
    if (current.length === 0) current.push(clipped[0])
    current.push(clipped[1])
  }
  if (current.length) lines.push(current)
  return lines.map(line => deduplicate(simplify(line, tolerance).map(roundPoint)))
    .filter(line => line.length >= 2)
}

function clipRing(ring, extent) {
  // Clip against each of the four sides in turn.
  let points = ring.slice(0, -1)
  for (let side = 0; side < 4 && points.length; side += 1) {
    const axis = side % 2
    const bound = extent[side]
    const input = points
    points = []
    const contains = point => side < 2 ? point[axis] >= bound : point[axis] <= bound
    for (let i = 0, j = input.length - 1; i < input.length; j = i++) {
      const previous = input[j]
      const next = input[i]
      if (contains(previous) !== contains(next)) {
        const fraction = (bound - previous[axis]) / (next[axis] - previous[axis])
        points.push(axis === 0
          ? [bound, between(previous[1], next[1], fraction)]
          : [between(previous[0], next[0], fraction), bound])
      }
      if (contains(next)) points.push(next)
    }
  }
  if (points.length < 3) return []
  return [...points, points[0]]
}

function clipGeometry(geometry, tolerance, extent = referenceBounds) {
  if (!geometry) return null
  const { type, coordinates } = geometry
  if (type === 'LineString' || type === 'MultiLineString') {
    const paths = type === 'LineString' ? [coordinates] : coordinates
    const lines = paths.flatMap(path => clipLine(path, extent, tolerance))
    return lines.length ? { type: 'MultiLineString', coordinates: lines } : null
  }
  const polygons = type === 'Polygon' ? [coordinates] : coordinates
  const clipped = []
  for (const polygon of polygons) {
    const rings = polygon.map((ring, index) => {
      const boundary = clipRing(ring, extent)
      const reduced = deduplicate(simplify(boundary, tolerance).map(roundPoint))
      if (reduced.length < 4 || Math.abs(areaOfRing(reduced)) < 0.00001) return null
      return (areaOfRing(reduced) >= 0) === (index === 0) ? reduced : reduced.reverse()
    })
    if (rings[0]) clipped.push(rings.filter(Boolean))
  }
  return clipped.length ? { type: 'MultiPolygon', coordinates: clipped } : null
}

const localCities = new Set([
  'Ankang', 'Anshun', 'Deyang', 'Fengjie', 'Guangyuan', 'Hanzhong', 'Leshan', 'Liupanshui',
  'Lijiang', 'Luzhou', 'Mianyang', 'Nanchong', 'Neijiang', 'Panzhihua', 'Wanzhou', 'Xichang',
  'Yaan', 'Yibin', 'Zhaotang', 'Zunyi', 'Jyekundo', 'Chamdo', 'Tongren', 'Darzêdo',
])

const majorCities = new Set([
  'Chengdu', 'Chongqing', 'Guiyang', 'Kunming', 'Lanzhou', 'Lhasa', 'Xian', 'Xining',
])

const regionalLabels = [
  ['四川省', 101.3, 30.72, 'region', 0], ['云南省', 100.7, 24.48, 'region', 0],
  ['贵州省', 107.34, 26.94, 'region', 0], ['青海省', 96.2, 35.65, 'region', 1],
  ['甘肃省', 102.42, 36.35, 'region', 1], ['陕西省', 109.57, 35.94, 'region', 1],
  ['湖北省', 112.36, 31.41, 'region', 1], ['湖南省', 111.74, 27.40, 'region', 1],
  ['广西壮族自治区', 108.54, 23.83, 'region', 1], ['西藏自治区', 90.92, 32.30, 'region', 1],
  ['四川盆地', 105.18, 30.94, 'terrain', 2], ['横断山脉', 99.14, 29.15, 'terrain', 2],
  ['秦岭', 107.89, 33.78, 'terrain', 1], ['大巴山', 108.04, 32.25, 'terrain', 2],
  ['云贵高原', 104.65, 25.49, 'terrain', 1], ['青藏高原', 94.51, 33.25, 'terrain', 1],
  ['金沙江', 101.72, 26.29, 'water', 3], ['长江', 108.82, 30.96, 'water', 2],
  ['乌江', 107.79, 28.64, 'water', 3], ['嘉陵江', 106.05, 31.17, 'water', 3],
  ['青海湖', 100.23, 36.91, 'water', 2], ['洞庭湖', 112.88, 29.24, 'water', 2],
]

function naturalEarth(directory, layer) {
  return JSON.parse(readFileSync(resolve(directory, `${layer}.geojson`), 'utf8')).features
}

function baseGeography(directory) {
  const features = []
  const layers = [
    ['ne_50m_land', 'land', 0.012, () => ({ tone: 0 })],
    ['ne_10m_admin_1_states_provinces_lines', 'boundary', 0.007, p => p.ADM0_A3 === 'CHN' &&
      p.NAME_L && p.NAME_R && { rank: 1 }],
    ['ne_10m_rivers_lake_centerlines', 'river', 0.006, p => p.featurecla !== 'Lake Centerline' &&
      { rank: p.scalerank <= 2 ? 0 : (p.scalerank <= 6 ? 1 : 3) }],
    ['ne_10m_lakes', 'lake', 0.003, p => ({ rank: p.scalerank <= 5 ? 1 : 2,
      ...(p.name_zh && { name: p.name_zh }) })],
  ]
  for (const [layer, kind, tolerance, propertiesFor] of layers) {
    for (const input of naturalEarth(directory, layer)) {
      const properties = propertiesFor(input.properties)
      if (!properties) continue
      const geometry = clipGeometry(input.geometry, tolerance)
      if (geometry) features.push(feature(geometry, { kind, ...properties }))
    }
  }

  const roadLines = [[], [], []]
  for (const input of naturalEarth(directory, 'ne_10m_roads')) {
    const { type, scalerank } = input.properties
    if (type !== 'Major Highway' || scalerank > 5) continue
    const geometry = clipGeometry(input.geometry, 0.006)
    if (geometry) roadLines[Math.max(0, scalerank - 3)].push(...geometry.coordinates)
  }
  for (const [index, coordinates] of roadLines.entries()) {
    if (coordinates.length) {
      features.push(feature({ type: 'MultiLineString', coordinates }, { kind: 'road', rank: index + 1 }))
    }
  }

  for (const input of naturalEarth(directory, 'ne_10m_populated_places')) {
    const { NAMEASCII, NAME_ZH, SCALERANK, POP_MAX } = input.properties
    const { coordinates } = input.geometry
    if (!NAME_ZH || !inBounds(coordinates, referenceBounds)) continue
    const major = majorCities.has(NAMEASCII)
    const local = localCities.has(NAMEASCII)
    if (!major && !local && (SCALERANK > 3 || POP_MAX < 200000)) continue
    features.push(feature({ type: 'Point', coordinates: roundPoint(coordinates) }, {
      kind: 'label', labelType: 'city', name: NAME_ZH, rank: major ? 0 : (local ? 3 : 2),
    }))
  }
  for (const [name, x, y, labelType, rank] of regionalLabels) {
    features.push(feature({ type: 'Point', coordinates: [x, y] }, { kind: 'label', labelType, name, rank }))
  }
  return features
}

const terrainZoom = 5
const tileSize = 256
const worldPixels = tileSize * 2 ** terrainZoom

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft
  const dl = Math.abs(prediction - left)
  const da = Math.abs(prediction - above)
  const du = Math.abs(prediction - upperLeft)
  return dl <= da && dl <= du ? left : (da <= du ? above : upperLeft)
}

function readTerrainTile(path) {
  // The three Terrarium PNG channels encode one elevation sample per pixel.
  const png = readFileSync(path)
  if (png.readUInt32BE(16) !== tileSize || png.readUInt32BE(20) !== tileSize ||
      png[24] !== 8 || png[25] !== 2 || png[28] !== 0) {
    throw new Error(`Expected a ${tileSize} px RGB Terrarium tile at ${path}`)
  }
  const chunks = []
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset)
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(png.subarray(offset + 8, offset + 8 + length))
    }
    offset += length + 12
  }
  const encoded = inflateSync(Buffer.concat(chunks))
  const pixels = new Float32Array(tileSize ** 2)
  const stride = tileSize * 3
  let previous = new Uint8Array(stride)
  for (let y = 0; y < tileSize; y += 1) {
    const offset = y * (stride + 1)
    const filter = encoded[offset]
    const row = new Uint8Array(stride)
    for (let i = 0; i < stride; i += 1) {
      const left = i >= 3 ? row[i - 3] : 0
      const above = previous[i]
      const upperLeft = i >= 3 ? previous[i - 3] : 0
      const predictor = [0, left, above, (left + above) >>> 1, paeth(left, above, upperLeft)][filter]
      row[i] = encoded[offset + i + 1] + predictor
    }
    for (let x = 0, i = 0; x < tileSize; x += 1, i += 3) {
      pixels[y * tileSize + x] = 256 * row[i] + row[i + 1] + row[i + 2] / 256 - 32768
    }
    previous = row
  }
  return pixels
}

function terrainGrid(directory) {
  const tiles = new Map()
  function pixel(x, y) {
    const tileX = Math.floor(x / tileSize)
    const tileY = Math.floor(y / tileSize)
    const key = `${tileX}-${tileY}`
    if (!tiles.has(key)) {
      tiles.set(key, readTerrainTile(resolve(directory, `terrain-${terrainZoom}-${key}.png`)))
    }
    return tiles.get(key)[(y % tileSize) * tileSize + (x % tileSize)]
  }
  function elevation(lon, lat) {
    const x = (lon + 180) / 360 * worldPixels - 0.5
    const y = 0.5 * (1 - Math.asinh(Math.tan(lat * degrees)) / Math.PI) * worldPixels - 0.5
    const col = Math.floor(x)
    const row = Math.floor(y)
    return between(between(pixel(col, row), pixel(col + 1, row), x - col),
      between(pixel(col, row + 1), pixel(col + 1, row + 1), x - col), y - row)
  }

  const [west, south, east, north] = referenceBounds
  const spacing = 0.105
  const width = Math.ceil((east - west) / spacing) + 3
  const height = Math.ceil((north - south) / spacing) + 3
  const coordinate = (x, y) => [west + (x - 1) * (east - west) / (width - 3),
    south + (y - 1) * (north - south) / (height - 3)]
  const values = new Float32Array(width * height).fill(-32000)
  const step = spacing / 2
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const [lon, lat] = coordinate(x, y)
      values[y * width + x] = (4 * elevation(lon, lat) + elevation(lon + step, lat) +
        elevation(lon - step, lat) + elevation(lon, lat + step) + elevation(lon, lat - step)) / 8
    }
  }
  return { width, height, coordinate, values }
}

function contourRings({ width, height, coordinate, values }, level) {
  const vertices = new Map()
  // Marching squares: vertices are keyed by a grid edge shared by adjacent squares.
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const i = y * width + x
      const heights = [values[i], values[i + 1], values[i + width + 1], values[i + width]]
      const high = heights.map(value => value >= level)
      if (high.every(value => value === high[0])) continue

      const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
      const keys = [2 * i, 2 * (i + 1) + 1, 2 * (i + width), 2 * i + 1]
      const crossings = []
      for (let edge = 0; edge < 4; edge += 1) {
        const other = (edge + 1) % 4
        if (high[edge] === high[other]) continue
        crossings.push(keys[edge])
        if (vertices.has(keys[edge])) continue
        const fraction = (level - heights[edge]) / (heights[other] - heights[edge])
        const [a, b] = [corners[edge], corners[other]]
        vertices.set(keys[edge], {
          point: coordinate(between(a[0], b[0], fraction), between(a[1], b[1], fraction)),
          adjacent: [],
        })
      }

      const middleIsHigh = heights.reduce((sum, value) => sum + value, 0) >= level * 4
      const pairs = crossings.length === 2
        ? [crossings]
        : (middleIsHigh === high[0] ? [[keys[0], keys[1]], [keys[2], keys[3]]]
          : [[keys[3], keys[0]], [keys[1], keys[2]]])
      for (const [a, b] of pairs) {
        vertices.get(a).adjacent.push(b)
        vertices.get(b).adjacent.push(a)
      }
    }
  }

  const visited = new Set()
  const rings = []
  for (const [start] of vertices) {
    if (visited.has(start)) continue
    const ring = []
    let current = start
    while (!visited.has(current)) {
      const { point, adjacent } = vertices.get(current)
      ring.push(point)
      visited.add(current)
      current = adjacent.find(key => !visited.has(key))
      if (current === undefined) break
    }
    if (ring.length >= 3 && Math.abs(areaOfRing(ring)) >= 0.02) rings.push([...ring, ring[0]])
  }
  return rings
}

function terrainPolygons(rings) {
  const contours = rings.map(ring => simplify(clipRing(ring, referenceBounds), 0.009))
    .map(ring => deduplicate(ring.map(roundPoint)))
    .filter(ring => ring.length >= 4)
    .map(ring => ({ ring, area: areaOfRing(ring), depth: 0, polygon: null }))
    .sort((a, b) => Math.abs(b.area) - Math.abs(a.area))
  const polygons = []
  for (const [i, contour] of contours.entries()) {
    if (Math.abs(contour.area) < 0.00001) continue
    const [x, y] = contour.ring[0]
    const parent = contours.slice(0, i).findLast(other => other.polygon && inRing(x, y, other.ring))
    contour.depth = parent ? parent.depth + 1 : 0
    const isOuter = contour.depth % 2 === 0
    const ring = (contour.area > 0) === isOuter ? contour.ring : contour.ring.toReversed()
    if (isOuter) {
      contour.polygon = [ring]
      polygons.push(contour.polygon)
    } else {
      contour.polygon = parent.polygon
      parent.polygon.push(ring)
    }
  }
  return polygons
}

function referenceTerrain(directory) {
  const grid = terrainGrid(directory)
  const levels = [350, 750, 1350, 2200, 3500]
  const features = []
  const contourExtent = referenceBounds.map((edge, i) => edge + (i < 2 ? 0.045 : -0.045))
  for (const [index, level] of levels.entries()) {
    const rings = contourRings(grid, level + 0.5)
    const coordinates = terrainPolygons(rings)
    features.push(feature({ type: 'MultiPolygon', coordinates }, { kind: 'land', tone: index + 1 }))
    if (index === 0) continue
    const lines = rings.flatMap(ring => clipLine(ring, contourExtent, 0.012))
    features.push(feature({ type: 'MultiLineString', coordinates: lines }, {
      kind: 'contour', elevation: level, rank: index >= 3 ? 1 : 3,
    }))
  }
  return features
}

function writeReferenceData(directory) {
  const geography = baseGeography(directory)
  const terrain = referenceTerrain(directory)
  const firstOverlay = geography.findIndex(input => input.properties.kind !== 'land')
  const features = [...geography.slice(0, firstOverlay), ...terrain, ...geography.slice(firstOverlay)]
  writeJson(resolve(demoDirectory, 'reference.geojson'), {
    type: 'FeatureCollection', bbox: referenceBounds, demo: true, features,
    attribution: 'Made with Natural Earth. Terrain: Mapzen Terrain Tiles, USGS GMTED2010, NOAA ETOPO1.',
  })
  console.log(`Wrote the reference map with ${features.length} features.`)
}

const [, , referenceDirectory, ...extra] = process.argv
if (extra.length) throw new Error('Usage: node scripts/generate-demo.mjs [reference-source-directory]')
writeMonthlyData()
if (referenceDirectory) writeReferenceData(resolve(referenceDirectory))
