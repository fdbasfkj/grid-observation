<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  Crosshair, Eye, Focus, Layers2, Layers3, LoaderCircle, Map as MapIcon, MapPin,
  Minus, Plus, TriangleAlert, X,
} from '@lucide/vue'
import GridMap from './components/GridMap.vue'
import { getCatalog, getMonthGeoJSON } from './api.js'
import { categories, categoryFor, formatCoordinates, monthLabel, number } from './grid.js'

const tiandituKey = (import.meta.env.VITE_TDT_KEY || '').trim()
const catalog = shallowRef(null)
const geojson = shallowRef(null)
const activeMonth = ref('')
const catalogLoading = ref(true)
const catalogError = ref(false)
const monthLoading = ref(false)
const monthError = ref(false)
const basemap = ref(tiandituKey ? 'tianditu' : 'reference')
const mapStatus = ref('reference')
const mapState = shallowRef(null)
const enabledCategories = ref(categories.map(({ key }) => key))
const picked = shallowRef(null)
const map = ref(null)
const monthMenu = ref(null)
const basemapMenu = ref(null)
const guide = ref(null)
const detailCard = ref(null)
let catalogRequest
let monthRequest

const months = computed(() => catalog.value?.months ?? [])
const isDemo = computed(() => catalog.value?.demo === true)
const activeIndex = computed(() => months.value.findIndex(({ month }) => month === activeMonth.value))
const featureCount = computed(() => geojson.value?.features.length ?? 0)
const legend = computed(() => {
  const counts = new Map(categories.map(({ key }) => [key, 0]))
  for (const feature of geojson.value?.features ?? []) {
    const { key } = categoryFor(feature.properties)
    counts.set(key, counts.get(key) + 1)
  }
  return categories.map((category) => ({ ...category, count: counts.get(category.key) }))
})
const shownCount = computed(() => legend.value.reduce((count, row) => (
  enabledCategories.value.includes(row.key) ? count + row.count : count
), 0))
const pickedCategory = computed(() => categoryFor(picked.value?.properties))
const pickedFields = computed(() => Object.entries(picked.value?.properties ?? {}).filter(
  ([key, value]) => !['id', 'category', 'geometry', 'LON', 'LAT', 'GRID_X', 'GRID_Y', 'R_rank'].includes(key) && value !== null && value !== '',
))
const zoom = computed(() => mapState.value?.zoom)
const mapCenter = computed(() => formatCoordinates(mapState.value?.center))

function requestedMonth() {
  return new URLSearchParams(window.location.search).get('month')
}

function setLocationMonth(month) {
  const url = new URL(window.location.href)
  url.hash = ''
  if (month) url.searchParams.set('month', month)
  else url.searchParams.delete('month')
  if (url.href !== window.location.href) window.history.pushState(null, '', url)
}

function followLocation() {
  const fromUrl = requestedMonth()
  activeMonth.value = months.value.find(({ month }) => month === fromUrl)?.month ?? months.value[0]?.month ?? ''
}

function chooseMonth(month) {
  if (monthMenu.value?.open) {
    monthMenu.value.open = false
    monthMenu.value.querySelector('summary')?.focus()
  }
  if (month === activeMonth.value) return
  activeMonth.value = month
  setLocationMonth(month)
}

async function loadCatalog(preferred = requestedMonth()) {
  catalogRequest?.abort()
  const controller = new AbortController()
  catalogRequest = controller
  catalogLoading.value = true
  catalogError.value = false
  try {
    const result = await getCatalog(controller.signal)
    if (controller.signal.aborted) return
    if (!Array.isArray(result.months)) throw new Error('Invalid catalog')
    catalog.value = { ...result, months: [...result.months].sort((a, b) => b.month.localeCompare(a.month)) }
    const newMonth = months.value.find(({ month }) => month === preferred)?.month ?? months.value[0]?.month ?? ''
    if (newMonth && newMonth === activeMonth.value) void loadMonth(newMonth)
    else activeMonth.value = newMonth
  } catch (error) {
    if (!controller.signal.aborted) {
      catalogError.value = true
      catalog.value = null
      activeMonth.value = ''
    }
  } finally {
    if (!controller.signal.aborted) catalogLoading.value = false
  }
}

async function loadMonth(month) {
  monthRequest?.abort()
  const controller = new AbortController()
  monthRequest = controller
  geojson.value = null
  picked.value = null
  monthError.value = false
  const entry = months.value.find((item) => item.month === month)
  monthLoading.value = Boolean(entry)
  if (!entry) return
  try {
    const data = await getMonthGeoJSON(entry, controller.signal)
    if (!controller.signal.aborted) geojson.value = data
  } catch (error) {
    if (!controller.signal.aborted) monthError.value = true
  } finally {
    if (!controller.signal.aborted) monthLoading.value = false
  }
}

function toggleCategory(key) {
  if (enabledCategories.value.includes(key)) {
    enabledCategories.value = enabledCategories.value.filter((item) => item !== key)
    if (picked.value && pickedCategory.value.key === key) picked.value = null
  } else {
    enabledCategories.value = [...enabledCategories.value, key]
  }
}

function showAllCategories() {
  enabledCategories.value = categories.map(({ key }) => key)
}

async function chooseBasemap(value) {
  if (basemapMenu.value?.open) {
    basemapMenu.value.open = false
    basemapMenu.value.querySelector('summary')?.focus()
  }
  if (value === 'tianditu' && basemap.value === value && mapStatus.value === 'error') {
    basemap.value = 'reference'
    await nextTick()
  }
  basemap.value = value
}

function closeMenus(event) {
  if (event.type === 'keydown' && event.key !== 'Escape') return
  for (const menu of [monthMenu.value, basemapMenu.value]) {
    if (menu?.open && (event.type === 'keydown' || !menu.contains(event.target))) {
      menu.open = false
      if (event.type === 'keydown') menu.querySelector('summary')?.focus()
    }
  }
}

function fieldLabel(key) {
  return { value: '格网数值', areaKm2: '单元面积', R: '雪崩风险值' }[key] ?? key
}

function fieldValue(key, value) {
  if (key === 'areaKm2' && typeof value === 'number') return `${number.format(value)} km²`
  if (typeof value === 'number') return number.format(value)
  if (typeof value === 'boolean') return value ? '是' : '否'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function inspectOnMobile() {
  detailCard.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  detailCard.value?.focus({ preventScroll: true })
}

watch(activeMonth, loadMonth)
onMounted(() => {
  void loadCatalog()
  window.addEventListener('popstate', followLocation)
  window.addEventListener('pointerdown', closeMenus)
  window.addEventListener('keydown', closeMenus)
})
onBeforeUnmount(() => {
  catalogRequest?.abort()
  monthRequest?.abort()
  window.removeEventListener('popstate', followLocation)
  window.removeEventListener('pointerdown', closeMenus)
  window.removeEventListener('keydown', closeMenus)
})
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <a href="#map-view" class="brand">
        <span class="brand__mark"><Layers3 aria-hidden="true" :size="24" :stroke-width="1.8" /></span>
        <span class="brand__name">格网观测台</span>
      </a>
      <nav class="site-nav" aria-label="主导航">
        <a href="#map-view" class="site-nav__map" aria-current="page">
          <MapIcon aria-hidden="true" :size="16" /> 地图浏览
        </a>
        <button class="site-nav__guide" type="button" title="更新说明" @click="guide.showModal()">
          <CircleHelp aria-hidden="true" :size="16" /><span>更新说明</span>
        </button>
      </nav>
    </div>
  </header>

  <main class="workspace" id="map-view">
    <div class="page-intro">
      <div>
        <div class="page-intro__title">
          <h1>月度格网地图</h1>
          <span v-if="isDemo" class="demo-chip"><span aria-hidden="true"></span>示例数据</span>
        </div>
        <p>按月浏览阿勒泰雪崩风险格网，点击地图查看单元属性。</p>
      </div>

      <section class="period" aria-label="选择观测月份">
        <span class="period__label">观测月份</span>
        <div class="period__controls">
          <button class="period__arrow" type="button" title="上一个已发布月份" aria-label="上一个已发布月份"
            :disabled="activeIndex < 0 || activeIndex >= months.length - 1" @click="chooseMonth(months[activeIndex + 1].month)">
            <ChevronLeft aria-hidden="true" :size="18" />
          </button>
          <details ref="monthMenu" class="period-menu">
            <summary class="period-menu__trigger">
              <CalendarDays aria-hidden="true" :size="17" />
              <span>{{ monthLabel(activeMonth) }}</span>
              <ChevronDown aria-hidden="true" :size="15" class="down-icon" />
            </summary>
            <div class="menu-surface period-menu__items" aria-label="已发布的月份">
              <p v-if="!months.length" class="menu-empty">{{ catalogLoading ? '正在读取月份' : '暂无可选月份' }}</p>
              <button v-for="entry in months" :key="entry.month" type="button" :aria-pressed="entry.month === activeMonth"
                @click="chooseMonth(entry.month)">
                <span>{{ monthLabel(entry.month) }}</span>
                <span v-if="entry.month === months[0].month" class="latest-tag">最新</span>
              </button>
            </div>
          </details>
          <button class="period__arrow" type="button" title="下一个已发布月份" aria-label="下一个已发布月份"
            :disabled="activeIndex <= 0" @click="chooseMonth(months[activeIndex - 1].month)">
            <ChevronRight aria-hidden="true" :size="18" />
          </button>
        </div>
      </section>
    </div>

    <div class="workspace-grid">
      <aside class="left-panels" aria-label="图层和月份信息">
        <section class="info-card layer-card" aria-labelledby="layer-title">
          <div class="card-title">
            <h2 id="layer-title"><Layers2 aria-hidden="true" :size="16" /> 格网概览</h2>
            <span v-if="activeMonth" class="card-period">{{ activeMonth }}</span>
          </div>
          <div class="grid-total">
            <strong>{{ geojson ? number.format(featureCount) : '—' }}</strong>
            <span>格网单元</span>
          </div>
          <div class="distribution" aria-hidden="true">
            <span v-for="row in legend" :key="row.key" :style="{
              flexGrow: row.count, backgroundColor: row.color,
              opacity: enabledCategories.includes(row.key) ? 1 : 0.23,
            }"></span>
          </div>
          <div class="legend-title">
            <h3>风险等级（R_rank）</h3>
            <button v-if="enabledCategories.length < categories.length" type="button" class="inline-link" @click="showAllCategories">显示全部</button>
            <Eye v-else aria-hidden="true" :size="15" />
          </div>
          <ul class="layer-legend">
            <li v-for="row in legend" :key="row.key">
              <label class="legend-row" :class="{ 'legend-row--hidden': !enabledCategories.includes(row.key) }">
                <span class="swatch" :style="{ '--swatch': row.color }" aria-hidden="true"></span>
                <span class="legend-row__name">
                  {{ row.label }}<small v-if="row.key !== 'unknown'" class="legend-row__rank">{{ row.key }} 级</small>
                </span>
                <span class="legend-row__count">{{ geojson ? number.format(row.count) : '—' }}</span>
                <input type="checkbox" :checked="enabledCategories.includes(row.key)" :aria-label="`显示${row.label}格网`"
                  @change="toggleCategory(row.key)" />
              </label>
            </li>
          </ul>
        </section>

        <section v-if="picked" ref="detailCard" class="info-card feature-card" aria-labelledby="feature-title" tabindex="-1">
          <div class="card-title">
            <h2 id="feature-title"><MapPin aria-hidden="true" :size="16" /> 格网属性</h2>
            <button type="button" class="icon-button icon-button--quiet" title="清除选中格网" aria-label="清除选中格网" @click="picked = null"><X aria-hidden="true" :size="16" /></button>
          </div>
          <dl class="feature-fields">
            <div><dt>格网编号</dt><dd>{{ picked.id }}</dd></div>
            <div>
              <dt>R_rank</dt>
              <dd><span class="swatch" :style="{ '--swatch': pickedCategory.color }" aria-hidden="true"></span>{{ pickedCategory.key === 'unknown' ? pickedCategory.label : `${pickedCategory.key} · ${pickedCategory.label}` }}</dd>
            </div>
            <div><dt>经纬度</dt><dd title="WGS 84（EPSG:4326）">{{ formatCoordinates(picked.coordinates) }}</dd></div>
            <div v-for="[key, value] in pickedFields" :key="key"><dt>{{ fieldLabel(key) }}</dt><dd>{{ fieldValue(key, value) }}</dd></div>
          </dl>
        </section>

        <section v-else class="info-card archive-card" aria-labelledby="archive-title">
          <div class="card-title">
            <h2 id="archive-title"><CalendarDays aria-hidden="true" :size="16" /> 历史档案</h2>
            <span class="card-period">{{ months.length }} 期</span>
          </div>
          <div v-if="months.length" class="archive-list">
            <button v-for="(entry, index) in months" :key="entry.month" type="button" class="archive-row"
              :aria-pressed="entry.month === activeMonth" @click="chooseMonth(entry.month)">
              <span class="archive-row__dot" aria-hidden="true"></span>
              <span>{{ monthLabel(entry.month) }}</span>
              <span v-if="index === 0" class="latest-tag">最新</span>
              <ChevronRight v-else aria-hidden="true" :size="14" class="archive-row__arrow" />
            </button>
          </div>
          <p v-else class="archive-empty">{{ catalogLoading ? '正在读取档案…' : '暂无发布记录' }}</p>
        </section>
      </aside>

      <section class="map-card" aria-label="月度格网地图" :aria-busy="catalogLoading || monthLoading">
        <div class="map-stage">
          <GridMap ref="map" :geojson="geojson" :category-keys="enabledCategories"
            :selected-id="picked?.id ?? null" :basemap="basemap" :tianditu-key="tiandituKey" :demo="isDemo"
            @select="picked = $event" @basemap-status="mapStatus = $event" @map-state="mapState = $event" />

          <div v-if="activeMonth" class="map-ribbon">
            <span class="map-ribbon__icon"><Layers2 :size="15" aria-hidden="true" /></span>
            <span><strong>月度格网</strong><span class="map-ribbon__period">{{ activeMonth }}</span></span>
          </div>

          <details ref="basemapMenu" class="basemap-menu">
            <summary class="basemap-menu__trigger" title="切换底图">
              <MapIcon aria-hidden="true" :size="16" />
              {{ mapStatus === 'tianditu' ? '天地图' : mapStatus === 'loading' ? '加载底图' : '参考底图' }}
              <ChevronDown aria-hidden="true" :size="14" class="down-icon" />
            </summary>
            <div class="menu-surface basemap-menu__items">
              <button type="button" :aria-pressed="basemap === 'reference' || mapStatus === 'error'" @click="chooseBasemap('reference')">参考底图</button>
              <button type="button" :disabled="!tiandituKey" :aria-pressed="basemap === 'tianditu' && mapStatus !== 'error'"
                @click="chooseBasemap('tianditu')">天地图 <span v-if="!tiandituKey" class="menu-hint">待配置</span></button>
            </div>
          </details>

          <div class="map-controls" aria-label="地图工具">
            <div class="map-controls__zoom">
              <button class="icon-button" type="button" title="放大" aria-label="放大" @click="map?.zoomIn()"><Plus aria-hidden="true" :size="20" /></button>
              <button class="icon-button" type="button" title="缩小" aria-label="缩小" @click="map?.zoomOut()"><Minus aria-hidden="true" :size="20" /></button>
            </div>
            <button class="icon-button map-fit" type="button" title="定位到本月格网" aria-label="定位到本月格网"
              :disabled="!featureCount" @click="map?.fitData()"><Focus aria-hidden="true" :size="19" /></button>
          </div>

          <div v-if="catalogLoading || monthLoading || catalogError || monthError || !activeMonth" class="map-feedback" role="status">
            <template v-if="catalogLoading || monthLoading">
              <LoaderCircle aria-hidden="true" :size="20" class="spinner" /> <span>正在加载地图…</span>
            </template>
            <template v-else-if="catalogError || monthError">
              <TriangleAlert aria-hidden="true" :size="20" />
              <span>{{ catalogError ? '月份目录加载失败' : '本期格网加载失败' }}</span>
              <button type="button" class="inline-link" @click="catalogError ? loadCatalog() : loadMonth(activeMonth)">重试</button>
            </template>
            <template v-else><MapIcon aria-hidden="true" :size="20" /> <span>暂无发布的月度地图</span></template>
          </div>
          <p v-if="mapStatus === 'error'" class="basemap-notice" role="status">天地图加载失败，已切换到参考底图。</p>

          <button v-if="picked" class="feature-peek" type="button" @click="inspectOnMobile">
            <MapPin aria-hidden="true" :size="15" /> 查看格网属性 <ChevronRight aria-hidden="true" :size="15" />
          </button>
        </div>
        <footer class="map-footer">
          <span class="map-footer__count"><span class="status-dot" aria-hidden="true"></span>
            <template v-if="geojson">显示 {{ number.format(shownCount) }} / {{ number.format(featureCount) }} 个格网</template>
            <template v-else>等待格网数据</template>
          </span>
          <span class="map-footer__position" title="地图中心 · WGS 84（EPSG:4326）"><Crosshair aria-hidden="true" :size="14" /> {{ mapCenter }}</span>
          <span class="map-footer__zoom" title="缩放级别">{{ Number.isFinite(zoom) ? `级别 ${zoom.toFixed(1)}` : '级别 —' }}</span>
        </footer>
      </section>
    </div>
  </main>

  <dialog ref="guide" class="guide-dialog" aria-labelledby="guide-title">
    <div class="dialog-title">
      <div class="dialog-title__icon"><CircleHelp aria-hidden="true" :size="22" /></div>
      <h2 id="guide-title">月度更新说明</h2>
      <form method="dialog"><button class="icon-button icon-button--quiet" title="关闭" aria-label="关闭"><X aria-hidden="true" :size="19" /></button></form>
    </div>
    <ol class="guide-steps">
      <li><strong>导出格网文件</strong><span>在 GIS 软件中将面格网导出为 WGS 84（EPSG:4326）的 GeoJSON。</span></li>
      <li><strong>提交月度文件</strong><span>以 YYYY-MM.geojson 命名，上传到 GitHub 仓库的 data/months/ 目录并提交到默认分支。</span></li>
      <li><strong>查看公开地图</strong><span>GitHub Pages 部署成功后，访客用同一个网址就能查看新一期及历史月份。</span></li>
    </ol>
    <div class="dialog-actions">
      <form method="dialog"><button class="secondary-button">关闭</button></form>
    </div>
  </dialog>
</template>
