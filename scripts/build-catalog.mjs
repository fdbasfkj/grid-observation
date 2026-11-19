import { access, copyFile, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createCatalog, defaultDataDirectory, getMonthSource, projectDirectory } from '../server/months.mjs';

const output = join(projectDirectory, 'dist');

async function verifyOutputPath(path) {
  const actual = await realpath(path).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (actual && relative(path, actual)) throw new Error(`构建输出必须位于 dist 中的原路径。${path}`);
  return actual;
}

async function removeGeneratedPath(path) {
  if (await verifyOutputPath(path)) await rm(path, { recursive: true, force: true });
}

await access(join(output, 'index.html')).catch(() => {
  throw new Error('缺少 dist/index.html。请先运行 Vite 构建。');
});
await verifyOutputPath(output);

const source = await getMonthSource(defaultDataDirectory);
const catalog = await createCatalog(source);
const dataOutput = join(output, 'data');
await mkdir(dataOutput, { recursive: true });
await verifyOutputPath(dataOutput);
await removeGeneratedPath(join(dataOutput, 'months'));
await removeGeneratedPath(join(output, 'demo', 'months'));
if (!source.demo) await removeGeneratedPath(join(output, 'demo', 'catalog.json'));

if (source.months.length > 0) {
  const assets = join(output, source.demo ? 'demo' : 'data');
  await mkdir(assets, { recursive: true });
  await verifyOutputPath(assets);
  const monthsOutput = join(assets, 'months');
  await mkdir(monthsOutput, { recursive: true });
  for (const month of source.months) {
    const fileName = `${month}.geojson`;
    await copyFile(join(source.directory, fileName), join(monthsOutput, fileName));
  }
}

const catalogOutput = join(dataOutput, 'catalog.json');
await verifyOutputPath(catalogOutput);
await writeFile(catalogOutput, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`月度目录已生成，包含 ${catalog.months.length} 个月${catalog.demo ? '演示数据' : '已发布数据'}。`);
