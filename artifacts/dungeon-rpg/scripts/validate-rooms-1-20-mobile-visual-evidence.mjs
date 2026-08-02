import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_PROJECTS = [
  'android-chromium',
  'iphone-webkit',
  'ipad-portrait-webkit',
  'android-tablet-chromium',
];
const REQUIRED_ROOM_SAMPLES = [1, 10, 20];
const REQUIRED_SURFACES = ['room', 'inventory'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

  const filePath = resolve(manifestPath, '..', entry.file);
  if (!existsSync(filePath)) throw new Error(`Evidence file missing: ${filePath}`);
  const bytes = statSync(filePath).size;
  if (bytes <= 0 || bytes > MAX_FILE_BYTES) {
    throw new Error(`Evidence file outside compact budget (${bytes} bytes): ${filePath}`);
  }

  const hash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
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

console.log(`Rooms 1-20 mobile visual evidence contract passed: ${manifest.entries.length} unique compact files across ${REQUIRED_PROJECTS.length} portrait projects.`);
