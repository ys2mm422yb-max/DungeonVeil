import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [skills, controller, progression, levelUp, hud, translations, saveManager, game, bridge, currency] = await Promise.all([
  read('../src/game/runSkills.ts'),
  read('../src/game/giftUpgradeController.ts'),
  read('../src/game/runGiftProgression.ts'),
  read('../src/components/screens/LevelUpScreen.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/i18n/translations.ts'),
  read('../src/game/saveManager.ts'),
  read('../src/pages/game.tsx'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/game/metaCurrency.ts'),
]);

const checks = [
  [skills.includes("elementalStorm: ['fireArrow', 'iceArrow']") && skills.includes("arrowStorm: ['multishot', 'attackSpeed']") && skills.includes("veilChain: ['ricochet', 'piercing']"), 'the three fusion recipes are missing or overlap incorrectly'],
  [skills.includes('availableFusionSkills') && skills.includes('consumeFusionComponents') && skills.includes('activeFusionForBase'), 'fusion eligibility, component consumption or inherited rank-III effects are incomplete'],
  [progression.includes('FIRST_CHAPTER_GIFT_SELECTIONS = 1 + FIRST_CHAPTER_GIFT_ROOMS.length'), 'chapter one does not include one opening choice plus room milestones'],
  [progression.includes('FIRST_CHAPTER_GIFT_ROOMS = Object.freeze([3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50])'), 'chapter one does not use the intended eleven room milestones'],
  [progression.includes('LATER_CHAPTER_GIFT_ROOMS = Object.freeze([10, 20, 30, 40, 50])'), 'later chapters do not use boss-only gift milestones'],
  [progression.includes("STARTING_GIFT_SAVE_REASONS = new Set(['new-run', 'meta-loadout'])"), 'the opening gift is not restored after initial loadout application'],
  [progression.includes("typeof save.pendingGift === 'boolean'") && progression.includes("save.saveReason === 'chapter-complete'") && progression.includes("save.saveReason === 'room-complete'"), 'gift restoration does not prefer explicit pending state and retain legacy milestone fallback'],
  [progression.includes('installBoundedRunGiftProgression') && progression.includes("engine.state.status = 'playing'") && progression.includes('engine.state.upgradeChoices = []'), 'unscheduled rooms still force a gift screen'],
  [skills.includes('hunterBlessing: {\n    maxRank: 3') && skills.includes('vitalSpark: {\n    maxRank: 3'), 'Hunter Blessing or Vital Spark is not capped at mastery rank III'],
  [skills.includes("OVERFLOW_GIFTS: OverflowGiftKey[] = ['hunterBlessing', 'vitalSpark', 'heal', 'veilCache', 'goldCache']"), 'late choices do not include bounded masteries, recovery and currency rewards'],
  [skills.includes("return key === 'heal' || key === 'veilCache' || key === 'goldCache';") && skills.includes('isMasteryGift'), 'instant rewards and persistent masteries are not separated'],
  [controller.includes("player.maxHp * 0.2") && !controller.includes("player.maxHp * 0.5"), 'recovery is not limited to 20%'],
  [controller.includes("choice === 'hunterBlessing'") && controller.includes('player.attack += 2') && controller.includes("choice === 'vitalSpark'") && controller.includes('player.maxHp += 8'), 'bounded mastery effects are not applied with the intended values'],
  [controller.includes("choice === 'veilCache'") && controller.includes('grantMetaDust(30)') && controller.includes("choice === 'goldCache'") && controller.includes('grantMetaGold(300)'), 'late non-power reward choices are not granted safely'],
  [currency.includes('export function grantMetaGold') && currency.includes('meta.gold += value'), 'safe meta gold grant is missing'],
  [controller.includes('consumeFusionComponents(state.runSkills, choice)') && controller.includes('captureRoomEntrySnapshot') && controller.includes("saveNow('ability')"), 'fusion or mastery choices do not persist safely across room restart'],
  [game.includes('prepareGiftChoices(live)') && game.includes('applyGiftUpgrade(engine, choice)'), 'the run flow is not using the fusion-aware gift controller'],
  [bridge.includes('installBoundedRunGiftProgression') && bridge.includes('shouldRestorePendingGift') && bridge.includes('buildRunGiftChoices'), 'active runs do not use the bounded schedule and fusion-aware restoration'],
  [levelUp.includes('MEISTERSCHAFT · RANG') && levelUp.includes('SCHLEIERVORRAT') && levelUp.includes('JÄGERTRUHE') && !levelUp.includes('WIEDERHOLBARER SEGEN'), 'gift cards still describe unlimited blessings or omit currency rewards'],
  [hud.includes("elementalStorm") && hud.includes("arrowStorm") && hud.includes("veilChain") && hud.includes('isInstantGift'), 'fused gifts are not represented as single HUD slots'],
  [translations.includes('JÄGERSEGEN · Meisterschaft I–III') && translations.includes('SCHLEIERVORRAT · +30 Schleierstaub') && translations.includes('JÄGERTRUHE · +300 Gold'), 'German bounded gift copy is incomplete'],
  [saveManager.includes('SAVE_VERSION = 5') && saveManager.includes('pendingGift?: boolean') && saveManager.includes('pendingGiftForSave'), 'pending gift choices are not persisted explicitly'],
  [saveManager.includes('previousPendingGiftAtSamePosition') && saveManager.includes("data.saveReason === 'ability'"), 'session saves cannot retain or clear an in-progress gift choice safely'],
  [!saveManager.includes('delete persistent.hunterBlessing') && !saveManager.includes('delete persistent.vitalSpark'), 'bounded mastery ranks are still removed from saves'],
  [saveManager.includes('delete persistent.heal') && saveManager.includes('delete persistent.veilCache') && saveManager.includes('delete persistent.goldCache'), 'instant gift choices are incorrectly persisted as run skills'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Gift progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Gift progression audit passed: one opening gift, eleven chapter-one milestones, five later boss milestones, capped masteries, persistent pending choices and non-power late rewards are integrated.');
