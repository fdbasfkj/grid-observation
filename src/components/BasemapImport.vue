<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { Upload, X } from '@lucide/vue'
import { basemapFormat, prepareLocalBasemap, readLocalBasemap, removeLocalBasemap, saveLocalBasemap } from '../local-basemap.js'

defineProps({ currentName: { type: String, default: '' } })
const emit = defineEmits(['loaded', 'removed'])
const dialog = ref(null)
const fileInput = ref(null)
const file = shallowRef(null)
const coordinates = reactive({ west: '', east: '', south: '', north: '' })
const fields = [
  { key: 'west', label: '西侧经度', limit: 180 },
  { key: 'east', label: '东侧经度', limit: 180 },
  { key: 'south', label: '南侧纬度', limit: 90 },
  { key: 'north', label: '北侧纬度', limit: 90 },
]
const format = computed(() => basemapFormat(file.value?.name))
const busy = ref(false)
const error = ref('')
const restoreError = ref('')
const hasSaved = ref(false)
let revision = 0

function open() {
  file.value = null
  fileInput.value.value = ''
  for (const { key } of fields) coordinates[key] = ''
  error.value = restoreError.value
  dialog.value.showModal()
}

function close() {
  if (!busy.value) dialog.value.close()
}

function selectFile(event) {
  file.value = event.target.files[0] ?? null
  error.value = file.value && !format.value ? '请选择 GeoTIFF、PNG、JPG 或 WebP 文件。' : ''
}

async function submit() {
  if (busy.value) return
  const current = ++revision
  busy.value = true
  error.value = ''
  let prepared
  try {
    const extent = format.value === 'image'
      ? ['west', 'south', 'east', 'north'].map((key) => coordinates[key] === '' ? NaN : Number(coordinates[key]))
      : null
    const record = { file: file.value, extent }
    prepared = await prepareLocalBasemap(record)
    let saved = false
    try {
      await saveLocalBasemap(record)
      hasSaved.value = true
      saved = true
    } catch {
      // The file can still be displayed during this visit.
    }
    if (revision !== current) return

    restoreError.value = ''
    emit('loaded', { basemap: prepared, activate: true, saved })
    prepared = null
    dialog.value.close()
  } catch (cause) {
    if (revision === current) error.value = cause?.message || '底图导入失败，请重试。'
  } finally {
    prepared?.dispose()
    if (revision === current) busy.value = false
  }
}

async function remove() {
  if (busy.value) return
  const current = ++revision
  busy.value = true
  error.value = ''
  try {
    if (hasSaved.value) await removeLocalBasemap()
    if (revision !== current) return
    hasSaved.value = false
    restoreError.value = ''
    emit('removed')
    dialog.value.close()
  } catch {
    if (revision === current) error.value = '浏览器暂时无法移除已保存的底图，请重试。'
  } finally {
    if (revision === current) busy.value = false
  }
}

onMounted(async () => {
  const current = revision
  const record = await readLocalBasemap().catch(() => null)
  if (!record || revision !== current) return
  hasSaved.value = true
  try {
    const basemap = await prepareLocalBasemap(record)
    if (revision === current) emit('loaded', { basemap, activate: false, saved: true })
    else basemap.dispose()
  } catch {
    if (revision === current) restoreError.value = '已保存的底图读取失败，可以重新导入或移除。'
  }
})
onBeforeUnmount(() => { revision += 1 })

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="guide-dialog basemap-import" aria-labelledby="basemap-import-title" @cancel.prevent="close">
    <form :aria-busy="busy" @submit.prevent="submit">
      <div class="dialog-title">
        <div class="dialog-title__icon"><Upload aria-hidden="true" :size="20" /></div>
        <h2 id="basemap-import-title">导入底图</h2>
        <button class="icon-button icon-button--quiet" type="button" :disabled="busy" aria-label="关闭" @click="close">
          <X aria-hidden="true" :size="19" />
        </button>
      </div>

      <p class="basemap-import__note">底图保存在当前浏览器。</p>
      <label class="basemap-import__file" for="basemap-file">
        <strong>底图文件</strong>
        <input id="basemap-file" ref="fileInput" type="file" accept=".tif,.tiff,.png,.jpg,.jpeg,.webp"
          :disabled="busy" aria-describedby="basemap-file-hint" @change="selectFile" />
      </label>
      <p id="basemap-file-hint" class="basemap-import__hint">GeoTIFF、PNG、JPG 或 WebP</p>
      <p v-if="format === 'geotiff'" class="basemap-import__hint">读取文件的地理参考。支持 WGS 84、Web Mercator 和 WGS 84 UTM。</p>

      <fieldset v-if="format === 'image'" class="basemap-import__extent" :disabled="busy">
        <legend>WGS 84 覆盖范围（度）</legend>
        <p class="basemap-import__hint">填写影像的四边坐标，西经和南纬用负数。</p>
        <div class="basemap-import__coordinates">
          <label v-for="field in fields" :key="field.key">
            {{ field.label }}
            <input v-model="coordinates[field.key]" type="number" inputmode="decimal" step="any"
              :min="-field.limit" :max="field.limit" required />
          </label>
        </div>
      </fieldset>

      <p v-if="currentName" class="basemap-import__current" :title="currentName">已导入 · {{ currentName }}</p>
      <p v-if="error" class="basemap-import__error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button v-if="currentName || hasSaved" class="inline-link basemap-import__remove" type="button"
          :disabled="busy" @click="remove">移除底图</button>
        <button class="secondary-button" type="button" :disabled="busy" @click="close">取消</button>
        <button class="secondary-button basemap-import__submit" type="submit" :disabled="!format || busy">
          {{ busy ? '处理中…' : '导入' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
