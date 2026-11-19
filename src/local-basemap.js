import { unByKey } from 'ol/Observable.js'
import ImageLayer from 'ol/layer/Image.js'
import { get as getProjection, getTransformFromProjections, transformExtent } from 'ol/proj.js'
import ImageStatic from 'ol/source/ImageStatic.js'
import { getContext } from 'ol/webgl.js'

const mapCrs = 'EPSG:4326'
const storeName = 'basemap'
const storedKey = 'current'

export function basemapFormat(name = '') {
  if (/\.tiff?$/i.test(name)) return 'geotiff'
  return /\.(png|jpe?g|webp)$/i.test(name) ? 'image' : null
}

function checkExtent(extent, message) {
  if (!Array.isArray(extent) || extent.length !== 4 || !extent.every(Number.isFinite)) throw new Error(message)
  const [west, south, east, north] = extent
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) throw new Error(message)
}

async function prepareImage(file, extent) {
  checkExtent(extent, '请填写有效的 WGS 84 覆盖范围，西侧经度应小于东侧，南侧纬度应小于北侧。')
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  const webp = String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
  if (!png && !jpeg && !webp) throw new Error('请选择有效的 PNG、JPG 或 WebP 图片。')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('无法读取这张图片，请选择有效的 PNG、JPG 或 WebP。')
  }

  const source = new ImageStatic({ url, imageExtent: extent, projection: mapCrs })
  const layer = new ImageLayer({ source, visible: false })
  return {
    name: file.name, extent, layer, errorEvent: 'imageloaderror',
    dispose() {
      layer.dispose()
      URL.revokeObjectURL(url)
    },
  }
}

async function tiffView(source) {
  let listener
  let timeout
  try {
    return await Promise.race([
      source.getView(),
      new Promise((_, reject) => {
        listener = source.on('change', () => {
          if (source.getState() === 'error') reject(new Error('无法读取这张 GeoTIFF。'))
        })
        timeout = setTimeout(() => reject(new Error('GeoTIFF 读取超时，请重新尝试。')), 30_000)
      }),
    ])
  } finally {
    clearTimeout(timeout)
    unByKey(listener)
  }
}

async function prepareGeoTiff(file) {
  const [{ fromBlob }, { default: GeoTIFF }, { default: WebGLTile }] = await Promise.all([
    import('geotiff'), import('ol/source/GeoTIFF.js'), import('ol/layer/WebGLTile.js'),
  ])
  let image
  try {
    image = await (await fromBlob(file)).getImage()
  } catch {
    throw new Error('无法读取这个 TIFF，请选择有效的 GeoTIFF 文件。')
  }

  const keys = image.getGeoKeys()
  const epsg = keys?.GTModelTypeGeoKey === 1
    ? keys.ProjectedCSTypeGeoKey
    : keys?.ProjectedCSTypeGeoKey ?? keys?.GeographicTypeGeoKey
  if (!epsg || epsg === 32767) {
    throw new Error('这张 TIFF 缺少可识别的坐标系，请用 GIS 软件导出带坐标的 GeoTIFF。')
  }
  const projection = getProjection(`EPSG:${epsg}`)
  if (!getTransformFromProjections(projection, getProjection(mapCrs))) {
    throw new Error(`暂不支持 EPSG:${epsg}。请将影像导出为 WGS 84（EPSG:4326）、Web Mercator 或 WGS 84 UTM。`)
  }
  try {
    image.getBoundingBox()
  } catch {
    throw new Error('这张 GeoTIFF 缺少影像位置，请用 GIS 软件重新导出带地理参考的影像。')
  }

  const context = getContext(document.createElement('canvas'))
  if (!context) throw new Error('当前浏览器无法渲染 GeoTIFF。可以使用带 WGS 84 范围的 PNG、JPG 或 WebP。')
  context.getExtension('WEBGL_lose_context')?.loseContext()

  const source = new GeoTIFF({ sources: [{ blob: file }], projection, convertToRGB: 'auto', transition: 0 })
  try {
    const view = await tiffView(source)
    const extent = transformExtent(view.extent, projection, mapCrs, 16)
    checkExtent(extent, 'GeoTIFF 的地理范围超出有效经纬度，请检查文件的投影和导出范围。')
    const layer = new WebGLTile({ source, extent, visible: false })
    return {
      name: file.name, extent, layer, errorEvent: 'tileloaderror',
      dispose() {
        layer.dispose()
        source.dispose()
      },
    }
  } catch (error) {
    source.dispose()
    throw error
  }
}

export function prepareLocalBasemap({ file, extent }) {
  if (!file?.size) throw new Error('请选择一个非空的底图文件。')
  const format = basemapFormat(file.name)
  if (format === 'geotiff') return prepareGeoTiff(file)
  if (format === 'image') return prepareImage(file, extent)
  throw new Error('请选择 GeoTIFF、PNG、JPG 或 WebP 文件。')
}

async function accessStore(mode, action) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('grid-observation-local-basemap', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode)
      const request = action(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export const readLocalBasemap = () => accessStore('readonly', (store) => store.get(storedKey))
export const saveLocalBasemap = (record) => accessStore('readwrite', (store) => store.put(record, storedKey))
export const removeLocalBasemap = () => accessStore('readwrite', (store) => store.delete(storedKey))
