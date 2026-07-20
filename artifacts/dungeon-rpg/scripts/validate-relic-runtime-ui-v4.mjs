import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRelicRuntimeMatrixV4 } from './relic-runtime-matrix-v4.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const definitions = read('src/game/veilRelics.ts');
const runtime = read('src/game/equipmentPlayerRuntimeV4.ts');
const retention = read('src/game/runRetention.ts');
const oneShot = read('src/game/runRelicEffects.ts');
const screen = read('src/components/screens/VeilChamberScreenV4.tsx');
const smoke = read('tests/full-game-smoke.spec.mjs');

assert(['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'].every(id => definitions.includes("'" + id + "': {") || definitions.includes("id: '" + id + "'")), 'All seven relic definitions must remain explicit.');
assert(definitions.includes('Jeder siebte Kill') && definitions.includes('2,5 Sekunden') && definitions.includes('14 %'), 'Marked Claw copy is not canonical.');
assert(runtime.includes('Math.floor(kills / 7)') && runtime.includes('time + 2500') && runtime.includes('? 0.14 : 0') && runtime.includes('Math.min(1.75'), 'Marked Claw trigger, duration, bonus or shared cap regressed.');
assert(!retention.includes('clawKillChain') && !retention.includes('claw-rush-'), 'Marked Claw still has a duplicate retention trigger.');
assert(retention.includes("+3 % Angriff · Stapel ") && retention.includes("crown.stack") && retention.includes("/4") && !retention.includes('+4 % Angriff') && !retention.includes('/5'), 'Guardian Crown event copy or cap is inconsistent.');
assert(!retention.includes('engine.state.player.attack +=') && runtime.includes('previousMultiplier') && runtime.includes('nextMultiplier') && runtime.includes('* 0.03'), 'Guardian Crown is not applied by one canonical additive runtime.');
assert(runtime.includes('state.crownRunId !== runId') && runtime.includes('state.crownStack = stack') && runtime.includes('continued run already persists'), 'Guardian Crown resume protection is missing.');
assert(oneShot.includes('activateWorldCoreForCurrentRun()') && oneShot.includes('consumeVeilHeartForCurrentRun()'), 'World Core or Veil Heart once-per-run gates are missing.');
assert(runtime.includes("equippedVeilRelic() === 'depth-rune-shard' ? 0.82 : 1"), 'Depth Rune Shard must reduce damage before armor.');
assert(retention.includes("activeRelic === 'night-hunt-sigil' ? 1.5 : 1") && retention.includes("relic === 'ash-eye' ? 1 : 0"), 'Hunt economy relics are not bounded.');
assert(screen.includes('relic-library-layout') && screen.includes('relic-card-grid') && screen.includes('sm:grid-cols-2') && screen.includes('max-w-5xl'), 'Responsive relic library layout is missing.');
assert(screen.includes('data-relic-card="true"') && screen.includes('relic-locked-silhouette') && screen.includes('relic-active-badge') && screen.includes('RELIC_SOURCE_LABELS'), 'Relic cards lack locked, active or source states.');
assert(smoke.includes("toHaveCount(7)") && smoke.includes("relic-card-marked-claw") && smoke.includes('relicColumns'), 'Four-profile browser coverage does not exercise the relic card library.');

const matrix = buildRelicRuntimeMatrixV4();
assert(matrix.length === 49, 'Relic runtime matrix must cover seven relics across seven contexts.');
assert(matrix.every(row => row.applicationsPerOwner === 1 && row.sharedDuoApplications === 0 && row.companionInherited === false && row.resumeReapplications === 0), 'Duo, companion or resume isolation regressed.');
const claw = matrix.find(row => row.relicId === 'marked-claw');
assert(claw?.killInterval === 7 && claw?.durationMs === 2500 && claw?.attackSpeedBonus === 0.14 && claw?.attackSpeedCap === 1.75, 'Marked Claw matrix mismatch.');
const crown = matrix.find(row => row.relicId === 'broken-guardian-crown');
assert(crown?.stackCap === 4 && crown?.maximumAttackMultiplier === 1.12, 'Guardian Crown exceeds the documented 12% cap.');
const heart = matrix.find(row => row.relicId === 'veil-heart');
const core = matrix.find(row => row.relicId === 'world-core');
assert(heart?.lethalPreventionsPerRun === 1 && core?.activationsPerRun === 1, 'Once-per-run relics can reactivate.');

console.log('Relic Block 5 audit passed: 49 runtime contexts, one canonical trigger path, exact caps, resume safety and responsive card UI.');
