import { randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../shared/errors.mjs';
import { isMonth, validateGeoJson } from '../shared/geojson.mjs';

export const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
export const defaultDataDirectory = join(projectDirectory, 'data', 'months');
const demoDirectory = join(projectDirectory, 'public', 'demo', 'months');
const fileExtension = '.geojson';

export function getDataDirectory(environment = process.env) {
  const directory = environment.DATA_DIR?.trim();
  return directory ? resolve(projectDirectory, directory) : defaultDataDirectory;
}

async function listMonths(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(fileExtension))
    .map((entry) => entry.name.slice(0, -fileExtension.length))
    .filter(isMonth)
    .sort()
    .reverse();
}

export async function getMonthSource(dataDirectory) {
  const months = await listMonths(dataDirectory);
  if (months.length > 0) return { demo: false, directory: dataDirectory, months };
  return { demo: true, directory: demoDirectory, months: await listMonths(demoDirectory) };
}

export function staticMonthUrl(month, demo) {
  return `${demo ? 'demo' : 'data'}/months/${month}.geojson`;
}

export async function createCatalog(source, monthUrl = staticMonthUrl) {
  const months = [];
  for (const month of source.months) {
    const file = join(source.directory, `${month}.geojson`);
    try {
      const geojson = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
      months.push({ month, count: validateGeoJson(geojson), url: monthUrl(month, source.demo) });
    } catch (error) {
      throw new Error(`无法读取月度数据 ${file}。${error.message}`, { cause: error });
    }
  }
  return { demo: source.demo, months };
}

export async function publishMonthLocally(directory, month, bytes) {
  await mkdir(directory, { recursive: true });
  const target = join(directory, `${month}.geojson`);
  const temporary = join(directory, `.${month}.${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx');
  try {
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }

    // A hard link makes the complete file visible atomically and fails if the month already exists.
    await link(temporary, target);
  } catch (error) {
    if (error.code === 'EEXIST') throw new HttpError(409, '该月份已经发布。');
    throw error;
  } finally {
    await unlink(temporary).catch((error) => console.error('无法清理发布临时文件。', error));
  }
}
