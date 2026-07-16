import { readFile } from 'node:fs/promises';

const [chapterRun, contract, bridge, runEngine] = await Promise.all([
  readFile(new URL('../src/game/chapterRun.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRewardContract.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GameSessionBridge.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
]);

const nextRoomStart = runEngine.indexOf('private nextRoom(): void');
const nextRoomEnd = runEngine.indexOf('private spawnRoom(): void', nextRoomStart);
const nextRoom = nextRoomStart >= 0 && nextRoomEnd > nextRoomStart
  ? runEngine.slice(nextRoomStart, nextRoomEnd)
  : '';

const checks = [
  [chapterRun.includes('export const CHAPTER_ROOMS = 50;'), 'chapter length is no longer fixed at 50 rooms'],
  [chapterRun.includes('export const FINAL_BOSS_ROOM = 50;'), 'final boss room is no longer defined as room 50'],
  [contract.includes('const chapterBoss = safeFloor === FINAL_BOSS_ROOM;'), 'reward contract does not treat room 50 as the chapter boss'],
  [contract.includes('chapterBoss ? 260 + safeChapter * 30 : boss ? 130 + safeChapter * 20'), 'XP reward tiers are not separated between room 50 and normal bosses'],
  [contract.includes('chapterBoss ? 105 + safeChapter * 15 : boss ? 55 + safeChapter * 10'), 'Veil Dust reward tiers are not separated between room 50 and normal bosses'],
  [contract.includes('chapterBoss ? 900 + safeChapter * 140 : boss ? 350 + safeChapter * 70'), 'gold reward tiers are not separated between room 50 and normal bosses'],
  [bridge.includes("import { rewardChapterRoomClear } from '../game/chapterRewardContract';"), 'active run bridge does not import the chapter reward contract'],
  [bridge.includes('const reward = rewardChapterRoomClear(engine.state.chapter, engine.state.floor);'), 'active room clear does not use the chapter reward contract'],
  [!bridge.includes('rewardMetaRoomClear'), 'active run bridge still uses the legacy room-20 reward path'],
  [nextRoom.includes('const completedChapter = this.state.floor >= CHAPTER_ROOMS;'), 'chapter completion is not tied to the 50-room boundary'],
  [nextRoom.includes('this.state.floor = completedChapter ? 1 : this.state.floor + 1;') && nextRoom.includes('if (completedChapter) this.state.chapter++;'), 'room 50 does not continue into the next chapter'],
  [!nextRoom.includes('this.state.runSkills = {}') && !nextRoom.includes('this.state = this.makeState'), 'chapter transition resets the active run build'],
  [contract.includes('const rewardKey = `${meta.currentRunId}:${safeChapter}:${safeFloor}`;') && contract.includes('meta.rewardLedger.push(rewardKey);'), 'chapter rewards are not protected against duplicate room-clear grants'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Chapter reward contract audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Chapter reward contract audit passed: room 50 owns the chapter reward and the uninterrupted run continues into the next chapter.');
