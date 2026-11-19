<script setup>
import { onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import Feature from 'ol/Feature.js'
import OlMap from 'ol/Map.js'
import { unByKey } from 'ol/Observable.js'
import View from 'ol/View.js'
import { asArray } from 'ol/color.js'
import ScaleLine from 'ol/control/ScaleLine.js'
import { containsExtent, isEmpty } from 'ol/extent.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import Graticule from 'ol/layer/Graticule.js'
import ImageLayer from 'ol/layer/Image.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { get as getProjection } from 'ol/proj.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import VectorSource from 'ol/source/Vector.js'
import XYZ from 'ol/source/XYZ.js'
import Circle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import Text from 'ol/style/Text.js'
import { createXYZ } from 'ol/tilegrid.js'
import 'ol/ol.css'
import { categories, categoryFor } from '../grid.js'

const props = defineProps({
  geojson: { type: Object, default: null },
  categoryKeys: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  basemap: { type: String, default: 'reference' },
  tiandituKey: { type: String, default: '' },
  demo: Boolean,
})
const emit = defineEmits(['select', 'basemap-status', 'map-state'])

const target = ref(null)
const basemapStatus = ref(null)
const referenceStatus = ref('loading')
const format = new GeoJSON()
const mapProjection = getProjection('EPSG:4326')
const crs = { dataProjection: 'EPSG:4326', featureProjection: mapProjection }
const metersPerDegree = mapProjection.getMetersPerUnit()
const tiandituGrid = createXYZ({ extent: mapProjection.getExtent(), minZoom: 1, maxZoom: 18 })
const demoCenter = [103.65, 30.21]
const mapFont = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif'
const referenceSourcesUrl = `${import.meta.env.BASE_URL}demo/SOURCES.md`
const satelliteExtent = [85.25, 44.72, 91.38, 49.42]
const satelliteUrl = `${import.meta.env.BASE_URL}imagery/altay-sentinel-2-2025-10.webp`
const satelliteSourcesUrl = `${import.meta.env.BASE_URL}imagery/SOURCES.md`

let map
let view
let pendingFit = false
let stopWatchingTiles
let satelliteEvents = []

const landStyles = ['#f5f0df', '#efeedc', '#e6ead9', '#dce6d1', '#d1e0c8', '#c6d9bd']
  .map((color, zIndex) => new Style({ fill: new Fill({ color }), zIndex }))
const geographicStyles = {
  land: new Style({ fill: new Fill({ color: '#f1efdf' }), zIndex: -1 }),
  contour: new Style({
    stroke: new Stroke({ color: 'rgba(99, 126, 93, 0.20)', width: 0.75 }), zIndex: 6,
  }),
  road: [
    new Style({
      stroke: new Stroke({ color: 'rgba(187, 151, 101, 0.59)', width: 1.04 }), zIndex: 7,
    }),
    new Style({
      stroke: new Stroke({ color: 'rgba(187, 151, 101, 0.43)', width: 0.75 }), zIndex: 7,
    }),
  ],
  lake: new Style({
    fill: new Fill({ color: '#bdd5dc' }),
    stroke: new Stroke({ color: '#a1c3cd', width: 0.65 }),
    zIndex: 8,
  }),
  river: [
    new Style({
      stroke: new Stroke({ color: '#85b5c6', width: 1.34 }), zIndex: 9,
    }),
    new Style({
      stroke: new Stroke({ color: '#9bc3cf', width: 0.82 }), zIndex: 9,
    }),
  ],
  boundary: new Style({
    stroke: new Stroke({ color: '#8c9a78', width: 0.94, lineDash: [4, 4] }), zIndex: 10,
  }),
}

function referenceGeometryStyle(feature, resolution) {
  const kind = feature.get('kind')
  const rank = feature.get('rank') ?? 2
  if (kind === 'land') return landStyles[feature.get('tone')] ?? geographicStyles.land
  if (kind === 'road') {
    if (rank > 1 && resolution * metersPerDegree > 1900) return undefined
    return geographicStyles.road[rank <= 1 ? 0 : 1]
  }
  if (kind === 'river') return geographicStyles.river[rank <= 1 ? 0 : 1]
  if (kind === 'contour' && resolution * metersPerDegree > 4300) return undefined
  if (kind === 'lake' || kind === 'boundary' || kind === 'contour') return geographicStyles[kind]
  return undefined
}

const labelStyles = new WeakMap()
const labelLimits = [Infinity, 4100, 2250, 1120, 650]
const labelColors = {
  city: '#425c52',
  region: '#596e5d',
  terrain: '#677e61',
  water: '#547f8e',
}

function referenceLabelStyle(feature, resolution) {
  const name = feature.get('name')
  if (feature.get('kind') !== 'label' || !name) return undefined

  const rank = feature.get('rank') ?? 2
  if (resolution * metersPerDegree > (labelLimits[rank] ?? 500)) return undefined

  const cachedStyle = labelStyles.get(feature)
  if (cachedStyle) return cachedStyle

  const labelType = feature.get('labelType') ?? 'city'
  const color = labelColors[labelType] ?? labelColors.city
  const isCity = labelType === 'city'
  const fontSize = rank === 0 ? 14 : labelType === 'region' ? 13 : 11
  const style = new Style({
    image: isCity ? new Circle({
      radius: rank === 0 ? 3.1 : 2.15,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#f8faf2', width: 1 }),
    }) : undefined,
    text: new Text({
      text: name,
      font: `${rank <= 1 ? 600 : 500} ${fontSize}px ${mapFont}`,
      offsetY: isCity ? -10 : 0,
      padding: [2, 4, 2, 4],
      fill: new Fill({ color }),
      stroke: new Stroke({ color: 'rgba(250, 250, 238, 0.93)', width: 2.75 }),
    }),
  })
  labelStyles.set(feature, style)
  return style
}

function degreeLabel(degrees, positive, negative) {
  const value = Number(Math.abs(degrees).toFixed(4))
  if (value === 0) return '0°'
  return `${value}°${degrees < 0 ? negative : positive}`
}

function graticuleLabelStyle(options) {
  return new Text({
    font: '10px system-ui, sans-serif',
    fill: new Fill({ color: '#617769' }),
    stroke: new Stroke({ color: '#f0f3e9', width: 2.75 }),
    ...options,
  })
}

const graticule = new Graticule({
  wrapX: false,
  strokeStyle: new Stroke({ color: '#b6c4b4', width: 0.85, lineDash: [4, 6] }),
  showLabels: true,
  targetSize: 140,
  lonLabelPosition: 0.07,
  latLabelPosition: 0.97,
  lonLabelFormatter: (longitude) => degreeLabel(longitude, 'E', 'W'),
  latLabelFormatter: (latitude) => degreeLabel(latitude, 'N', 'S'),
  lonLabelStyle: graticuleLabelStyle({ textBaseline: 'bottom' }),
  latLabelStyle: graticuleLabelStyle({ textAlign: 'end' }),
})
const referenceSource = new VectorSource({
  format,
  url: `${import.meta.env.BASE_URL}demo/reference.geojson`,
  wrapX: false,
})
const referenceGeometry = new VectorLayer({
  source: referenceSource,
  style: referenceGeometryStyle,
  visible: false,
  renderBuffer: 24,
})
const referenceLabels = new VectorLayer({
  source: referenceSource,
  style: referenceLabelStyle,
  declutter: true,
  renderOrder: (a, b) => (a.get('rank') ?? 2) - (b.get('rank') ?? 2),
  visible: false,
  renderBuffer: 64,
})
const tiandituBase = new TileLayer({ visible: false })
const tiandituLabels = new TileLayer({ visible: false })
const satelliteLayer = new ImageLayer({ visible: false })

const gridSource = new VectorSource({ wrapX: false })
const selectedSource = new VectorSource({ wrapX: false })
const featuresById = new Map()
let visibleCategories

function cellStyles(color) {
  const [red, green, blue] = asArray(color)
  return {
    overview: new Style({
      fill: new Fill({ color: [red, green, blue, 0.62] }),
      stroke: new Stroke({ color: 'rgba(252, 251, 236, 0.58)', width: 0.5 }),
    }),
    detail: new Style({
      fill: new Fill({ color: [red, green, blue, 0.55] }),
      stroke: new Stroke({ color: 'rgba(253, 253, 245, 0.78)', width: 0.75 }),
    }),
    selected: [
      new Style({
        stroke: new Stroke({ color: '#fafff4', width: 5 }),
      }),
      new Style({
        fill: new Fill({ color: [red, green, blue, 0.87] }),
        stroke: new Stroke({ color: '#255045', width: 2.5 }),
      }),
    ],
  }
}

const categoryStyles = new Map(categories.map(({ key, color }) => [key, cellStyles(color)]))

const gridLayer = new VectorLayer({
  source: gridSource,
  renderBuffer: 20,
  renderOrder: null,
  style: (feature, resolution) => {
    const category = feature.get('riskCategory')
    if (!visibleCategories.has(category)) return undefined

    const styles = categoryStyles.get(category)
    return resolution * metersPerDegree < 1000 ? styles.detail : styles.overview
  },
})
const selectedLayer = new VectorLayer({
  source: selectedSource,
  renderBuffer: 20,
  style: (feature) => categoryStyles.get(feature.get('riskCategory')).selected,
})
const gridHitOptions = { layerFilter: (layer) => layer === gridLayer, checkWrapped: false }

function refreshFilter() {
  visibleCategories = new Set(props.categoryKeys)
  map?.getViewport().classList.remove('is-over-cell')
  gridLayer.changed()
  refreshSelection()
}

function refreshSelection() {
  const selected = featuresById.get(props.selectedId)
  selectedSource.clear(true)
  if (selected && visibleCategories.has(selected.get('riskCategory'))) selectedSource.addFeature(selected)
}

function providedId(record) {
  const custom = record?.properties?.id
  if ((typeof custom === 'string' && custom.length > 0) || Number.isFinite(custom)) {
    return String(custom)
  }
  const identifier = record?.id ?? record?.properties?.GRID_ID
  return identifier === '' || identifier == null ? null : String(identifier)
}

function replaceCells(geojson) {
  featuresById.clear()
  const records = toRaw(geojson)?.features
  const features = []
  if (Array.isArray(records)) {
    const reservedIds = new Set(records.map(providedId))
    let nextId = 1

    for (const record of records) {
      const type = record?.geometry?.type
      if (type !== 'Polygon' && type !== 'MultiPolygon') continue

      const geometry = format.readGeometry(record.geometry, crs)
      const extent = geometry.getExtent()
      if (isEmpty(extent) || !extent.every(Number.isFinite)) continue

      let id = providedId(record)
      if (id === null || featuresById.has(id)) {
        do {
          id = `grid-${nextId}`
          nextId += 1
        } while (reservedIds.has(id))
      }
      const attributes = record.properties ?? {}
      const feature = new Feature({ geometry, attributes, cellId: id, riskCategory: categoryFor(attributes).key })
      featuresById.set(id, feature)
      features.push(feature)
    }
  }
  gridSource.clear(true)
  gridSource.addFeatures(features)
  refreshSelection()
  fitData()
}

function cellCoordinates(feature) {
  const geometry = feature.getGeometry()
  if (geometry.getType() === 'Polygon') {
    return geometry.getInteriorPoint().getCoordinates().slice(0, 2)
  }
  const points = geometry.getInteriorPoints().getCoordinates()
  const widest = points.reduce((best, point) => point[2] > best[2] ? point : best)
  return widest.slice(0, 2)
}

function selectCell(event) {
  const feature = map.forEachFeatureAtPixel(event.pixel, (hit) => hit, gridHitOptions)
  if (!feature) {
    emit('select', null)
    return
  }
  const properties = { ...feature.get('attributes') }
  emit('select', {
    id: feature.get('cellId'),
    properties,
    coordinates: cellCoordinates(feature),
  })
}

function fitData() {
  const size = map?.getSize()
  if (!size?.[0] || !size[1]) {
    pendingFit = true
    return
  }

  pendingFit = false
  const extent = gridSource.getExtent()
  if (isEmpty(extent)) return

  const [width, height] = size
  const compact = width < 630
  const side = Math.min(compact ? 36 : 54, width * 0.15)
  const top = Math.min(compact ? 44 : 70, height * 0.22)
  const bottom = Math.min(compact ? 36 : 54, height * 0.18)
  view.cancelAnimations()
  view.fit(extent, { size, padding: [top, side, bottom, side], maxZoom: 16 })
}

function zoomBy(amount) {
  if (!view) return
  const zoom = view.getConstrainedZoom(view.getZoom() + amount)
  view.cancelAnimations()
  view.animate({ zoom, duration: 180 })
}

function publishMapState() {
  emit('map-state', { zoom: view.getZoom(), center: view.getCenter() })
}

function refreshReferenceVisibility() {
  const hasTianditu = basemapStatus.value === 'tianditu'
  const hasSatellite = basemapStatus.value === 'satellite'
  const showDemo = !hasTianditu && !hasSatellite && props.demo && referenceStatus.value !== 'error'
  referenceGeometry.setVisible(showDemo)
  referenceLabels.setVisible(showDemo)
  graticule.setVisible(!hasTianditu && !(showDemo && referenceStatus.value === 'ready'))
}

function setBasemapStatus(status) {
  if (basemapStatus.value === status) return
  basemapStatus.value = status
  refreshReferenceVisibility()
  emit('basemap-status', status)
}

function removeTianditu() {
  stopWatchingTiles?.()
  stopWatchingTiles = undefined
  for (const layer of [tiandituBase, tiandituLabels]) {
    layer.setVisible(false)
    layer.setSource(null)
  }
}

function tiandituSource(layer, key) {
  return new XYZ({
    url: `https://t{0-7}.tianditu.gov.cn/${layer}_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(key)}`,
    projection: mapProjection,
    tileGrid: tiandituGrid,
    transition: 0,
    wrapX: false,
  })
}

function removeSatellite() {
  unByKey(satelliteEvents)
  satelliteEvents = []
  satelliteLayer.setVisible(false)
  satelliteLayer.setSource(null)
}

function showSatellite() {
  const source = new ImageStatic({ url: satelliteUrl, imageExtent: satelliteExtent, projection: mapProjection })
  satelliteEvents = [
    source.on('imageloadstart', () => setBasemapStatus('loading')),
    source.on('imageloadend', () => setBasemapStatus('satellite')),
    source.on('imageloaderror', () => {
      removeSatellite()
      setBasemapStatus('satellite-error')
    }),
  ]
  satelliteLayer.setSource(source)
  satelliteLayer.setVisible(true)
  setBasemapStatus('satellite')
}

function useSatellite() {
  if (props.basemap === 'satellite') return true
  if (props.basemap !== 'auto' || props.demo) return false
  const gridExtent = gridSource.getExtent()
  return !isEmpty(gridExtent) && containsExtent(satelliteExtent, gridExtent)
}

function updateBasemap() {
  const useImage = useSatellite()
  if (useImage && satelliteLayer.getVisible()) return

  removeTianditu()
  removeSatellite()
  if (useImage) {
    showSatellite()
    return
  }
  if (props.basemap !== 'tianditu') {
    setBasemapStatus('reference')
    return
  }

  const key = props.tiandituKey.trim()
  if (!key) {
    setBasemapStatus('error')
    return
  }

  setBasemapStatus('loading')
  const listeners = []
  const ready = new Set()
  const sources = [
    [tiandituBase, tiandituSource('vec', key)],
    [tiandituLabels, tiandituSource('cva', key)],
  ]
  const fallBack = () => {
    removeTianditu()
    setBasemapStatus('error')
  }
  const timeout = window.setTimeout(fallBack, 8500)
  stopWatchingTiles = () => {
    window.clearTimeout(timeout)
    unByKey(listeners)
  }

  for (const [layer, source] of sources) {
    let consecutiveErrors = 0
    listeners.push(
      source.on('tileloaderror', () => {
        consecutiveErrors += 1
        if (consecutiveErrors >= 6) fallBack()
      }),
      source.on('tileloadend', () => {
        consecutiveErrors = 0
        ready.add(layer)
        if (ready.size < sources.length || basemapStatus.value !== 'loading') return

        window.clearTimeout(timeout)
        tiandituBase.setOpacity(1)
        tiandituLabels.setOpacity(1)
        setBasemapStatus('tianditu')
      }),
    )
    layer.setSource(source)
    layer.setOpacity(0)
    layer.setVisible(true)
  }
}

const referenceEvents = [
  referenceSource.on('featuresloadend', (event) => {
    referenceStatus.value = event.features?.length ? 'ready' : 'error'
    refreshReferenceVisibility()
  }),
  referenceSource.on('featuresloaderror', () => {
    referenceStatus.value = 'error'
    refreshReferenceVisibility()
  }),
]

onMounted(() => {
  view = new View({
    projection: mapProjection,
    center: demoCenter,
    zoom: 6,
    minZoom: 1,
    maxZoom: 18,
    enableRotation: false,
  })
  refreshFilter()
  map = new OlMap({
    target: target.value,
    view,
    interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
    controls: [new ScaleLine({ units: 'metric', minWidth: 58 })],
    layers: [
      graticule, referenceGeometry, satelliteLayer, tiandituBase,
      gridLayer, referenceLabels, tiandituLabels, selectedLayer,
    ],
  })

  map.on('change:size', () => {
    if (pendingFit) fitData()
  })
  map.on('moveend', publishMapState)
  map.on('singleclick', selectCell)
  map.on('pointermove', (event) => {
    const overCell = !event.dragging && map.hasFeatureAtPixel(event.pixel, gridHitOptions)
    map.getViewport().classList.toggle('is-over-cell', overCell)
  })
  replaceCells(props.geojson)
  updateBasemap()
  publishMapState()
})

onBeforeUnmount(() => {
  unByKey(referenceEvents)
  removeTianditu()
  removeSatellite()
  map?.dispose()
})

watch(() => props.geojson, (geojson) => {
  replaceCells(geojson)
  if (geojson && props.basemap === 'auto') updateBasemap()
}, { flush: 'post' })
watch(() => props.categoryKeys, refreshFilter, { deep: true })
watch(() => props.selectedId, refreshSelection)
watch(() => props.demo, refreshReferenceVisibility)
watch([() => props.basemap, () => props.tiandituKey], updateBasemap)

defineExpose({
  zoomIn: () => zoomBy(1),
  zoomOut: () => zoomBy(-1),
  fitData,
})
</script>

<template>
  <div
    class="grid-map"
    :class="{ 'grid-map--reference': demo && basemapStatus !== 'tianditu' && basemapStatus !== 'satellite' && referenceStatus === 'ready' }"
  >
    <div
      ref="target"
      class="grid-map__target"
      role="region"
      aria-label="监测网格地图。使用方向键平移，使用加号和减号缩放。"
      tabindex="0"
    ></div>
    <div class="grid-map__credit">
      <a
        v-if="basemapStatus === 'tianditu'"
        href="https://www.tianditu.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >底图 © 天地图 · EPSG:4326</a>
      <template v-else-if="basemapStatus === 'satellite'">
        <a :href="satelliteSourcesUrl" target="_blank" rel="noopener noreferrer">Sentinel‑2 真彩色 · 2025.10.16–24</a>
        <span class="grid-map__source">Contains modified Copernicus Sentinel data 2025</span>
      </template>
      <a
        v-else-if="demo && referenceStatus === 'ready'"
        :href="referenceSourcesUrl"
        target="_blank"
        rel="noopener noreferrer"
      >区域示意底图 · Natural Earth / Mapzen</a>
      <span v-else>经纬参考网 · EPSG:4326</span>
    </div>
  </div>
</template>

<style scoped>
.grid-map {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #f2f5ec;
}

.grid-map--reference {
  background: #e4eae5;
}

.grid-map__target {
  position: absolute;
  inset: 0;
}

.grid-map__target:focus-visible {
  z-index: 1;
  outline: 2px solid #36715f;
  outline-offset: -2px;
}

.grid-map__target :deep(.ol-viewport) {
  cursor: grab;
}

.grid-map__target :deep(.ol-viewport.is-over-cell) {
  cursor: pointer;
}

.grid-map__target :deep(.ol-viewport:active) {
  cursor: grabbing;
}

.grid-map__target :deep(.ol-scale-line),
.grid-map__credit {
  border-radius: 4px;
  background: rgba(249, 251, 245, 0.93);
}

.grid-map__target :deep(.ol-scale-line) {
  bottom: 10px;
  left: 12px;
  padding: 2px 5px 4px;
}

.grid-map__target :deep(.ol-scale-line-inner) {
  border-color: #597267;
  color: #334b40;
  font-family: inherit;
  font-size: 10px;
}

.grid-map__credit {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 10px;
  max-width: calc(100% - 100px);
  padding: 2px 6px;
  color: #4c665a;
  font-size: 10px;
  line-height: 1.5;
}

.grid-map__source {
  display: block;
}

.grid-map__credit a {
  color: inherit;
  text-decoration-color: #82988b;
  text-underline-offset: 2px;
}
</style>
