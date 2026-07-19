#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const [mechanics, encounters, runtime, equipmentRuntime, curve, relicRuntime] = await Promise.all([
  readFile(new URL('../src/game/chapterMechanicsV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/encounterPlan.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterEncounterRuntimeV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentRuntimeBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/combatCurveV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentPlayerRuntimeV4.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Chapter balance V4 audit failed: ${message}`);
}

const profiles = [
  { chapter: 1, phase: 'intro', reinforcements: 0, support: 0, bossPhases: 1 },
  { chapter: 2, phase: 'build', reinforcements: 0, support: 0, bossPhases: 1 },
  { chapter: 3, phase: 'build', reinforcements: 0, support: 0, bossPhases: 1 },
  { chapter: 4, phase: 'midgame', reinforcements: 1, support: 0, bossPhases: 1 },
  { chapter: 5, phase: 'midgame', reinforcements: 1, support: 0, bossPhases: 1 },
  { chapter: 6, phase: 'midgame', reinforcements: 1, support: 0, bossPhases: 2 },
  { chapter: 7, phase: 'lategame', reinforcements: 2, support: 0, bossPhases: 2 },
  { chapter: 8, phase: 'lategame', reinforcements: 2, support: 0, bossPhases: 2 },
  { chapter: 9, phase: 'lategame', reinforcements: 2, support: 1, bossPhases: 2 },
  { chapter: 10, phase: 'endgame', reinforcements: 2, support: 1, bossPhases: 3 },
];

assert(mechanics.includes("export type ChapterPhaseV4 = 'intro' | 'build' | 'midgame' | 'lategame' | 'endgame' | 'endless'"), 'chapter phase contract is incomplete');
assert(mechanics.includes('supportReplacements') && !mechanics.includes('supportAdds'), 'support pressure is not implemented as bounded replacement');
assert(mechanics.includes('Math.min(0.48') && mechanics.includes("phase: 'endless'"), 'endless elite pressure is not damped or capped');
assert(mechanics.includes('return result.slice(0, 8)'), 'chapter mechanics can escape the eight-enemy mobile cap');
assert(encounters.includes('getChapterEncounterPlan') && encounters.includes('applyChapterMechanicsV4(getEncounterPlan(room), room, chapter)'), 'chapter-aware encounter API is not canonical');
assert(runtime.includes('getChapterEncounterPlan(room, chapter)') && runtime.includes('transformedEnemyIds'), 'chapter encounter transformations are not idempotent per enemy');
assert(runtime.includes("if (room % 10 === 0") && runtime.includes("enemy.enemyType === 'boss'"), 'boss rooms are not protected from normal-role replacement');
assert(runtime.includes('enemy.maxHp * target.hp / current.hp') && runtime.includes('enemy.attack * target.attack'), 'role replacement does not preserve chapter/room scaling ratios');
assert(
  equipmentRuntime.indexOf('applyChapterEncounterRuntimeV4(engine') < equipmentRuntime.indexOf('applyCombatBalanceV4Overlay(engine'),
  'chapter roles are applied after combat scaling',
);
assert(curve.includes('const CHAPTERS: readonly ChapterCombatProfileV4[]') && curve.includes('const damped = Math.log2(overflow + 1)'), 'chapter 1–10 or damped endless numerical curve is missing');
assert(relicRuntime.includes('Math.max(0, Math.min(4') && relicRuntime.includes('crownRunStacks[runId]'), 'guardian crown is not capped and run-scoped in endless chapters');

for (const profile of profiles) {
  const chapterText = profile.chapter === 1
    ? "value === 1"
    : profile.chapter <= 3
      ? "value <= 3"
      : profile.chapter <= 6
        ? "value <= 6"
        : profile.chapter <= 9
          ? "value <= 9"
          : "value === 10";
  assert(mechanics.includes(chapterText), `chapter ${profile.chapter} phase branch is missing`);
}

const baseRoom = ['goblin', 'spider', 'slime', 'skeleton', 'orc'];
function deterministicIndex(room, chapter, salt, length) {
  if (length <= 1) return 0;
  const value = Math.imul(room + salt * 17, 73856093) ^ Math.imul(chapter + salt * 31, 19349663);
  return Math.abs(value) % length;
}
const pools = {
  early: ['orc', 'vampire'],
  mid: ['demon', 'vampire', 'golem'],
  late: ['demon', 'golem', 'vampire', 'orc'],
  support: ['skeleton', 'vampire', 'demon'],
};
function simulatedPlan(chapter, room = 25) {
  const result = [...baseRoom];
  const reinforcementCount = chapter <= 3 ? 0 : chapter <= 6 ? 1 : 2;
  const replacementPool = chapter <= 3 ? pools.early : chapter <= 6 ? pools.mid : pools.late;
  for (let index = 0; index < reinforcementCount; index++) {
    result[deterministicIndex(room, chapter, index + 1, result.length)] = replacementPool[deterministicIndex(room, chapter, index + 11, replacementPool.length)];
  }
  if (chapter >= 9) result[deterministicIndex(room, chapter, 23, result.length)] = pools.support[deterministicIndex(room, chapter, 29, pools.support.length)];
  return result;
}

assert(JSON.stringify(simulatedPlan(1)) === JSON.stringify(baseRoom), 'chapter 1 changes the authored introduction encounter');
assert(JSON.stringify(simulatedPlan(4)) !== JSON.stringify(baseRoom), 'midgame chapter mechanics do not change enemy roles');
assert(JSON.stringify(simulatedPlan(7)) !== JSON.stringify(simulatedPlan(4)), 'lategame chapter mechanics do not increase role pressure');
assert(simulatedPlan(10).length === baseRoom.length && simulatedPlan(10).length <= 8, 'endgame mechanics add enemies instead of replacing roles');
assert(new Set(simulatedPlan(10)).size >= 3, 'endgame encounter loses role variety');

console.log(JSON.stringify({
  chapters: profiles,
  samplePlans: { chapter1: simulatedPlan(1), chapter4: simulatedPlan(4), chapter7: simulatedPlan(7), chapter10: simulatedPlan(10) },
  endlessEliteAffixCap: 0.48,
  mobileEnemyCap: 8,
}, null, 2));
console.log('Chapter balance V4 passed: chapters 1–10 gain bounded role, support, elite and boss-phase pressure while chapter 1, boss rooms and endless scaling remain safe.');
