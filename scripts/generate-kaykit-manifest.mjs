import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('artifacts/dungeon-rpg/public/assets/kaykit');
const OUT = path.join(ROOT, 'manifest.json');
const PACKS = ['adventurers', 'animations', 'dungeon', 'weapons', 'forest', 'halloween', 'resources', 'skeletons'];
const WEB_EXTENSIONS = new Set(['.gltf', '.glb', '.bin', '.png', '.jpg', '.jpeg', '.webp']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (WEB_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(full);
  }
  return result;
}

const manifest = {
  generatedAt: new Date().toISOString(),
  root: '/assets/kaykit',
  packs: {},
};

for (const pack of PACKS) {
  const packRoot = path.join(ROOT, pack);
  const files = (await walk(packRoot))
    .map(file => path.relative(ROOT, file).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b));

  const models = files.filter(file => /\.(?:gltf|glb)$/i.test(file));
  const textures = files.filter(file => /\.(?:png|jpg|jpeg|webp)$/i.test(file));
  const buffers = files.filter(file => /\.bin$/i.test(file));

  manifest.packs[pack] = {
    fileCount: files.length,
    modelCount: models.length,
    textureCount: textures.length,
    bufferCount: buffers.length,
    files,
    models,
    textures,
    buffers,
  };

  console.log(`${pack.padEnd(14)} ${String(files.length).padStart(4)} files | ${String(models.length).padStart(4)} models`);
}

await fs.writeFile(OUT, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`\nKayKit manifest written: ${OUT}`);
console.log(`Total files: ${Object.values(manifest.packs).reduce((sum, pack) => sum + pack.fileCount, 0)}`);
