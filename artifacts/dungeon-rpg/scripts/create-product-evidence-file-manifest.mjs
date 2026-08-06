import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const INCLUDED_PREFIXES = [
  'autopilot-',
  'visual-',
  'chapter-evidence-',
  'mobile-resource-upgrade-',
  'companion-damage-feedback-',
  'armor-cloud-restore-painted-',
];
const INCLUDED_EXTENSIONS = new Set(['.png', '.webm', '.mp4']);

function normalizeRelativePath(root, filePath) {
  const relative = path.relative(root, filePath).split(path.sep).join('/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error(`Evidence path escapes root: ${filePath}`);
  }
  return relative;
}

function pngDimensions(bytes, relativePath) {
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Invalid PNG signature: ${relativePath}`);
  }
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Missing PNG IHDR: ${relativePath}`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function duplicateHashGroups(entries) {
  const pathsByHash = new Map();
  for (const entry of entries) {
    const paths = pathsByHash.get(entry.sha256) ?? [];
    paths.push(entry.path);
    pathsByHash.set(entry.sha256, paths);
  }
  return [...pathsByHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths: paths.sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));
}

async function createManifest(root, outputPath) {
  const rootPath = path.resolve(root);
  const names = await fs.readdir(rootPath);
  const entries = [];

  for (const name of names.sort((a, b) => a.localeCompare(b))) {
    if (!INCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    const extension = path.extname(name).toLowerCase();
    if (!INCLUDED_EXTENSIONS.has(extension)) continue;

    const filePath = path.join(rootPath, name);
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Evidence entry must be a regular file: ${name}`);
    }
    const relativePath = normalizeRelativePath(rootPath, filePath);
    const bytes = await fs.readFile(filePath);
    const entry = {
      path: relativePath,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    if (extension === '.png') entry.png = pngDimensions(bytes, relativePath);
    entries.push(entry);
  }

  if (entries.length === 0) throw new Error(`No product evidence media found in ${rootPath}`);

  const files = entries.sort((a, b) => a.path.localeCompare(b.path));
  const duplicateHashes = duplicateHashGroups(files);
  const manifest = {
    version: 1,
    mediaFiles: files.length,
    uniqueMediaFiles: files.length - duplicateHashes.reduce((count, group) => count + group.paths.length - 1, 0),
    duplicateHashes,
    files,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

async function selfTest() {
  const root = await fs.mkdtemp(path.join(process.cwd(), '.evidence-manifest-self-test-'));
  try {
    const png = Buffer.alloc(24);
    PNG_SIGNATURE.copy(png, 0);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(390, 16);
    png.writeUInt32BE(844, 20);
    await fs.writeFile(path.join(root, 'visual-z-device.png'), png);
    await fs.writeFile(path.join(root, 'companion-damage-feedback-device.png'), png);
    await fs.writeFile(path.join(root, 'autopilot-a-device.webm'), Buffer.from('video'));
    await fs.writeFile(path.join(root, 'autopilot-b-device.webm'), Buffer.from('video'));
    const output = path.join(root, 'manifest.json');
    const manifest = await createManifest(root, output);
    if (manifest.files.map((entry) => entry.path).join(',') !== 'autopilot-a-device.webm,autopilot-b-device.webm,companion-damage-feedback-device.png,visual-z-device.png') {
      throw new Error('Manifest ordering or companion damage inclusion is not deterministic');
    }
    if (manifest.mediaFiles !== 4 || manifest.uniqueMediaFiles !== 2 || manifest.duplicateHashes.length !== 2) {
      throw new Error('Manifest duplicate hash summary is invalid');
    }
    const companionEntry = manifest.files.find((entry) => entry.path === 'companion-damage-feedback-device.png');
    if (!companionEntry || companionEntry.png.width !== 390 || companionEntry.png.height !== 844 || companionEntry.sha256.length !== 64) {
      throw new Error('Companion damage evidence is not manifest-backed with valid PNG metadata');
    }
    await fs.writeFile(path.join(root, 'visual-invalid.png'), Buffer.from('not-png'));
    let rejected = false;
    try {
      await createManifest(root, output);
    } catch (error) {
      rejected = String(error).includes('Invalid PNG signature');
    }
    if (!rejected) throw new Error('Invalid PNG was not rejected');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log('Product evidence file manifest self-test passed.');
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  await selfTest();
} else {
  const root = args[0];
  const output = args[1];
  if (!root || !output) {
    throw new Error('Usage: create-product-evidence-file-manifest.mjs <evidence-root> <output-json>');
  }
  const manifest = await createManifest(root, output);
  console.log(`Wrote ${manifest.files.length} evidence entries to ${output}`);
}
