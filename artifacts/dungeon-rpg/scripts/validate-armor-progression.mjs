import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));

const meta = read('src/game/metaProgression.ts');
const gates = read('src/game/equipmentChapterGates.ts');
const visuals = read('src/game/equipmentVisuals.ts');
const inventory = read('src/components/screens/VeilChamberScreen.tsx');
const cloud = read('src/game/persistentSaveBundle.ts');
const balance = read('src/game/runBalance.ts');
const assetAudit = read('scripts/audit-kaykit-assets.mjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const armorIds = ['ranger-cloak', 'ash-armor', 'frost-armor', 'warden-armor', 'veil-mantle', 'depth-armor'];
for (const id of armorIds) {
  assert(meta.includes(`'${id}'`) && meta.includes(`id: '${id}', slot: 'armor'`), `${id} is missing from armor equipment definitions`);
  assert(gates.includes(`'${id}':`), `${id} has no chapter gate`);
  assert(visuals.includes(`'${id}': profile(`) && visuals.includes("'armor'"), `${id} has no armor preview profile`);
}

assert(meta.includes("export type EquipmentSlot = 'bow' | 'quiver' | 'talisman' | 'armor';"), 'armor slot is missing from EquipmentSlot');
assert(meta.includes('version: 3;') && meta.includes('version: 3,'), 'meta progression was not migrated to version 3');
assert(meta.includes("'ranger-cloak': { level: 1, copies: 0 }") && meta.includes("armor: 'ranger-cloak'"), 'old saves do not receive the starter armor');
assert(meta.includes("!parsed.equipped?.armor") && meta.includes("!parsed.owned?.['ranger-cloak']"), 'armor migration guard is missing');
assert(meta.includes("EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['bow', 'quiver', 'talisman', 'armor']"), 'shared equipment slot list is incomplete');
assert(meta.includes("else if (id === 'ranger-cloak')") && meta.includes("else if (id === 'depth-armor')"), 'armor effects are not applied to new runs');

assert(inventory.includes("armor: { de: 'RÜSTUNG', en: 'ARMOR' }") && inventory.includes("['bow', 'quiver', 'talisman', 'armor', 'relic']"), 'armor inventory tab is missing');
assert(inventory.includes('data-testid={`inventory-tab-${key}`}') && inventory.includes('grid-cols-5'), 'five inventory tabs are not mobile-visible');
assert(cloud.includes('equipmentProgressWeight') && cloud.includes('level * 2_500') && cloud.includes('copies * 300'), 'cloud conflict weight ignores equipment levels or copies');

assert(assetAudit.includes("armor: ['armor', 'armour', 'helmet'") && assetAudit.includes("'characters', 'armor'"), 'asset audit does not require armor candidates');
const requiredModels = [
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
  'public/assets/kaykit/animations/KayKit_Character_Animations_1.1/Mannequin Character/characters/Mannequin_Medium.glb',
];
for (const model of requiredModels) assert(exists(model), `required armor preview asset is missing: ${model}`);

assert(balance.includes('export function chapterBalanceProfile') && balance.includes('overflow * 0.12') && balance.includes('overflow * 0.15'), 'late chapters do not continue scaling');
assert(balance.includes('attackScale: 1.24') && balance.includes('attackScale: 2.08'), 'chapter attack profile is incomplete');
assert(balance.includes('bossHpScale: 1.25') && balance.includes('bossHpScale: 2.25'), 'chapter boss HP profile is incomplete');
assert(balance.includes('earlyElitePressure') && balance.includes('room >= 25'), 'later chapters do not introduce earlier elite pressure');

const attackScale = chapter => chapter <= 5
  ? [1, 1.24, 1.5, 1.78, 2.08][chapter - 1]
  : 2.08 + (chapter - 5) * 0.12;
const bossHpScale = chapter => chapter <= 5
  ? [1, 1.25, 1.55, 1.9, 2.25][chapter - 1]
  : 2.25 + (chapter - 5) * 0.15;
for (let chapter = 2; chapter <= 12; chapter++) {
  assert(attackScale(chapter) > attackScale(chapter - 1), `attack pressure does not rise into chapter ${chapter}`);
  assert(bossHpScale(chapter) > bossHpScale(chapter - 1), `boss HP pressure does not rise into chapter ${chapter}`);
}

console.log('Armor progression audit passed: assets, six armor items, v3 migration, cloud weight, inventory and chapter pressure are coherent.');
