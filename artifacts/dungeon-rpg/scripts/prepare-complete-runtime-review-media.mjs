import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.argv[2] ?? 'artifacts/dungeon-rpg/test-results';
const outputRoot = process.argv[3] ?? 'artifacts/dungeon-rpg/review-media';
const screenshotRoot = join(outputRoot, 'screenshots');
const videoRoot = join(outputRoot, 'videos');

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
  const result = spawnSync('sha256sum', [path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`sha256sum failed for ${path}: ${result.stderr}`);
  return result.stdout.trim().split(/\s+/)[0];
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
for (const [index, path] of screenshots.entries()) {
  const output = join(screenshotRoot, safeName(path, index));
  await mkdir(dirname(output), { recursive: true });
  await cp(path, output);
  screenshotManifest.push({ source: relative(sourceRoot, path), review: relative(outputRoot, output), sha256: hashFile(path), bytes: (await stat(path)).size });
}

const seenVideoHashes = new Set();
const videoManifest = [];
for (const path of videos) {
  const sha256 = hashFile(path);
  if (seenVideoHashes.has(sha256)) continue;
  seenVideoHashes.add(sha256);
  const index = videoManifest.length;
  const output = join(videoRoot, safeName(path, index).replace(/\.webm$/i, '.mp4'));
  const ffmpeg = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', path,
    '-vf', "scale='min(360,iw)':-2,fps=10",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '34', '-pix_fmt', 'yuv420p',
    '-an', '-movflags', '+faststart', output,
  ], { encoding: 'utf8' });
  if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed for ${path}: ${ffmpeg.stderr}`);
  videoManifest.push({
    source: relative(sourceRoot, path),
    review: relative(outputRoot, output),
    sourceSha256: sha256,
    sourceBytes: (await stat(path)).size,
    reviewBytes: (await stat(output)).size,
  });
}

const manifest = {
  sourceRoot,
  screenshots: screenshotManifest,
  videos: videoManifest,
  screenshotCount: screenshotManifest.length,
  sourceVideoCount: videos.length,
  distinctVideoCount: videoManifest.length,
};
await writeFile(join(outputRoot, 'review-media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.screenshotCount} screenshots and ${manifest.distinctVideoCount}/${manifest.sourceVideoCount} distinct review videos.`);
