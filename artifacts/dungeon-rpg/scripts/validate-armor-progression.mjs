import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));

const redesign = read('src/game/equipmentRedesign.ts');
const definitions = read('src/game/equipmentDefinitionsV4.ts');
const armorVisuals = read('src/game/equipmentVisualsArmorV4.ts');
const migration = read('src/game/metaMigrationV4.ts');
const store = read('src/game/metaStoreV4.ts');
const combat = read('src/game/equipmentCombatV4.ts');
const runtime = read('src/game/equipmentRuntimeBalance.ts');
const playerRuntime = read('src/game/equipmentPlayerRuntimeV4.ts');
const preview = read('src/components/KayKitEquipmentPreview.tsx');
const inventory = read('src/components/screens/VeilChamberScreenV4.tsx');
const cloud = read('src/game/persistentSaveBundle.ts');
const bridge = read('src/components/GameSessionBridge.tsx');
const assetAudit = read('scripts/audit-kaykit-assets.mjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const activeArmorIds = ['ranger-cloak', 'ash-armor', 'warden-armor'];
for (const id of activeArmorIds) {
  assert(redesign.includes(`'${id}': {`), `${id} is missing from the active armor catalog`);
  assert(armorVisuals.includes(`'${id}': { id: '${id}', slot: 'armor'`), `${id} has no retained armor visual`);
}

assert(redesign.includes("'ranger-cloak':") && redesign.includes('levels: [{ maxHp: 18 }'), 'Ranger Cloak health progression is missing');
assert(redesign.includes("'ash-armor':") && redesign.includes('{ maxHp: 65, defense: 5 }'), 'Ash Armor hybrid level-five values are missing');
assert(redesign.includes("'warden-armor':") && redesign.includes('{ maxHp: 40, defense: 11 }'), 'Warden Armor tank level-five values are missing');
assert(!/descriptionDe:[^\n]+(?:Angriff|Beweg)/.test(redesign.match(/'ranger-cloak':[\s\S]*?'warden-armor':[\s\S]*?\n\s*},/m)?.[0] ?? ''), 'active armor descriptions expose offensive or movement roles');
assert(redesign.includes("unlockChapter: 8") && redesign.includes("unlockRank: 14"), 'full-tank armor is not a late unlock');

assert(definitions.includes('active: Boolean(active)'), 'active-versus-cosmetic definition flag is missing');
assert(definitions.includes('Legacy-Skin ohne aktive Kampfwerte'), 'legacy armor models are not retained as statless cosmetics');
assert(migration.includes('cosmeticUnlocks') && migration.includes('legacyReplacementFor'), 'legacy armor migration or cosmetic unlocks are missing');
assert(store.includes('version: 4') && store.includes("armor: 'ranger-cloak'"), 'V4 store does not provide the starter armor');
assert(store.includes("ACTIVE_EQUIPMENT_SLOTS") && !store.includes("['bow', 'quiver', 'talisman', 'armor']"), 'active store still treats talismans as a gameplay slot');

assert(combat.includes('defense / (safeDefense + 32)') || combat.includes('safeDefense / (safeDefense + 32)'), 'defense diminishing returns formula is missing');
assert(combat.includes('Math.max(1, Math.round(raw * (1 - defenseMitigation'), 'defense can reduce normal damage to zero');
assert(playerRuntime.includes('bossLike ? 0.44 : 0.52'), 'boss-like damage does not retain a stricter mitigation cap');
assert(runtime.includes('defenseMitigationForValue') && runtime.includes('defenseMitigation(defense, 0.52)'), 'shared defense audit entry point is missing');
assert(bridge.includes('createEquipmentRuntimeBalanceState') && bridge.includes('updateEquipmentRuntimeBalance(engine, equipmentRuntime)'), 'runtime armor balance is not wired into active runs');

assert(inventory.includes("const TABS: ChamberTab[] = ['bow', 'quiver', 'armor', 'relic']"), 'four-tab inventory contract is missing');
assert(inventory.includes("armor: { de: 'RÜSTUNG', en: 'ARMOR' }"), 'armor tab label is missing');
assert(!inventory.includes('inventory-tab-talisman'), 'removed artifact slot is still visible');
assert(inventory.includes('equipment-upgrade-preview') && inventory.includes('equipment-upgrade-costs'), 'armor upgrade preview or costs are missing');
assert(cloud.includes('equipmentProgressWeight') && cloud.includes('level * 2_500') && cloud.includes('copies * 300'), 'cloud conflict weight ignores equipment levels or copies');

assert(armorVisuals.includes('/Ranger.glb') && armorVisuals.includes('/Knight.glb') && armorVisuals.includes('/Barbarian.glb'), 'retained armor visuals do not use the approved model family');
assert(preview.includes('AnimationMixer') && preview.includes('chooseIdleClip') && preview.includes('applyFallbackReadyPose'), 'armor preview does not animate or provide a ready-pose fallback');
assert(preview.includes('Rig_Medium_General.glb'), 'armor preview has no KayKit idle animation source');
assert(assetAudit.includes("armor: ['armor', 'armour', 'helmet'") && assetAudit.includes("'characters', 'armor'"), 'asset audit does not require armor candidates');

const requiredModels = [
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
  'public/assets/kaykit/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb',
];
for (const model of requiredModels) assert(exists(model), `required armor preview asset is missing: ${model}`);

console.log('Armor progression audit passed: exactly three active armor roles, diminishing defense, V4 migration, statless legacy cosmetics, cloud weighting and mobile inventory previews are coherent.');
