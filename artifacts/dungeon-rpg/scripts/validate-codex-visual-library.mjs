import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const screen = read('src/components/screens/CodexScreen.tsx');
const definitions = read('src/game/codexDefinitions.ts');
const artwork = read('src/components/CodexArtwork.tsx');
const preview = read('src/components/CodexModelPreview.tsx');
const config = read('playwright.regression.config.mjs');
const test = read('tests/codex-visual-library.spec.mjs');

assert(screen.includes('CODEX_BEASTS') && screen.includes('CODEX_HUNTS') && screen.includes('CODEX_WARDENS'), 'Codex does not use canonical entry definitions.');
assert(screen.includes('EnemyArtwork') && screen.includes('RelicArtwork') && screen.includes('EquipmentArtwork'), 'Codex still lacks shared visual artwork.');
assert(screen.includes('CodexModelPreview') && screen.includes('codex-shared-model-preview'), 'Selected beasts and wardens have no real shared model preview.');
assert(screen.includes('md:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]') && screen.includes('codex-detail-panel') && screen.includes('codex-card-grid'), 'Tablet codex does not use a card grid beside a detail panel.');
assert(screen.includes('data-known={known') && screen.includes('SILHOUETTE · FUNDHINWEIS') && screen.includes('locked={!known}'), 'Locked entries do not remain spoiler-safe silhouettes with hints.');
assert(!screen.includes("known ? '◆' : '?'") && !screen.includes('max-w-md'), 'Legacy single-column diamond placeholder codex is still present.');
assert(definitions.includes("discoveryKey: '1:10'") && definitions.includes("discoveryKey: '1:20'") && definitions.includes("discoveryKey: '1:30'") && definitions.includes("discoveryKey: '1:40'") && definitions.includes("discoveryKey: '1:50'"), 'Warden discovery keys do not match the five real boss rooms.');
assert(definitions.includes("enemyType: 'goblin', room: 1") && definitions.includes("enemyType: 'slime', room: 11"), 'Beast first-sighting metadata is inconsistent with encounter plans.');
assert(artwork.includes("case 'world-core'") && artwork.includes("case 'broken-guardian-crown'") && artwork.includes("slot === 'bow'") && artwork.includes("slot === 'quiver'"), 'Relic or equipment artwork is not individually defined.');
assert(preview.includes('data-preview-renderers="1"') && preview.includes('createKayKitEnemyVisual') && preview.includes('preloadKayKitEnemyVisuals') && preview.includes('forceContextLoss'), 'Codex model preview is not a single bounded renderer using current enemy models.');
assert(!preview.includes('Object.values(CODEX_BEASTS).map') && !screen.includes('<CodexModelPreview enemyType={entry.enemyType}') === false, 'Codex preview contract regressed.');
assert(config.includes('codex-visual-library') && test.includes("toHaveCount(8)") && test.includes("toHaveCount(5)") && test.includes("toHaveCount(7)") && test.includes("toHaveCount(10)"), 'Four-device codex browser coverage is incomplete.');

console.log('Codex visual library passed: canonical entries, unique shared artwork, spoiler-safe silhouettes, one model renderer and responsive tablet detail layout.');
