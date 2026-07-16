import { readFile } from 'node:fs/promises';
import { simulateFusionCapstones } from './fusion-capstone-simulator.mjs';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [skills, controller, progression, levelUp, hud, translations, saveManager, game, bridge, currency, synergies, simulator] = await Promise.all([
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
  read('../src/game/runSynergies.ts'),
  read('./fusion-capstone-simulator.mjs'),
]);
const fusionReport = simulateFusionCapstones();

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
  [hud.includes('elementalStorm') && hud.includes('arrowStorm') && hud.includes('veilChain') && hud.includes('isInstantGift'), 'fused gifts are not represented as single HUD slots'],
  [translations.includes('JÄGERSEGEN · Meisterschaft I–III') && translations.includes('SCHLEIERVORRAT · +30 Schleierstaub') && translations.includes('JÄGERTRUHE · +300 Gold'), 'German bounded gift copy is incomplete'],
  [saveManager.includes('SAVE_VERSION = 5') && saveManager.includes('pendingGift?: boolean') && saveManager.includes('pendingGiftForSave'), 'pending gift choices are not persisted explicitly'],
  [saveManager.includes('previousPendingGiftAtSamePosition') && saveManager.includes("data.saveReason === 'ability'"), 'session saves cannot retain or clear an in-progress gift choice safely'],
  [!saveManager.includes('delete persistent.hunterBlessing') && !saveManager.includes('delete persistent.vitalSpark'), 'bounded mastery ranks are still removed from saves'],
  [saveManager.includes('delete persistent.heal') && saveManager.includes('delete persistent.veilCache') && saveManager.includes('delete persistent.goldCache'), 'instant gift choices are incorrectly persisted as run skills'],
  [skills.includes('jeder fünfte Elementarpfeil trifft bis zu 3 Ziele mit 22% Angriffsschaden'), 'Elemental Storm card does not explain its measured capstone'],
  [skills.includes('Zusatzpfeile verursachen 90% statt 82% Schaden'), 'Arrow Storm card does not explain its measured capstone'],
  [skills.includes('Folgetreffer verursachen 10% mehr tatsächlichen Schaden'), 'Veil Chain card does not explain its measured capstone'],
  [synergies.includes('function triggerElementalStorm') && synergies.includes('state.elementalHitCount % 5') && synergies.includes('slice(0, 3)') && synergies.includes('player.attack * 0.22'), 'Elemental Storm does not use the bounded fifth-elemental-hit burst'],
  [synergies.includes('0.9 / 0.82 - 1') && synergies.includes('shotIndex <= 0'), 'Arrow Storm does not limit its exact 90%-versus-82% uplift to secondary arrows'],
  [synergies.includes('function damageForEffect') && synergies.includes('originalDamage * 0.1') && synergies.includes("effect.id.startsWith('rico-') || effect.id.startsWith('pierce-')"), 'Veil Chain does not derive a 10% bonus from actual ricochet and piercing damage'],
  [synergies.includes('fusionCapstones(engine, state, time)') && !synergies.includes('installRunFusionEffects') && !bridge.includes('installRunFusionEffects'), 'fusion capstones rely on a second private-engine wrapper instead of the existing synergy system'],
  [simulator.includes("scenario: 'balanced-fusion-capstones-v2'") && simulator.includes('persistentStatGrowth: 0') && simulator.includes('chapterMultiplier: 1'), 'fusion simulator does not prove fixed chapter-independent power'],
  [fusionReport.elementalStorm.maximumThreeTargetUpliftPercent >= 12 && fusionReport.elementalStorm.maximumThreeTargetUpliftPercent <= 14, 'Elemental Storm leaves the intended 12-14% dense-combat band'],
  [fusionReport.arrowStorm.upliftPercent >= 6.5 && fusionReport.arrowStorm.upliftPercent <= 8, 'Arrow Storm leaves the intended 6.5-8% capstone band'],
  [fusionReport.veilChain.upliftPercent >= 8 && fusionReport.veilChain.upliftPercent <= 10, 'Veil Chain leaves the intended 8-10% capstone band'],
  [fusionReport.persistentStatGrowth === 0 && fusionReport.chapterMultiplier === 1, 'a fusion capstone introduces persistent or chapter-based growth'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Gift progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Gift progression audit passed: bounded milestones remain intact; fusion capstones add up to ${fusionReport.elementalStorm.maximumThreeTargetUpliftPercent}%, ${fusionReport.arrowStorm.upliftPercent}% and ${fusionReport.veilChain.upliftPercent}% reference power without persistent scaling.`);
