import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projects = ['android-chromium', 'iphone-webkit', 'ipad-portrait-webkit', 'android-tablet-chromium'];
const root = mkdtempSync(join(tmpdir(), 'dungeon-veil-rooms-visual-'));
const entries = [];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let index = 0;

function runValidator(validator, manifest) {
  return spawnSync(process.execPath, [validator, `--manifest=${manifest}`], { encoding: 'utf8' });
}

try {
  for (const project of projects) {
    for (const room of [1, 10, 20]) {
      const file = `${project}-room-${room}.png`;
      writeFileSync(join(root, file), Buffer.concat([pngSignature, Buffer.from(`fixture-${index++}-${project}-${room}`)]));
      entries.push({ project, surface: 'room', room, file });
    }
    const file = `${project}-inventory.png`;
    writeFileSync(join(root, file), Buffer.concat([pngSignature, Buffer.from(`fixture-${index++}-${project}-inventory`)]));
    entries.push({ project, surface: 'inventory', file });
  }

  const validator = fileURLToPath(new URL('validate-rooms-1-20-mobile-visual-evidence.mjs', import.meta.url));
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({ retries: 0, entries }, null, 2));
  const valid = runValidator(validator, manifest);
  if (valid.status !== 0) throw new Error(valid.stderr || valid.stdout || 'valid fixture failed');

  const duplicate = join(root, 'duplicate.json');
  const duplicateEntries = structuredClone(entries);
  duplicateEntries[1].file = duplicateEntries[0].file;
  writeFileSync(duplicate, JSON.stringify({ retries: 0, entries: duplicateEntries }, null, 2));
  const duplicateResult = runValidator(validator, duplicate);
  if (duplicateResult.status === 0 || !`${duplicateResult.stderr}${duplicateResult.stdout}`.includes('Hash-duplicate evidence')) {
    throw new Error('duplicate-hash fixture was not rejected');
  }

  const invalidPngFile = entries[2].file;
  const originalPng = join(root, invalidPngFile);
  writeFileSync(originalPng, 'not-a-png');
  const invalidPng = join(root, 'invalid-png.json');
  writeFileSync(invalidPng, JSON.stringify({ retries: 0, entries }, null, 2));
  const invalidPngResult = runValidator(validator, invalidPng);
  if (invalidPngResult.status === 0 || !`${invalidPngResult.stderr}${invalidPngResult.stdout}`.includes('not a decodable PNG candidate')) {
    throw new Error('invalid-PNG fixture was not rejected');
  }
  writeFileSync(originalPng, Buffer.concat([pngSignature, Buffer.from('restored-unique-fixture')]));

  const escaped = join(root, 'escaped.json');
  const escapedEntries = structuredClone(entries);
  escapedEntries[0].file = '../outside.png';
  writeFileSync(escaped, JSON.stringify({ retries: 0, entries: escapedEntries }, null, 2));
  const escapedResult = runValidator(validator, escaped);
  if (escapedResult.status === 0 || !`${escapedResult.stderr}${escapedResult.stdout}`.includes('must stay inside the manifest directory')) {
    throw new Error('path-escape fixture was not rejected');
  }

  console.log('Rooms 1-20 mobile visual evidence validator contract passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
