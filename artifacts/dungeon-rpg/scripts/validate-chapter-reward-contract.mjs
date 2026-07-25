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

const chapterRoomMatch = chapterRun.match(/export const CHAPTER_ROOMS = (\d+);/);
const finalBossMatch = chapterRun.match(/export const FINAL_BOSS_ROOM = (\d+);/);
const bossRoomsMatch = chapterRun.match(/export const BOSS_ROOMS = \[([^\]]+)\] as const;/);
const chapterRooms = Number(chapterRoomMatch?.[1] ?? 0);
const finalBossRoom = Number(finalBossMatch?.[1] ?? 0);
const bossRooms = (bossRoomsMatch?.[1] ?? '')
  .split(',')
  .map(value => Number(value.trim()))
  .filter(Number.isFinite);
const expectedBossRooms = Array.from({ length: Math.floor(chapterRooms / 10) }, (_, index) => (index + 1) * 10);

const checks = [
  [chapterRooms === 100, 'chapter length is not fixed at 100 rooms for Block 7'],
  [finalBossRoom === chapterRooms, 'final boss room does not match the configured chapter boundary'],
  [bossRooms.length === expectedBossRooms.length && expectedBossRooms.every((room, index) => bossRooms[index] === room), 'boss-room registry does not cover every ten-room milestone through the configured chapter boundary'],
  [contract.includes('const chapterBoss = safeFloor === FINAL_BOSS_ROOM;'), 'reward contract does not derive the chapter boss from FINAL_BOSS_ROOM'],
  [contract.includes('chapterBoss ? 260 + safeChapter * 30 : boss ? 130 + safeChapter * 20'), 'XP reward tiers are not separated between the final chapter boss and intermediate bosses'],
  [contract.includes('chapterBoss ? 105 + safeChapter * 15 : boss ? 55 + safeChapter * 10'), 'Veil Dust reward tiers are not separated between the final chapter boss and intermediate bosses'],
  [contract.includes('chapterBoss ? 900 + safeChapter * 140 : boss ? 350 + safeChapter * 70'), 'gold reward tiers are not separated between the final chapter boss and intermediate bosses'],
  [bridge.includes("import { rewardChapterRoomClear } from '../game/chapterRewardContract';"), 'active run bridge does not import the chapter reward contract'],
  [bridge.includes('const reward = rewardChapterRoomClear(') && bridge.includes('engine.state.chapter') && bridge.includes('engine.state.floor'), 'active room clear does not use the chapter reward contract'],
  [!bridge.includes('rewardMetaRoomClear'), 'active run bridge still uses the legacy room-20 reward path'],
  [nextRoom.includes('const completedChapter = this.state.floor >= CHAPTER_ROOMS;'), 'chapter completion is not tied to the configured chapter boundary'],
  [nextRoom.includes('this.state.floor = completedChapter ? 1 : this.state.floor + 1;') && nextRoom.includes('if (completedChapter) this.state.chapter++;'), 'the final room does not continue into the next chapter'],
  [!nextRoom.includes('this.state.runSkills = {}') && !nextRoom.includes('this.state = this.makeState'), 'chapter transition resets the active run build'],
  [contract.includes('const ledgerRunId = normalized.rewardRunId || meta.currentRunId;') && contract.includes('const rewardKey = `${ledgerRunId}:${safeChapter}:${safeFloor}`;') && contract.includes('meta.rewardLedger.push(rewardKey);'), 'chapter rewards are not protected against duplicate room-clear grants'],
  [contract.includes('xp: baseAmounts.xp') && contract.includes('dust: Math.round(baseAmounts.dust * normalized.multiplier)') && contract.includes('gold: Math.round(baseAmounts.gold * normalized.multiplier)'), 'optional duo currency scaling changes rank XP or skips gold/dust'],
  [contract.includes('const multiplier = Math.max(1, Math.min(2') && contract.includes('rewardRunId?: string'), 'optional duo reward parameters are not bounded and explicit'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Chapter reward contract audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Chapter reward contract audit passed: room ${finalBossRoom} owns the final chapter reward, every ten-room boss milestone remains registered, and optional duo currency uses an isolated ledger.`);