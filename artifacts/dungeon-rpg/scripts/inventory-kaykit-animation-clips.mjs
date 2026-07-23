import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rigRoot = path.join(root, 'public/assets/kaykit/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium');
const packs = [
  ['general', 'Rig_Medium_General.glb'],
  ['movementBasic', 'Rig_Medium_MovementBasic.glb'],
  ['movementAdvanced', 'Rig_Medium_MovementAdvanced.glb'],
  ['combatMelee', 'Rig_Medium_CombatMelee.glb'],
  ['combatRanged', 'Rig_Medium_CombatRanged.glb'],
  ['special', 'Rig_Medium_Special.glb'],
];

function glbJson(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 20 || buffer.subarray(0, 4).toString('ascii') !== 'glTF') {
    throw new Error(`${path.basename(file)} is not a GLB file`);
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error(`${path.basename(file)} has a truncated GLB chunk`);
    if (type === 0x4e4f534a) {
      return JSON.parse(buffer.subarray(start, end).toString('utf8').replace(/\0+$/g, '').trim());
    }
    offset = end;
  }
  throw new Error(`${path.basename(file)} has no JSON chunk`);
}

function outputPathFromArgs(args) {
  const index = args.indexOf('--out');
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error('--out requires a file path');
  return path.resolve(process.cwd(), value);
}

const inventory = {};
for (const [key, filename] of packs) {
  const json = glbJson(path.join(rigRoot, filename));
  const clips = (json.animations ?? [])
    .map(animation => String(animation?.name ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  if (!clips.length) throw new Error(`${filename} contains no named animations`);
  inventory[key] = { file: filename, clipCount: clips.length, clips };
}

console.log('KayKit Rig_Medium animation clip inventory:');
for (const [key, entry] of Object.entries(inventory)) {
  console.log(`\n[${key}] ${entry.file} (${entry.clipCount})`);
  entry.clips.forEach(clip => console.log(`  - ${clip}`));
}

const outputPath = outputPathFromArgs(process.argv.slice(2));
if (outputPath) {
  const enemySourcePath = path.join(root, 'src/components/kaykitEnemyBase3D.ts');
  const diagnosticSource = fs.readFileSync(enemySourcePath, 'utf8');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    packs: inventory,
    diagnosticSource: {
      path: 'src/components/kaykitEnemyBase3D.ts',
      sha256: await import('node:crypto').then(({ createHash }) => createHash('sha256').update(diagnosticSource).digest('hex')),
      content: diagnosticSource,
    },
  }, null, 2)}\n`);
  console.log(`\nWrote KayKit animation inventory to ${outputPath}`);
}

console.log(`\nKAYKIT_ANIMATION_INVENTORY_JSON=${JSON.stringify(inventory)}`);
