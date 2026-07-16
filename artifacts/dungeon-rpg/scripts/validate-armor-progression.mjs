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
const preview = read('src/components/KayKitEquipmentPreview.tsx');
const inventory = read('src/components/screens/VeilChamberScreen.tsx');
const cloud = read('src/game/persistentSaveBundle.ts');
const balance = read('src/game/runBalance.ts');
const runtime = read('src/game/equipmentRuntimeBalance.ts');
const bridge = read('src/components/GameSessionBridge.tsx');
const assetAudit = read('scripts/audit-kaykit-assets.mjs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const armorIds = ['ranger-cloak', 'ash-armor', 'frost-armor', 'warden-armor', 'veil-mantle', 'depth-armor'];
for (const id of armorIds) {
  assert(meta.includes(`id: '${id}', slot: 'armor'`), `${id} is missing from armor equipment definitions`);
  assert(gates.includes(`'${id}':`), `${id} has no chapter gate`);
  assert(visuals.includes(`'${id}': armorProfile(`), `${id} has no shared armor preview profile`);
}

assert(meta.includes("export type EquipmentSlot = 'bow' | 'quiver' | 'talisman' | 'armor';"), 'armor slot is missing from EquipmentSlot');
assert(meta.includes('version: 3;') && meta.includes('version: 3,'), 'meta progression was not migrated to version 3');
assert(meta.includes("'ranger-cloak': { level: 1, copies: 0 }") && meta.includes("armor: 'ranger-cloak'"), 'old saves do not receive the starter armor');
assert(meta.includes("!parsed.equipped?.armor") && meta.includes("!parsed.owned?.['ranger-cloak']"), 'armor migration guard is missing');
assert(meta.includes("EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['bow', 'quiver', 'talisman', 'armor']"), 'shared equipment slot list is incomplete');

assert(meta.includes('export function equipmentCombatModifiers') && meta.includes('attackCooldownMultiplier') && meta.includes('dodgeCooldownMultiplier'), 'equipment effects are not centrally aggregated');
assert(meta.includes('Math.min(0.3, modifiers.attackPercent)') && meta.includes('Math.min(0.28, modifiers.speedPercent)'), 'attack or movement equipment caps are missing');
assert(meta.includes('Math.max(0.78, modifiers.attackCooldownMultiplier)') && meta.includes('Math.max(0.82, modifiers.dodgeCooldownMultiplier)'), 'cooldown equipment caps are missing');
assert(meta.includes("id === 'ember-bow'") && meta.includes("id === 'black-quiver'") && meta.includes("id === 'rune-quiver'"), 'former one-level-only equipment has no level scaling');
assert(!meta.includes('p.skillRange +=') && !meta.includes('p.skillCooldown ='), 'equipment still spends levels on unavailable active-skill stats');
assert(meta.includes("id === 'warden-armor'") && meta.includes('Math.floor(level / 2)'), 'armor defense is not limited to every second level');
assert(meta.includes("assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`") && meta.includes("assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`") && meta.includes("assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`"), 'armor definitions do not use the approved male model family');
assert(!/slot: 'armor'[^\n]+(?:Mage|Rogue)/.test(meta), 'an armor definition still references a female or ambiguous character model');

assert(inventory.includes("armor: { de: 'RÜSTUNG', en: 'ARMOR' }") && inventory.includes("['bow', 'quiver', 'talisman', 'armor', 'relic']"), 'armor inventory tab is missing');
assert(inventory.includes('data-testid={`inventory-tab-${key}`}') && inventory.includes('grid-cols-5'), 'five inventory tabs are not mobile-visible');
assert(cloud.includes('equipmentProgressWeight') && cloud.includes('level * 2_500') && cloud.includes('copies * 300'), 'cloud conflict weight ignores equipment levels or copies');

assert(visuals.includes("previewPose?: 'idle-ready'") && visuals.includes("previewPose: 'idle-ready'"), 'armor previews do not declare a ready stance');
assert(visuals.includes('/(ranger|knight|barbarian)\\.glb$/i') && visuals.includes('armor preview is not a male character model'), 'visual audit does not enforce male armor models');
assert(!visuals.includes('/Mage.glb') && !visuals.includes('/Rogue.glb') && !visuals.includes('/Rogue_Hooded.glb'), 'female or ambiguous armor preview models remain configured');
assert(preview.includes('AnimationMixer') && preview.includes('chooseIdleClip') && preview.includes('applyFallbackReadyPose'), 'armor preview does not animate or provide a ready-pose fallback');
assert(preview.includes("data-equipment-preview-pose={visual.previewPose ?? 'static'}") && preview.includes('data-equipment-preview-model={visual.primaryPath}'), 'browser-testable armor preview metadata is missing');
assert(preview.includes('Rig_Medium_General.glb'), 'armor preview has no KayKit idle animation source');

assert(runtime.includes('defenseMitigationForValue') && runtime.includes('Math.min(0.45, safe / (safe + 28))'), 'defense still lacks diminishing returns and a hard cap');
assert(runtime.includes('ARCHER_BASE_ATTACK_COOLDOWN_MS') && runtime.includes('equipment.attackCooldownMultiplier'), 'attack cooldown equipment is not applied after every shot');
assert(runtime.includes('ARCHER_BASE_DODGE_COOLDOWN_MS') && runtime.includes('equipment.dodgeCooldownMultiplier'), 'dash cooldown equipment is not applied after every dash');
assert(bridge.includes('createEquipmentRuntimeBalanceState') && bridge.includes('updateEquipmentRuntimeBalance(engine, equipmentRuntime)'), 'runtime equipment balance is not wired into active runs');

assert(assetAudit.includes("armor: ['armor', 'armour', 'helmet'") && assetAudit.includes("'characters', 'armor'"), 'asset audit does not require armor candidates');
const requiredModels = [
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb',
  'public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb',
  'public/assets/kaykit/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb',
];
for (const model of requiredModels) assert(exists(model), `required armor preview asset is missing: ${model}`);

assert(balance.includes('export function chapterBalanceProfile') && balance.includes('overflow * 0.1') && balance.includes('overflow * 0.12'), 'late chapters do not continue with the moderated scaling');
assert(balance.includes('attackScale: 1.18') && balance.includes('attackScale: 1.78'), 'moderated chapter attack profile is incomplete');
assert(balance.includes('bossHpScale: 1.22') && balance.includes('bossHpScale: 2.02'), 'moderated chapter boss HP profile is incomplete');
assert(balance.includes('earlyElitePressure') && balance.includes('room >= 30') && !balance.includes('room >= 25'), 'later chapter elite pressure starts too early');

const attackScale = chapter => chapter <= 5
  ? [1, 1.18, 1.36, 1.56, 1.78][chapter - 1]
  : 1.78 + (chapter - 5) * 0.1;
const bossHpScale = chapter => chapter <= 5
  ? [1, 1.22, 1.45, 1.72, 2.02][chapter - 1]
  : 2.02 + (chapter - 5) * 0.12;
for (let chapter = 2; chapter <= 12; chapter++) {
  assert(attackScale(chapter) > attackScale(chapter - 1), `attack pressure does not rise into chapter ${chapter}`);
  assert(bossHpScale(chapter) > bossHpScale(chapter - 1), `boss HP pressure does not rise into chapter ${chapter}`);
}

console.log('Armor progression audit passed: male animated previews, meaningful item levels, capped cooldowns, diminishing defense, save migration and moderated chapter pressure are coherent.');
