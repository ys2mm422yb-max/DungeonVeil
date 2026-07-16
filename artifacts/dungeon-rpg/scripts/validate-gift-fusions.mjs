import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [skills, controller, levelUp, hud, translations, saveManager, game] = await Promise.all([
  read('../src/game/runSkills.ts'),
  read('../src/game/giftUpgradeController.ts'),
  read('../src/components/screens/LevelUpScreen.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/i18n/translations.ts'),
  read('../src/game/saveManager.ts'),
  read('../src/pages/game.tsx'),
]);

const checks = [
  [skills.includes("elementalStorm: ['fireArrow', 'iceArrow']") && skills.includes("arrowStorm: ['multishot', 'attackSpeed']") && skills.includes("veilChain: ['ricochet', 'piercing']"), 'the three fusion recipes are missing or overlap incorrectly'],
  [skills.includes('availableFusionSkills') && skills.includes('consumeFusionComponents') && skills.includes('activeFusionForBase'), 'fusion eligibility, component consumption or inherited rank-III effects are incomplete'],
  [skills.includes("OVERFLOW_GIFTS: InstantGiftKey[] = ['hunterBlessing', 'vitalSpark', 'heal']") && skills.includes('buildRunGiftChoices'), 'late runs can still collapse to a single healing choice'],
  [controller.includes("player.maxHp * 0.2") && !controller.includes("player.maxHp * 0.5"), 'recovery is not reduced from 50% to 20%'],
  [controller.includes("choice === 'hunterBlessing'") && controller.includes('player.attack += 2') && controller.includes("choice === 'vitalSpark'") && controller.includes('player.maxHp += 8'), 'repeatable late blessings are not applied with the intended modest values'],
  [controller.includes('consumeFusionComponents(state.runSkills, choice)') && controller.includes('captureRoomEntrySnapshot') && controller.includes("saveNow('ability')"), 'fusion choices do not persist safely across save and room restart'],
  [game.includes('prepareGiftChoices(live)') && game.includes('applyGiftUpgrade(engine, choice)'), 'the run flow is not using the fusion-aware gift controller'],
  [levelUp.includes('KOMBINATION · 2× RANG III') && levelUp.includes('WIEDERHOLBARER SEGEN') && levelUp.includes('gift-choice-'), 'fusion and late blessing cards are not clearly distinguishable'],
  [hud.includes("elementalStorm") && hud.includes("arrowStorm") && hud.includes("veilChain") && hud.includes('isInstantGift'), 'fused gifts are not represented as single HUD slots'],
  [translations.includes("heal: '20% Heilung'") && translations.includes('ELEMENTARSTURM') && translations.includes('PFEILSTURM') && translations.includes('SCHLEIERKETTE'), 'German gift copy is incomplete or still advertises 50% healing'],
  [saveManager.includes('delete persistent.hunterBlessing') && saveManager.includes('delete persistent.vitalSpark'), 'repeatable blessings are incorrectly stored as permanent gift slots'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Gift fusion audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Gift fusion audit passed: three meaningful rank-III combinations, single-slot inheritance, 20% recovery and reusable late-run choices are integrated.');
