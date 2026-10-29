import { readFile, writeFile } from 'node:fs/promises';
import { deflateSync, inflateSync, constants as zlibConstants } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function parsePng(bytes) {
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG signature');
  }
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('Truncated PNG chunk header');
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('Truncated PNG chunk payload');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(bytes.subarray(offset + 4, offset + 8 + length));
    if (actualCrc !== expectedCrc) throw new Error(`Invalid PNG ${type} CRC`);
    chunks.push({ type, data });
    offset = end;
    if (type === 'IEND' && offset !== bytes.length) throw new Error('Trailing bytes after PNG IEND');
  }
  if (chunks[0]?.type !== 'IHDR' || chunks.at(-1)?.type !== 'IEND') {
    throw new Error('PNG must contain ordered IHDR and IEND chunks');
  }
  if (!chunks.some(chunk => chunk.type === 'IDAT')) throw new Error('PNG has no IDAT payload');
  return chunks;
}

export function recompressPngIdat(bytes) {
  const chunks = parsePng(bytes);
  const filteredScanlines = inflateSync(Buffer.concat(
    chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data),
  ));
  const compressed = deflateSync(filteredScanlines, {
    level: 9,
    memLevel: 9,
    strategy: zlibConstants.Z_FILTERED,
  });
  const output = [PNG_SIGNATURE];
  let wroteIdat = false;
  for (const chunk of chunks) {
    if (chunk.type === 'IDAT') {
      if (!wroteIdat) output.push(pngChunk('IDAT', compressed));
      wroteIdat = true;
      continue;
    }
    output.push(pngChunk(chunk.type, chunk.data));
  }
  return Buffer.concat(output);
}

async function selfTest() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(512, 0);
  ihdr.writeUInt32BE(256, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanline = Buffer.concat([Buffer.from([1]), Buffer.alloc(512 * 4, 0x33)]);
  const filteredScanlines = Buffer.concat(Array.from({ length: 256 }, () => scanline));
  const deliberatelyLoose = deflateSync(filteredScanlines, { level: 1 });
  const source = Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('tEXt', Buffer.from('contract\0preserved')),
    pngChunk('IDAT', deliberatelyLoose.subarray(0, Math.floor(deliberatelyLoose.length / 2))),
    pngChunk('IDAT', deliberatelyLoose.subarray(Math.floor(deliberatelyLoose.length / 2))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  const first = recompressPngIdat(source);
  const second = recompressPngIdat(source);
  if (!first.equals(second)) throw new Error('PNG IDAT recompression is not deterministic');
  if (first.length >= source.length) throw new Error('PNG IDAT recompression did not reduce the loose fixture');
  const outputChunks = parsePng(first);
  if (outputChunks.filter(chunk => chunk.type === 'IDAT').length !== 1) {
    throw new Error('PNG IDAT recompression did not create one canonical payload');
  }
  if (!outputChunks.some(chunk => chunk.type === 'tEXt' && chunk.data.equals(Buffer.from('contract\0preserved')))) {
    throw new Error('PNG IDAT recompression dropped ancillary metadata');
  }
  const roundTrip = inflateSync(Buffer.concat(outputChunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data)));
  if (!roundTrip.equals(filteredScanlines)) throw new Error('PNG IDAT recompression changed filtered scanlines');
  console.log(`PNG IDAT recompression self-test passed: ${source.length} -> ${first.length} bytes.`);
}

const [inputPath, outputPath] = process.argv.slice(2);
if (inputPath === '--self-test') {
  await selfTest();
} else {
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node recompress-png-idat.mjs <input.png> <output.png>');
  }
  const input = await readFile(inputPath);
  const output = recompressPngIdat(input);
  await writeFile(outputPath, output);
}
