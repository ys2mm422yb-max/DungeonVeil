// Lossless PNG postprocessing runs only after Playwright has closed its video recordings.
// Preserve every original evidence path, pixel, dimension and attachment count.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { deflateSync, inflateSync } from 'node:zlib';
import { Worker } from 'node:worker_threads';
import { join } from 'node:path';

function pngCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}


function refilterPngScanlines(decoded, width, height, bitDepth, colorType) {
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 })[colorType];
  if (!channels || !width || !height) return null;
  const stride = Math.ceil(width * channels * bitDepth / 8);
  const bpp = Math.max(1, Math.ceil(channels * bitDepth / 8));
  if (decoded.length !== height * (stride + 1)) return null;
  const output = Buffer.alloc(decoded.length);
  let prior = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = decoded[start];
    if (filter > 4) return null;
    const raw = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? raw[x - bpp] : 0;
      const above = prior[x];
      const upperLeft = x >= bpp ? prior[x - bpp] : 0;
      const p = left + above - upperLeft;
      const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
      const paeth = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? ((left + above) >>> 1) : paeth;
      raw[x] = (decoded[start + 1 + x] + predictor) & 255;
    }
    let bestScore = Infinity, bestType = 0, best = null;
    for (let type = 0; type < 5; type++) {
      const candidate = Buffer.alloc(stride);
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const left = x >= bpp ? raw[x - bpp] : 0;
        const above = prior[x];
        const upperLeft = x >= bpp ? prior[x - bpp] : 0;
        const p = left + above - upperLeft;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
        const paeth = a <= b && a <= c ? left : b <= c ? above : upperLeft;
        const predictor = type === 0 ? 0 : type === 1 ? left : type === 2 ? above : type === 3 ? ((left + above) >>> 1) : paeth;
        const value = (raw[x] - predictor + 256) & 255;
        candidate[x] = value;
        score += value < 128 ? value : 256 - value;
      }
      if (score < bestScore) { bestScore = score; bestType = type; best = candidate; }
    }
    output[start] = bestType;
    best.copy(output, start + 1);
    prior = raw;
  }
  return output;
}

// Recompress only PNG IDAT bytes. Keep all non-image chunks, dimensions and
// decoded scanlines identical; on malformed or non-smaller output keep original.
async function recompressPngLosslessly(path) {
  const original = await readFile(path);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!original.subarray(0, 8).equals(signature)) return;
  try {
    const chunks = [];
    const idats = [];
    let offset = 8;
    let ended = false;
    while (offset + 12 <= original.length) {
      const start = offset;
      const length = original.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > original.length) return;
      const type = original.toString('ascii', offset + 4, offset + 8);
      const data = original.subarray(offset + 8, offset + 8 + length);
      const crc = original.readUInt32BE(offset + 8 + length);
      if (pngCrc32(original.subarray(offset + 4, offset + 8 + length)) !== crc) return;
      chunks.push({ type, bytes: original.subarray(start, end) });
      if (type === 'IDAT') idats.push(data);
      offset = end;
      if (type === 'IEND') { ended = true; break; }
    }
    if (!ended || offset !== original.length || idats.length === 0) return;
    const decoded = inflateSync(Buffer.concat(idats));
    const ihdr = chunks.find(chunk => chunk.type === 'IHDR')?.bytes;
    let filtered = null;
    if (ihdr && ihdr.length === 25 && ihdr[20] === 0) {
      filtered = refilterPngScanlines(decoded, ihdr.readUInt32BE(8), ihdr.readUInt32BE(12), ihdr[16], ihdr[17]);
    }
    // Avoid a second full-image refilter pass; final encoded scanlines are verified below.
    const baseline = deflateSync(decoded, { level: 9 });
    const adaptive = filtered ? deflateSync(filtered, { level: 9 }) : null;
    const encoded = adaptive && adaptive.length < baseline.length ? adaptive : baseline;
    const expectedScanlines = encoded === adaptive ? filtered : decoded;
    if (encoded.length >= idats.reduce((sum, data) => sum + data.length, 0)) return;
    const type = Buffer.from('IDAT');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(encoded.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(pngCrc32(Buffer.concat([type, encoded])));
    const replacement = Buffer.concat([length, type, encoded, checksum]);
    const parts = [signature];
    let inserted = false;
    for (const chunk of chunks) {
      if (chunk.type === 'IDAT') {
        if (!inserted) { parts.push(replacement); inserted = true; }
      } else parts.push(chunk.bytes);
    }
    const optimized = Buffer.concat(parts);
    if (optimized.length >= original.length) return;
    if (!inflateSync(encoded).equals(expectedScanlines)) throw new Error('PNG compressed scanline mismatch');
    await writeFile(path, optimized);
  } catch (error) {
    throw new Error(`Lossless PNG evidence validation failed for ${path}: ${error.message}`);
  }
}

// PNG optimization is CPU-heavy. Execute it off the Playwright event loop so
// original screenshot capture and the concurrent reduced-motion transition are
// not starved by PNG row filtering or zlib. Limit worker concurrency to two.
const pngWorkerSource = `
  const { parentPort, workerData } = require('node:worker_threads');
  const { readFile, writeFile } = require('node:fs/promises');
  const { deflateSync, inflateSync } = require('node:zlib');
  ${pngCrc32.toString()}
  ${refilterPngScanlines.toString()}
  ${recompressPngLosslessly.toString()}
  recompressPngLosslessly(workerData.path).then(
    () => parentPort.postMessage({ ok: true }),
    error => parentPort.postMessage({ ok: false, error: String(error) }),
  );
`;

function optimizePngInWorker(path) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(pngWorkerSource, { eval: true, workerData: { path } });
    let settled = false;
    worker.once('message', message => {
      settled = true;
      if (message.ok) resolve();
      else reject(new Error(message.error));
    });
    worker.once('error', error => { settled = true; reject(error); });
    worker.once('exit', code => {
      if (!settled) reject(new Error(`PNG optimization worker exited with code ${code}`));
    });
  });
}


async function collectPngs(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectPngs(path));
    else if (entry.isFile() && entry.name.endsWith('.png')) files.push(path);
  }
  return files.sort();
}
const root = process.argv[2];
if (!root) throw new Error('Usage: node optimize-block20-evidence.mjs <test-results-directory>');
const files = await collectPngs(root);
if (files.length !== 42) throw new Error(`Expected exactly 42 original Block20 PNGs, found ${files.length}`);
let saved = 0;
for (const path of files) {
  const before = (await readFile(path)).length;
  await optimizePngInWorker(path);
  const after = (await readFile(path)).length;
  if (after > before) throw new Error(`Lossless optimization grew evidence: ${path}`);
  saved += before - after;
}
console.log(`[block20-post-video-png] optimized ${files.length} original PNGs after video closure; saved ${saved} bytes`);
