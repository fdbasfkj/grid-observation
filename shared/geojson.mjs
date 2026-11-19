export const maxUploadBytes = 15 * 1024 * 1024;
const monthPattern = /^[0-9]{4}-(?:0[1-9]|1[0-2])$/;
const supportedCrsName = /^(?:EPSG:4326|(?:OGC:)?CRS84|urn:ogc:def:crs:(?:EPSG:[^:]*:4326|OGC:[^:]*:CRS84)|https?:\/\/www\.opengis\.net\/def\/crs\/(?:EPSG\/[^/]+\/4326|OGC\/[^/]+\/CRS84))$/i;

export function isMonth(month) {
  return typeof month === 'string' && month.length === 7 && monthPattern.test(month);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasSupportedCrs(crs) {
  return crs == null || (crs.type === 'name' && typeof crs.properties?.name === 'string' && supportedCrsName.test(crs.properties.name));
}

function isPosition(position) {
  return Array.isArray(position) && position.length >= 2 && position.every(Number.isFinite)
    && Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90;
}

function isLinearRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) return false;
  const first = ring[0];
  const last = ring.at(-1);
  if (first.length !== last.length || !first.every((value, index) => value === last[index])) return false;

  const distinctVertices = new Set();
  for (const [longitude, latitude] of ring) {
    distinctVertices.add(`${longitude},${latitude}`);
    if (distinctVertices.size === 3) return true;
  }
  return false;
}

function isPolygon(coordinates) {
  return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(isLinearRing);
}

export function validateGeoJson(geojson) {
  if (!isRecord(geojson) || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('请选择包含 FeatureCollection 的 GeoJSON 文件。');
  }
  if (geojson.features.length === 0) throw new Error('GeoJSON 至少需要一个要素。');
  if (!hasSupportedCrs(geojson.crs)) throw new Error('GeoJSON 坐标必须使用 WGS 84 经纬度。');

  const ids = new Set();
  for (const [index, feature] of geojson.features.entries()) {
    const featureLabel = `第 ${index + 1} 个要素`;
    if (!isRecord(feature) || feature.type !== 'Feature') {
      throw new Error(`${featureLabel}必须为 GeoJSON Feature。`);
    }
    if (feature.properties !== null && !isRecord(feature.properties)) {
      throw new Error(`${featureLabel}的 properties 必须为对象或 null。`);
    }
    if ('id' in feature) {
      if (typeof feature.id !== 'string' && !Number.isFinite(feature.id)) {
        throw new Error(`${featureLabel}的 id 必须为字符串或数字。`);
      }
      if (ids.has(feature.id)) throw new Error(`${featureLabel}的 id 重复。`);
      ids.add(feature.id);
    }

    const { geometry } = feature;
    if (geometry?.type !== 'Polygon' && geometry?.type !== 'MultiPolygon') {
      throw new Error(`${featureLabel}必须使用 Polygon 或 MultiPolygon 几何。`);
    }
    if (!hasSupportedCrs(feature.crs) || !hasSupportedCrs(geometry.crs)) {
      throw new Error(`${featureLabel}的坐标必须使用 WGS 84 经纬度。`);
    }
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    if (!Array.isArray(polygons) || polygons.length === 0 || !polygons.every(isPolygon)) {
      throw new Error(`${featureLabel}含无效的经纬度或多边形环。请检查环是否闭合并至少包含三个不同的顶点。`);
    }
  }
  return geojson.features.length;
}
