import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve } from 'node:path';

const INDEPENDENT_NESTED_ARTIFACT_DIR_PREFIXES = [
  'runtime-monitor-negative-probe-',
];

function parseArgs(argv) {
  const args = [...argv];
  let maxMb = null;
  let label = 'artifact';
  let manifestPath = null;
  let fileManifestPath = null;
  const paths = [];

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--max-mb') {
      maxMb = Number(args.shift());
      continue;
    }
    if (arg === '--label') {
      label = String(args.shift() ?? label);
      continue;
    }
    if (arg === '--manifest') {
      manifestPath = args.shift();
      if (!manifestPath) throw new Error('--manifest requires an output path.');
      continue;
    }
    if (arg === '--file-manifest') {
      fileManifestPath = args.shift();
      if (!fileManifestPath) throw new Error('--file-manifest requires an input path.');
      continue;
    }
    paths.push(arg);
  }

  if (!Number.isFinite(maxMb) || maxMb <= 0) {
    throw new Error('Usage: node assert-artifact-budget.mjs --max-mb <positive number> [--label <name>] <path...>');
  }
  if (paths.length === 0 && !fileManifestPath) {
    throw new Error('At least one file/directory path or --file-manifest is required.');
  }

  return { maxBytes: Math.floor(maxMb * 1024 * 1024), maxMb, label, manifestPath, fileManifestPath, paths };
}

function isIndependentNestedArtifactDirectory(name) {
  return INDEPENDENT_NESTED_ARTIFACT_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function collectFiles(inputPath, files, missing, skippedIndependentArtifacts) {
  const absolute = resolve(inputPath);
  let metadata;
  try {
    metadata = await stat(absolute);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      missing.push(inputPath);
      return;
    }
    throw error;
  }

  if (metadata.isDirectory()) {
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const childPath = `${absolute}/${entry.name}`;
      // Product Autopilot packages the runtime-monitor negative probe as its own
      // independently budgeted/uploaded artifact before measuring the parent success
      // evidence. Do not charge that nested artifact a second time when a parent
      // directory is budgeted. Passing the probe directory itself still measures every
      // file inside it, so its dedicated fail-closed budget is unchanged.
      if (entry.isDirectory() && isIndependentNestedArtifactDirectory(entry.name)) {
        skippedIndependentArtifacts.push(childPath);
        continue;
      }
      await collectFiles(childPath, files, missing, skippedIndependentArtifacts);
    }
    return;
  }

  if (metadata.isFile()) {
    files.push({ path: await realpath(absolute), bytes: metadata.size });
  }
}

function isInside(root, candidate) {
  const candidateRelative = relative(root, candidate);
  return candidateRelative !== '' && !candidateRelative.startsWith('../') && candidateRelative !== '..';
}

async function collectManifestFiles(inputManifestPath, files) {
  const absoluteManifestPath = resolve(inputManifestPath);
  const manifestRoot = dirname(absoluteManifestPath);
  const manifestRootReal = await realpath(manifestRoot);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(absoluteManifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid evidence file manifest ${inputManifestPath}: ${error.message}`);
  }
  if (manifest?.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error(`Evidence file manifest ${inputManifestPath} must be version 1 with a non-empty files array.`);
  }

  const seenPaths = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || entry.path.length === 0 || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) {
      throw new Error(`Evidence file manifest ${inputManifestPath} has an invalid file entry.`);
    }
    if (seenPaths.has(entry.path)) {
      throw new Error(`Evidence file manifest ${inputManifestPath} repeats path ${entry.path}.`);
    }
    seenPaths.add(entry.path);

    const candidate = resolve(manifestRoot, entry.path);
    if (!isInside(manifestRoot, candidate)) {
      throw new Error(`Evidence file manifest path escapes its root: ${entry.path}`);
    }
    const linkMetadata = await lstat(candidate);
    if (linkMetadata.isSymbolicLink()) {
      throw new Error(`Evidence file manifest entry must not be a symbolic link: ${entry.path}`);
    }
    const candidateReal = await realpath(candidate);
    if (!isInside(manifestRootReal, candidateReal)) {
      throw new Error(`Evidence file manifest path resolves outside its root: ${entry.path}`);
    }
    const metadata = await stat(candidateReal);
    if (!metadata.isFile()) {
      throw new Error(`Evidence file manifest entry is not a regular file: ${entry.path}`);
    }
    if (metadata.size !== entry.bytes) {
      throw new Error(`Evidence file manifest byte count drifted for ${entry.path}: ${metadata.size} != ${entry.bytes}.`);
    }
    const sha256 = createHash('sha256').update(await readFile(candidateReal)).digest('hex');
    if (sha256 !== entry.sha256) {
      throw new Error(`Evidence file manifest SHA-256 drifted for ${entry.path}.`);
    }
    files.push({ path: candidateReal, bytes: metadata.size });
  }
  return absoluteManifestPath;
}

function budgetClass(filePath) {
  const name = basename(filePath).toLowerCase();
  if (name === 'full-game-results.json') return 'playwright-result-report';
  if (name.startsWith('product-evidence-file-manifest-')) return 'curated-evidence-manifest';
  if (name.endsWith('.trace.json') || name.endsWith('.trace.zip')) return 'trace';
  const extension = extname(name);
  if (extension === '.png') return 'png';
  if (extension === '.webm' || extension === '.mp4') return 'video';
  if (extension === '.log') return 'log';
  if (extension === '.json') return 'json';
  return extension ? extension.slice(1) : 'other';
}

function displayPath(filePath) {
  const candidate = relative(process.cwd(), filePath).split('\\').join('/');
  return candidate && !candidate.startsWith('../') ? candidate : filePath;
}

const { maxBytes, maxMb, label, manifestPath, fileManifestPath, paths } = parseArgs(process.argv.slice(2));
const files = [];
const missing = [];
const skippedIndependentArtifacts = [];
let validatedFileManifest = null;
if (fileManifestPath) {
  validatedFileManifest = await collectManifestFiles(fileManifestPath, files);
}
for (const inputPath of paths) {
  await collectFiles(inputPath, files, missing, skippedIndependentArtifacts);
}

if (files.length === 0) {
  throw new Error(`${label}: no files found in ${paths.join(', ')}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
}

const uniqueFiles = [...new Map(files.map(file => [file.path, file])).values()];
const totalBytes = uniqueFiles.reduce((sum, file) => sum + file.bytes, 0);
const totalMiB = totalBytes / 1024 / 1024;
const inventory = uniqueFiles
  .map(file => ({ path: displayPath(file.path), bytes: file.bytes, class: budgetClass(file.path) }))
  .sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
const totalsByClass = new Map();
for (const file of inventory) {
  const aggregate = totalsByClass.get(file.class) ?? { class: file.class, fileCount: 0, totalBytes: 0 };
  aggregate.fileCount += 1;
  aggregate.totalBytes += file.bytes;
  totalsByClass.set(file.class, aggregate);
}
const classTotals = [...totalsByClass.values()]
  .map(entry => ({ ...entry, totalMiB: Number((entry.totalBytes / 1024 / 1024).toFixed(2)) }))
  .sort((left, right) => right.totalBytes - left.totalBytes || left.class.localeCompare(right.class));
const result = {
  label,
  fileCount: uniqueFiles.length,
  totalBytes,
  totalMiB: Number(totalMiB.toFixed(2)),
  maxBytes,
  maxMiB: maxMb,
  missingPaths: missing,
  skippedIndependentArtifacts,
  validatedFileManifest,
};

const diagnostic = {
  version: 1,
  ...result,
  classTotals,
  files: inventory,
};
if (manifestPath) {
  await writeFile(resolve(manifestPath), `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  ...result,
  classTotals,
  largestFiles: inventory.slice(0, 20),
  manifestPath: manifestPath ?? null,
}, null, 2));
if (totalBytes > maxBytes) {
  throw new Error(`${label} exceeds its budget: ${totalMiB.toFixed(2)} MiB > ${maxMb} MiB.`);
}
