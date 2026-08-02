import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

const REQUIRED_PROJECTS = [
  'android-chromium',
  'iphone-webkit',
  'ipad-portrait-webkit',
  'android-tablet-chromium',
];
const REQUIRED_ROOM_SAMPLES = [1, 10, 20];
const REQUIRED_SURFACES = ['room', 'inventory'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const manifestArg = process.argv.find((arg) => arg.startsWith('--manifest='));
if (!manifestArg) {
  console.error('ROOMS 1-20 VISUAL EVIDENCE FAILED: pass --manifest=<path>.');
  process.exit(1);
}

const manifestPath = resolve(process.cwd(), manifestArg.slice('--manifest='.length));
if (!existsSync(manifestPath)) {
  console.error(`ROOMS 1-20 VISUAL EVIDENCE FAILED: manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifestRoot = dirname(manifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.retries !== 0) {
  throw new Error(`Expected retries=0, received ${manifest.retries}`);
}
if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
  throw new Error('Manifest must contain a non-empty entries array.');
}

const seenHashes = new Map();
const coverage = new Map(REQUIRED_PROJECTS.map((project) => [project, { rooms: new Set(), surfaces: new Set() }]));

for (const entry of manifest.entries) {
  if (!REQUIRED_PROJECTS.includes(entry.project)) {
    throw new Error(`Unsupported project in evidence manifest: ${entry.project}`);
  }
  if (!REQUIRED_SURFACES.includes(entry.surface)) {
    throw new Error(`Unsupported evidence surface: ${entry.surface}`);
  }
  if (entry.surface === 'room' && !Number.isInteger(entry.room)) {
    throw new Error(`Room evidence requires an integer room number: ${JSON.stringify(entry)}`);
  }
  if (typeof entry.file !== 'string' || entry.file.length === 0) {
    throw new Error(`Evidence entry requires a non-empty relative file path: ${JSON.stringify(entry)}`);
  }

  const filePath = resolve(manifestRoot, entry.file);
  const relativePath = relative(manifestRoot, filePath);
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`Evidence file must stay inside the manifest directory: ${entry.file}`);
  }
  if (extname(filePath).toLowerCase() !== '.png') {
    throw new Error(`Evidence file must be a PNG: ${entry.file}`);
  }
  if (!existsSync(filePath)) throw new Error(`Evidence file missing: ${filePath}`);
  const bytes = statSync(filePath).size;
  if (bytes <= 0 || bytes > MAX_FILE_BYTES) {
    throw new Error(`Evidence file outside compact budget (${bytes} bytes): ${filePath}`);
  }

  const contents = readFileSync(filePath);
  if (contents.length < PNG_SIGNATURE.length || !contents.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Evidence file is not a decodable PNG candidate: ${entry.file}`);
  }

  const hash = createHash('sha256').update(contents).digest('hex');
  if (entry.sha256 && entry.sha256 !== hash) {
    throw new Error(`SHA-256 mismatch for ${entry.file}: expected ${entry.sha256}, got ${hash}`);
  }
  const duplicate = seenHashes.get(hash);
  if (duplicate) {
    throw new Error(`Hash-duplicate evidence is not allowed: ${duplicate} and ${entry.file}`);
  }
  seenHashes.set(hash, entry.file);

  const projectCoverage = coverage.get(entry.project);
  projectCoverage.surfaces.add(entry.surface);
  if (entry.surface === 'room') projectCoverage.rooms.add(entry.room);
}

for (const [project, projectCoverage] of coverage) {
  for (const surface of REQUIRED_SURFACES) {
    if (!projectCoverage.surfaces.has(surface)) {
      throw new Error(`${project} is missing ${surface} evidence.`);
    }
  }
  for (const room of REQUIRED_ROOM_SAMPLES) {
    if (!projectCoverage.rooms.has(room)) {
      throw new Error(`${project} is missing representative room ${room} evidence.`);
    }
  }
}

console.log(`Rooms 1-20 mobile visual evidence contract passed: ${manifest.entries.length} unique compact PNG files across ${REQUIRED_PROJECTS.length} portrait projects.`);
