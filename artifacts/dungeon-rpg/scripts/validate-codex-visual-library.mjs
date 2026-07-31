import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const screen = read('src/components/screens/CodexScreen.tsx');
const inventory = read('src/components/screens/VeilChamberScreenV4.tsx');
const definitions = read('src/game/codexDefinitions.ts');
const registry = read('src/game/enemyRegistry.ts');
const retention = read('src/game/runRetention.ts');
const artwork = read('src/components/CodexArtwork.tsx');
const preview = read('src/components/CodexModelPreview.tsx');
const config = read('playwright.regression.config.mjs');
const test = read('tests/codex-visual-library.spec.mjs');
const persistenceTest = read('tests/enemy-registry-codex.spec.mjs');

assert(screen.includes('CODEX_BEASTS') && screen.includes('CODEX_HUNTS') && screen.includes('CODEX_WARDENS'), 'Codex does not use canonical entry definitions.');
assert(definitions.includes('NORMAL_ENEMY_FAMILY_IDS.map') && definitions.includes('const definition = ENEMY_REGISTRY[id]'), 'Beast Codex is not derived from the canonical enemy registry.');
const normalFamilyCount = [...registry.matchAll(/^\s{2}(?:'[^']+'|[a-z][a-z-]*): family\(/gm)].length;
assert(normalFamilyCount >= 24, `Registry Codex exposes only ${normalFamilyCount} normal families; expected at least 24.`);
assert(screen.includes('EnemyArtwork') && screen.includes('RelicArtwork') && screen.includes('EquipmentArtwork'), 'Codex still lacks shared visual artwork.');
assert(inventory.includes("import { EquipmentArtwork, RelicArtwork } from '../CodexArtwork';") && inventory.includes('<RelicArtwork relicId={activeRelic.id}') && inventory.includes('<EquipmentArtwork itemId={entry.id}'), 'Inventory and codex do not share the same relic and equipment artwork.');
assert(!inventory.includes("activeRelic.source === 'hunt' ? '◈'") && !inventory.includes("relic.source === 'hunt' ? '◈'"), 'Generic source glyphs still replace individual relic artwork.');
assert(screen.includes('CodexModelPreview') && preview.includes('codex-shared-model-preview'), 'Selected beasts and wardens have no real shared model preview.');
assert(screen.includes('md:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]') && screen.includes('codex-detail-panel') && screen.includes('codex-card-grid'), 'Tablet codex does not use a card grid beside a detail panel.');
assert(screen.includes('data-known={known') && screen.includes('SILHOUETTE · FUNDHINWEIS') && screen.includes('SILHOUETTE · DISCOVERY HINT') && screen.includes('locked={!known}'), 'Locked entries do not remain bilingual spoiler-safe silhouettes with hints.');
assert(screen.includes("locked: { de: 'NICHT ENTDECKT', en: 'UNDISCOVERED' }") && screen.includes("detailShow: { de: 'DETAIL ANZEIGEN', en: 'SHOW DETAILS' }"), 'Card state copy is not fully bilingual.');
assert(screen.includes('data-testid={`codex-tab-${key}`}') && screen.includes('min-h-11') && screen.includes('h-12 w-12'), 'Codex tabs or back control do not guarantee 44px touch targets.');
assert(screen.includes('data-testid={`codex-count-${key}`}') && screen.includes('Object.values(VEIL_RELICS).filter'), 'Exact category counters are not exposed or derived from registered entries.');
assert(screen.includes('retention.codex.enemyKills[entry.familyId]') && screen.includes('dungeon-veil-cloud-save-restored'), 'Family kill counters or cloud-restore refresh are missing from the Codex.');
assert(retention.includes('enemyKills: Partial<Record<EnemyFamilyId, number>>') && retention.includes('profile.codex.enemyKills[familyId]'), 'Family kill counters are not persisted by retention.');
assert(!screen.includes("known ? '◆' : '?'") && !screen.includes('max-w-md'), 'Legacy single-column diamond placeholder codex is still present.');

const wardenRooms = [...definitions.matchAll(/^\s*\[(10|20|30|40|50|60|70|80|90|100),\s*'/gm)].map(match => Number(match[1]));
assert(wardenRooms.length === 10 && new Set(wardenRooms).size === 10, `Expected ten generated Warden definitions, found ${wardenRooms.length}.`);
assert(definitions.includes('discoveryKey: `1:${room}`') && definitions.includes('id: `warden-${room}`'), 'Warden discovery keys are not generated from their room definitions.');
for (const room of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) assert(wardenRooms.includes(room), `Warden room ${room} is missing.`);
assert(
  definitions.includes('room: definition.spawn.minRoom')
    && definitions.includes('enemyType: definition.runtimeType')
    && definitions.includes('presentationKey: definition.presentationKey'),
  'Beast first-sighting, runtime identity or presentation identity is not derived from the canonical registry.',
);
assert(definitions.includes("presentationKey: ENEMY_REGISTRY.boss.presentationKey"), 'Warden presentation identity is not derived from the canonical boss registry entry.');
assert(artwork.includes("case 'world-core'") && artwork.includes("case 'broken-guardian-crown'") && artwork.includes("slot === 'bow'") && artwork.includes("slot === 'quiver'"), 'Relic or equipment artwork is not individually defined.');
assert(preview.includes('data-preview-renderers="1"') && preview.includes('createKayKitEnemyVisual') && preview.includes('preloadKayKitEnemyVisuals') && preview.includes('forceContextLoss'), 'Codex model preview is not a single bounded renderer using current enemy models.');
assert(!preview.includes('Object.values(CODEX_BEASTS).map') && screen.includes('<CodexModelPreview enemyType={entry.enemyType}'), 'Codex preview contract regressed.');
assert(config.includes('codex-visual-library') && test.includes('toHaveCount(35)') && test.includes('toHaveCount(10)') && test.includes('toHaveCount(7)'), 'Four-device registry Codex browser coverage is incomplete.');
assert(test.includes("codex-tab-wardens") && test.includes("codex-count-wardens") && test.includes("language: 'en'"), 'English, counter or Warden coverage is incomplete.');
assert(persistenceTest.includes("toHaveText('3/35')") && persistenceTest.includes('dungeon-veil-cloud-save-restored') && persistenceTest.includes("toContainText('15')"), 'Family discovery/counter reload and cloud-restore coverage is missing.');

console.log(`Block 21 Codex passed: ${normalFamilyCount} registry families, ten generated wardens, separated runtime/presentation identities, family counters, cloud/reload persistence, bilingual states, shared artwork and responsive four-device layout.`);
