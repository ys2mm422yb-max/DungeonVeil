import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projects = ['android-chromium', 'iphone-webkit', 'ipad-portrait-webkit', 'android-tablet-chromium'];
const root = mkdtempSync(join(tmpdir(), 'dungeon-veil-rooms-visual-'));
const entries = [];
let index = 0;

try {
  for (const project of projects) {
    for (const room of [1, 10, 20]) {
      const file = `${project}-room-${room}.png`;
      writeFileSync(join(root, file), `fake-png-${index++}-${project}-${room}`);
      entries.push({ project, surface: 'room', room, file });
    }
    const file = `${project}-inventory.png`;
    writeFileSync(join(root, file), `fake-png-${index++}-${project}-inventory`);
    entries.push({ project, surface: 'inventory', file });
  }

  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({ retries: 0, entries }, null, 2));
  const validator = fileURLToPath(new URL('validate-rooms-1-20-mobile-visual-evidence.mjs', import.meta.url));
  const valid = spawnSync(process.execPath, [validator, `--manifest=${manifest}`], { encoding: 'utf8' });
  if (valid.status !== 0) throw new Error(valid.stderr || valid.stdout || 'valid fixture failed');

  const duplicate = join(root, 'duplicate.json');
  const duplicateEntries = structuredClone(entries);
  duplicateEntries[1].file = duplicateEntries[0].file;
  writeFileSync(duplicate, JSON.stringify({ retries: 0, entries: duplicateEntries }, null, 2));
  const invalid = spawnSync(process.execPath, [validator, `--manifest=${duplicate}`], { encoding: 'utf8' });
  if (invalid.status === 0 || !`${invalid.stderr}${invalid.stdout}`.includes('Hash-duplicate evidence')) {
    throw new Error('duplicate-hash fixture was not rejected');
  }

  console.log('Rooms 1-20 mobile visual evidence validator contract passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
