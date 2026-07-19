#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const isBossRoom = room => room % 10 === 0;
const guardianTypes = new Set(['orc', 'demon', 'golem']);
const skirmisherTypes = new Set(['spider', 'vampire']);

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const composition = await server.ssrLoadModule('/src/game/encounterCompositionV4.ts');
  const encounters = await server.ssrLoadModule('/src/game/encounterPlan.ts');
  const rooms = await server.ssrLoadModule('/src/game/roomBible.ts');
  const overlaySource = await readFile(new URL('../src/game/combatBalanceOverlayV4.ts', import.meta.url), 'utf8');

  assert(overlaySource.includes("from './encounterCompositionV4'"), 'combat overlay does not import the chapter composition layer');
  assert(overlaySource.includes('applyChapterEncounterCompositionV4(enemy, room, chapter, index, encounterLength)'), 'normal enemies do not receive chapter composition');
  assert(overlaySource.includes('applyChapterBossPressureV4(enemy, chapter)'), 'bosses do not receive bounded chapter pressure');

  let totalNormalScenarios = 0;
  let totalChangedSlots = 0;
  let lateGuardianRooms = 0;
  let lateSkirmisherRooms = 0;

  for (let room = 1; room <= 50; room++) {
    const plan = encounters.getEncounterPlan(room);
    const spawns = rooms.roomBibleSpec(room).enemySpawns;

    if (isBossRoom(room)) {
      assert(plan.length === 0, `room ${room}: boss room unexpectedly owns a normal encounter plan`);
      assert(spawns.length === 1, `room ${room}: boss room must retain exactly one safe spawn`);
      continue;
    }

    assert(plan.length >= 2 && plan.length <= 8, `room ${room}: encounter count ${plan.length} escapes 2-8`);
    assert(spawns.length === 8, `room ${room}: normal room no longer exposes eight safe spawn points`);

    const chapterOne = plan.map((type, index) => composition.chapterCompositionTypeV4(type, room, 1, index, plan.length));
    assert(JSON.stringify(chapterOne) === JSON.stringify(plan), `room ${room}: chapter one composition changed`);

    let chapterThreeReplacements = 0;
    let chapterTenReplacements = 0;
    let chapterTenTypes = [];

    for (let chapter = 1; chapter <= 10; chapter++) {
      totalNormalScenarios++;
      const replaced = plan.map((type, index) => composition.chapterCompositionTypeV4(type, room, chapter, index, plan.length));
      const replacementCount = composition.encounterReplacementCountV4(room, chapter, plan.length);
      const changed = replaced.filter((type, index) => type !== plan[index]).length;

      assert(replaced.length === plan.length, `room ${room}/chapter ${chapter}: composition changed enemy count`);
      assert(replaced.length <= 8, `room ${room}/chapter ${chapter}: mobile enemy cap exceeded`);
      assert(!replaced.includes('boss'), `room ${room}/chapter ${chapter}: normal composition created a boss`);
      assert(replacementCount <= 4, `room ${room}/chapter ${chapter}: more than four role slots replaced`);
      assert(changed <= replacementCount, `room ${room}/chapter ${chapter}: changed slots exceed deterministic selection`);

      if (chapter === 3) chapterThreeReplacements = replacementCount;
      if (chapter === 10) {
        chapterTenReplacements = replacementCount;
        chapterTenTypes = replaced;
        totalChangedSlots += changed;
      }
    }

    assert(chapterTenReplacements >= chapterThreeReplacements, `room ${room}: late chapter composition is weaker than early composition`);
    assert(chapterTenReplacements >= Math.min(2, plan.length), `room ${room}: chapter ten lacks meaningful role pressure`);
    if (chapterTenTypes.some(type => guardianTypes.has(type))) lateGuardianRooms++;
    if (chapterTenTypes.some(type => skirmisherTypes.has(type))) lateSkirmisherRooms++;

    const originalType = plan[0];
    const enemy = {
      id: `audit-${room}`,
      type: 'enemy', enemyType: originalType,
      x: 0, y: 0, width: 32, height: 32, vx: 0, vy: 0,
      hp: 100, maxHp: 100, attack: 10, defense: 2, speed: 60,
      color: '#fff', state: 'chase', isDead: false,
      targetX: 0, targetY: 0, nextAttackTime: 0, flashUntil: 0,
      spawnTime: 0, lastAttackTime: 0, deathTime: 0,
    };
    composition.applyChapterEncounterCompositionV4(enemy, room, 10, 0, plan.length);
    assert(Number.isFinite(enemy.hp) && enemy.hp >= 1 && enemy.hp <= enemy.maxHp, `room ${room}: composed HP invalid`);
    assert(Number.isFinite(enemy.attack) && enemy.attack >= 1, `room ${room}: composed attack invalid`);
    assert((enemy.defense ?? 0) >= 0 && (enemy.defense ?? 0) <= 12, `room ${room}: composed defense escapes cap`);
    assert(enemy.speed >= 38 && enemy.speed <= 96, `room ${room}: composed speed escapes mobile cap`);
  }

  const earlyBoss = {
    enemyType: 'boss', speed: 54, defense: 7,
  };
  const lateBoss = {
    enemyType: 'boss', speed: 54, defense: 7,
  };
  composition.applyChapterBossPressureV4(earlyBoss, 1);
  composition.applyChapterBossPressureV4(lateBoss, 10);
  assert(earlyBoss.speed === 54 && earlyBoss.defense === 7, 'chapter-one boss pressure changed the baseline');
  assert(lateBoss.speed > earlyBoss.speed && lateBoss.speed <= 72, 'late boss movement pressure is missing or uncapped');
  assert(lateBoss.defense > earlyBoss.defense && lateBoss.defense <= 12, 'late boss defense pressure is missing or uncapped');

  assert(totalNormalScenarios === 450, `expected 450 normal room/chapter scenarios, found ${totalNormalScenarios}`);
  assert(totalChangedSlots >= 80, `chapter-ten composition changes too few slots (${totalChangedSlots})`);
  assert(lateGuardianRooms >= 40, `guardian pressure appears in only ${lateGuardianRooms} late rooms`);
  assert(lateSkirmisherRooms >= 35, `skirmisher pressure appears in only ${lateSkirmisherRooms} late rooms`);

  if (errors.length) {
    console.error(`Room/chapter composition V4 failed with ${errors.length} error(s):`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ totalNormalScenarios, totalChangedSlots, lateGuardianRooms, lateSkirmisherRooms }, null, 2));
    console.log('Room/chapter composition V4 passed: 50 authored rooms retain safe spawn caps while chapters 1-10 add deterministic mixed-role pressure and bounded boss escalation.');
  }
} finally {
  await server.close();
}
