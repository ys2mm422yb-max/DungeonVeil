import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';

const sourceRoot = process.argv[2] ?? 'artifacts/dungeon-rpg/test-results';
const outputRoot = process.argv[3] ?? 'artifacts/dungeon-rpg/review-media';
const screenshotRoot = join(outputRoot, 'screenshots');
const videoRoot = join(outputRoot, 'videos');
const MAX_REVIEW_VIDEO_BYTES = 250 * 1024 * 1024;

async function walk(root) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else files.push(path);
    }
  }
  await visit(root);
  return files;
}

function hashFile(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function safeName(path, index) {
  const rel = relative(sourceRoot, path).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${String(index + 1).padStart(3, '0')}-${rel}`;
}

await mkdir(screenshotRoot, { recursive: true });
await mkdir(videoRoot, { recursive: true });

const files = await walk(sourceRoot);
const screenshots = files.filter(path => extname(path).toLowerCase() === '.png').sort();
const videos = files.filter(path => extname(path).toLowerCase() === '.webm').sort();

const screenshotManifest = [];
let totalScreenshotBytes = 0;
for (const [index, path] of screenshots.entries()) {
  const output = join(screenshotRoot, safeName(path, index));
  await mkdir(dirname(output), { recursive: true });
  await cp(path, output);
  const bytes = (await stat(path)).size;
  totalScreenshotBytes += bytes;
  screenshotManifest.push({
    source: relative(sourceRoot, path),
    review: relative(outputRoot, output),
    sha256: await hashFile(path),
    bytes,
  });
}

const seenVideoHashes = new Set();
const videoManifest = [];
let totalReviewVideoBytes = 0;
for (const path of videos) {
  const sha256 = await hashFile(path);
  if (seenVideoHashes.has(sha256)) continue;
  seenVideoHashes.add(sha256);
  const index = videoManifest.length;
  const output = join(videoRoot, safeName(path, index));
  await mkdir(dirname(output), { recursive: true });
  await cp(path, output);
  const bytes = (await stat(output)).size;
  totalReviewVideoBytes += bytes;
  videoManifest.push({
    source: relative(sourceRoot, path),
    review: relative(outputRoot, output),
    sourceSha256: sha256,
    sourceBytes: bytes,
    reviewBytes: bytes,
  });
}

if (totalReviewVideoBytes > MAX_REVIEW_VIDEO_BYTES) {
  throw new Error(`Review video budget exceeded: ${totalReviewVideoBytes} bytes > ${MAX_REVIEW_VIDEO_BYTES} bytes. Reduce recorded scenarios or video dimensions.`);
}

const manifest = {
  sourceRoot,
  screenshots: screenshotManifest,
  videos: videoManifest,
  screenshotCount: screenshotManifest.length,
  sourceVideoCount: videos.length,
  distinctVideoCount: videoManifest.length,
  totalScreenshotBytes,
  totalReviewVideoBytes,
  maxReviewVideoBytes: MAX_REVIEW_VIDEO_BYTES,
};
await writeFile(join(outputRoot, 'review-media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.screenshotCount} screenshots (${totalScreenshotBytes} bytes) and ${manifest.distinctVideoCount}/${manifest.sourceVideoCount} distinct review videos (${totalReviewVideoBytes} bytes).`);
