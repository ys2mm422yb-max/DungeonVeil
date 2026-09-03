import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const INCLUDED_PREFIXES = [
  'autopilot-',
  'visual-',
  'visible-prestige-',
  'chapter-evidence-',
  'mobile-resource-upgrade-',
  'companion-damage-feedback-',
  'armor-cloud-restore-painted-',
];
const INCLUDED_EXTENSIONS = new Set(['.png', '.webm', '.mp4']);
const RUNTIME_MONITOR_PROBE_PREFIX = 'runtime-monitor-negative-probe-';
const RUNTIME_MONITOR_PROBE_SUFFIXES = ['.webm', '.trace.zip', '.log'];

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

function evidencePriority(relativePath) {
  if (relativePath.startsWith('companion-damage-feedback-')) return 0;
  if (relativePath.startsWith('visible-prestige-')) return 1;
  return 2;
}

function canonicalEvidencePath(paths) {
  return [...paths].sort((left, right) => {
    const priorityDelta = evidencePriority(left) - evidencePriority(right);
    if (priorityDelta !== 0) return priorityDelta;
    return left.localeCompare(right);
  })[0];
}

function isIncludedEvidence(name) {
  if (name.startsWith(RUNTIME_MONITOR_PROBE_PREFIX)) {
    return RUNTIME_MONITOR_PROBE_SUFFIXES.some((suffix) => name.endsWith(suffix));
  }
  if (!INCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) return false;
  return INCLUDED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

async function collectEntries(rootPath) {
  const names = await fs.readdir(rootPath);
  const entries = [];

  for (const name of names.sort((a, b) => a.localeCompare(b))) {
    if (!isIncludedEvidence(name)) continue;
    const extension = path.extname(name).toLowerCase();

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

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function deduplicateEvidence(rootPath, entries) {
  const duplicateHashes = duplicateHashGroups(entries);
  const removed = [];

  for (const group of duplicateHashes) {
    const keep = canonicalEvidencePath(group.paths);
    for (const duplicatePath of group.paths) {
      if (duplicatePath === keep) continue;
      await fs.unlink(path.join(rootPath, duplicatePath));
      removed.push({ sha256: group.sha256, kept: keep, removed: duplicatePath });
    }
  }

  return removed.sort((a, b) => a.removed.localeCompare(b.removed));
}

async function createManifest(root, outputPath) {
  const rootPath = path.resolve(root);
  let files = await collectEntries(rootPath);
  if (files.length === 0) throw new Error(`No product evidence media found in ${rootPath}`);

  const deduplicatedFiles = await deduplicateEvidence(rootPath, files);
  if (deduplicatedFiles.length > 0) files = await collectEntries(rootPath);

  const duplicateHashes = duplicateHashGroups(files);
  if (duplicateHashes.length > 0) {
    throw new Error(`Product evidence remains SHA-256-duplicated after deterministic deduplication: ${JSON.stringify(duplicateHashes)}`);
  }

  const manifest = {
    version: 1,
    mediaFiles: files.length,
    uniqueMediaFiles: files.length,
    duplicateHashes: [],
    deduplicatedFiles,
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
    await fs.writeFile(path.join(root, 'visible-prestige-device.png'), png);
    await fs.writeFile(path.join(root, 'companion-damage-feedback-device.png'), png);
    await fs.writeFile(path.join(root, 'autopilot-a-device.webm'), Buffer.from('video'));
    await fs.writeFile(path.join(root, 'autopilot-b-device.webm'), Buffer.from('video'));
    await fs.writeFile(path.join(root, 'runtime-monitor-negative-probe-device.webm'), Buffer.from('runtime-probe-video'));
    await fs.writeFile(path.join(root, 'runtime-monitor-negative-probe-device.trace.zip'), Buffer.from('runtime-probe-trace'));
    await fs.writeFile(path.join(root, 'runtime-monitor-negative-probe-device.log'), Buffer.from('runtime-probe-log'));
    const output = path.join(root, 'manifest.json');
    const manifest = await createManifest(root, output);
    const expectedPaths = [
      'autopilot-a-device.webm',
      'companion-damage-feedback-device.png',
      'runtime-monitor-negative-probe-device.log',
      'runtime-monitor-negative-probe-device.trace.zip',
      'runtime-monitor-negative-probe-device.webm',
    ];
    if (manifest.files.map((entry) => entry.path).join(',') !== expectedPaths.join(',')) {
      throw new Error('Manifest deterministic SHA-256 deduplication or runtime-monitor probe coverage is invalid');
    }
    if (manifest.mediaFiles !== 5 || manifest.uniqueMediaFiles !== 5 || manifest.duplicateHashes.length !== 0 || manifest.deduplicatedFiles.length !== 3) {
      throw new Error('Manifest duplicate evidence or runtime-monitor probe coverage was not deterministic');
    }
    const removedPaths = manifest.deduplicatedFiles.map((entry) => entry.removed).sort();
    if (removedPaths.join(',') !== 'autopilot-b-device.webm,visible-prestige-device.png,visual-z-device.png') {
      throw new Error(`Unexpected deterministic deduplication result: ${removedPaths.join(',')}`);
    }
    for (const removedPath of removedPaths) {
      try {
        await fs.access(path.join(root, removedPath));
        throw new Error(`Duplicate evidence still exists after deduplication: ${removedPath}`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    const companionEntry = manifest.files.find((entry) => entry.path === 'companion-damage-feedback-device.png');
    if (!companionEntry || companionEntry.png.width !== 390 || companionEntry.png.height !== 844 || companionEntry.sha256.length !== 64) {
      throw new Error('Companion damage evidence is not manifest-backed with valid PNG metadata');
    }
    const runtimeProbeEntries = manifest.files.filter((entry) => entry.path.startsWith(RUNTIME_MONITOR_PROBE_PREFIX));
    if (runtimeProbeEntries.length !== 3 || runtimeProbeEntries.some((entry) => entry.sha256.length !== 64)) {
      throw new Error('Runtime-monitor negative-probe video, trace and log are not all SHA-256 manifest-backed');
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
  console.log(`Wrote ${manifest.files.length} SHA-256-distinct evidence entries to ${output}`);
}
