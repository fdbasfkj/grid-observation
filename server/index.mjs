import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HttpError } from '../shared/errors.mjs';
import { isMonth, maxUploadBytes, validateGeoJson } from '../shared/geojson.mjs';
import { publishMonthOnGitHub } from '../shared/github.mjs';
import {
  createCatalog, getDataDirectory, getMonthSource, projectDirectory, publishMonthLocally,
} from './months.mjs';

const uploadSizeMessage = '上传请求不能超过 15 MiB。';
const geoJsonType = 'application/geo+json; charset=utf-8';
const distDirectory = join(projectDirectory, 'dist');
const builtDataPath = /^(?:data|demo)[\\/](?:catalog\.json$|months[\\/])/i;
const staticTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.geojson': geoJsonType,
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function tokenDigest(token) {
  return createHash('sha256').update(token).digest();
}

function appOrigin(value) {
  if (!value?.trim()) return '';
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('APP_ORIGIN 必须为 HTTP 或 HTTPS 来源，例如 https://owner.github.io。');
  }
  return url.origin;
}

function readConfig(environment) {
  const mode = environment.PUBLISH_MODE?.trim() || 'local';
  if (mode !== 'local' && mode !== 'github') throw new Error('PUBLISH_MODE 必须为 local 或 github。');

  const token = environment.PUBLISH_TOKEN?.trim();
  const github = {
    repository: environment.GITHUB_REPO?.trim(),
    branch: environment.GITHUB_BRANCH?.trim(),
    token: environment.GITHUB_PUBLISH_TOKEN?.trim(),
  };
  if (mode === 'github' && github.repository) {
    const validRepository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(github.repository)
      && github.repository.split('/').every((part) => part !== '.' && part !== '..');
    if (!validRepository) throw new Error('GITHUB_REPO 必须为 owner/repo 格式。');
  }
  return {
    allowedOrigin: appOrigin(environment.APP_ORIGIN),
    dataDirectory: getDataDirectory(environment),
    github,
    mode,
    publishEnabled: Boolean(token && (mode === 'local' || (github.repository && github.token))),
    publishTokenDigest: token ? tokenDigest(token) : null,
  };
}

function sendData(response, status, bytes, type) {
  response.writeHead(status, {
    'Content-Type': type,
    'Content-Length': bytes.byteLength,
    'Cache-Control': 'no-cache',
  });
  response.end(bytes);
}

function sendJson(response, status, value) {
  sendData(response, status, Buffer.from(JSON.stringify(value)), 'application/json; charset=utf-8');
}

function setCorsHeaders(request, response, allowedOrigin) {
  response.setHeader('Vary', 'Origin');
  if (allowedOrigin && request.headers.origin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
}

async function readUpload(request) {
  const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new HttpError(415, '发布请求必须使用 application/json。');
  if (Number(request.headers['content-length']) > maxUploadBytes) throw new HttpError(413, uploadSizeMessage);

  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxUploadBytes) throw new HttpError(413, uploadSizeMessage);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, size)));
  } catch {
    throw new HttpError(400, '发布请求不是有效的 JSON。');
  }
}

async function handlePublish(request, response, config) {
  if (!config.publishEnabled) throw new HttpError(503, '发布服务尚未配置。');
  const token = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '')?.[1];
  if (!token || !timingSafeEqual(tokenDigest(token), config.publishTokenDigest)) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    throw new HttpError(401, '发布令牌无效。');
  }

  const upload = await readUpload(request);
  const { month, geojson } = upload ?? {};
  if (!isMonth(month)) {
    throw new HttpError(400, '月份必须采用 YYYY-MM 格式。');
  }
  let count;
  try {
    count = validateGeoJson(geojson);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
  let bytes;
  try {
    bytes = Buffer.from(`${JSON.stringify(geojson)}\n`);
  } catch {
    throw new HttpError(400, 'GeoJSON 的属性结构无法保存。');
  }

  if (config.mode === 'github') {
    const commit = await publishMonthOnGitHub(config.github, month, bytes.toString('base64'));
    sendJson(response, 201, { month, count, mode: config.mode, ...commit });
  } else {
    await publishMonthLocally(config.dataDirectory, month, bytes);
    response.setHeader('Location', `/api/months/${month}`);
    sendJson(response, 201, { month, count, mode: config.mode });
  }
}

async function sendMonth(response, dataDirectory, month, demo) {
  const source = await getMonthSource(dataDirectory);
  if (!source.months.includes(month) || (demo !== undefined && source.demo !== demo)) {
    throw new HttpError(404, '该月份没有可用的数据。');
  }
  const bytes = await readFile(join(source.directory, `${month}.geojson`)).catch((error) => {
    if (error.code === 'ENOENT') throw new HttpError(404, '该月份没有可用的数据。');
    throw error;
  });
  sendData(response, 200, bytes, geoJsonType);
}

function methodNotAllowed(response, methods) {
  response.setHeader('Allow', methods);
  throw new HttpError(405, '此接口不支持当前请求方法。');
}

async function handleApi(request, response, pathname, config) {
  setCorsHeaders(request, response, config.allowedOrigin);
  const month = /^\/api\/months\/([^/]+)$/.exec(pathname)?.[1];
  if (pathname !== '/api/status' && pathname !== '/api/months' && !month) {
    throw new HttpError(404, '接口不存在。');
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
    });
    response.end();
    return;
  }
  if (request.method === 'POST' && pathname === '/api/months') {
    await handlePublish(request, response, config);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    methodNotAllowed(response, pathname === '/api/months' ? 'GET, HEAD, POST, OPTIONS' : 'GET, HEAD, OPTIONS');
  }

  if (pathname === '/api/status') {
    sendJson(response, 200, { publishEnabled: config.publishEnabled, mode: config.mode });
  } else if (pathname === '/api/months') {
    const source = await getMonthSource(config.dataDirectory);
    sendJson(response, 200, await createCatalog(source, (entry) => `/api/months/${entry}`));
  } else if (isMonth(month)) {
    await sendMonth(response, config.dataDirectory, month);
  } else {
    throw new HttpError(404, '该月份没有可用的数据。');
  }
}

async function serveBuiltAsset(response, pathname, useLiveData) {
  const assetPath = pathname === '/' ? '/index.html' : pathname;
  const type = staticTypes[extname(assetPath).toLowerCase()];
  if (!type || /[\\:\0]/.test(assetPath) || assetPath.split('/').some((part) => part.startsWith('.'))) return false;

  try {
    const file = await realpath(resolve(distDirectory, `.${assetPath}`));
    const offset = relative(distDirectory, file);
    if (!offset || offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) return false;
    if (useLiveData && builtDataPath.test(offset)) return false;
    if (!(await stat(file)).isFile()) return false;
    sendData(response, 200, await readFile(file), type);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

async function handleRead(request, response, pathname, config) {
  if (request.method !== 'GET' && request.method !== 'HEAD') methodNotAllowed(response, 'GET, HEAD');
  const useLiveData = config.mode === 'local';
  if (useLiveData) {
    if (pathname === '/data/catalog.json') {
      sendJson(response, 200, await createCatalog(await getMonthSource(config.dataDirectory)));
      return;
    }
    const monthAsset = /^\/(demo|data)\/months\/([^/]+)\.geojson$/.exec(pathname);
    if (monthAsset && isMonth(monthAsset[2])) {
      await sendMonth(response, config.dataDirectory, monthAsset[2], monthAsset[1] === 'demo');
      return;
    }
    if (/^\/(?:demo|data)\/months(?:\/|$)/.test(pathname)) throw new HttpError(404, '该月份没有可用的数据。');
  }
  if (await serveBuiltAsset(response, pathname, useLiveData)) return;
  throw new HttpError(404, '页面或文件不存在。');
}

export function createApplicationServer(environment = process.env) {
  const config = readConfig(environment);
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      } catch {
        throw new HttpError(400, '请求路径无效。');
      }
      if (pathname.startsWith('/api/')) await handleApi(request, response, pathname, config);
      else await handleRead(request, response, pathname, config);
    } catch (error) {
      if (!request.complete) request.resume();
      if (response.destroyed) return;
      if (error instanceof HttpError) sendJson(response, error.status, { error: error.message });
      else {
        console.error('处理请求失败。', error);
        sendJson(response, 500, { error: '服务暂时无法处理请求。' });
      }
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const host = process.env.HOST?.trim() || '127.0.0.1';
  const port = Number(process.env.PORT?.trim() || '8787');
  const server = createApplicationServer();
  server.listen(port, host, () => console.log(`WebGIS 服务已启动 ${host}:${server.address().port}`));
}
