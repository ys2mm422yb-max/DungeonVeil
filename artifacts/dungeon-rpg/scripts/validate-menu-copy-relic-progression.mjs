import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [credits, inventory, presentation, gates, relics, retention, reward, effects, menu, friends, guild, worldboss, quests] = await Promise.all([
  read('../src/components/screens/CreditsScreen.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/game/equipmentPresentation.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/worldBossRewardLocal.ts'),
  read('../src/game/runRelicEffects.ts'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/WorldBossPanel.tsx'),
  read('../src/components/DailyQuestPanel.tsx'),
]);

const checks = [
  [credits.includes('Ein hobbyloser Typ bei seinem ersten Spielprojekt') && !credits.includes('value="Replit AI"'), 'credits are not the new humorous first-project copy'],
  [presentation.includes("'je Ausrüstungslevel'") && inventory.includes("'AUSRÜSTUNGSLEVEL'") && inventory.includes('dauerhaftes Item-Level'), 'equipment levels remain unclear'],
  [gates.includes("'warden-bow': 4") && gates.includes("'warden-quiver': 4") && gates.includes("'veil-eye': 4") && !gates.match(/: [5-9],/), 'normal equipment still unlocks after chapter 4'],
  [retention.includes('engine.state.floor >= 20 && isBossRoom(engine.state.floor)') && retention.includes('BOSS_RELIC_POOL'), 'boss relics are not limited to boss rooms from room 20 onward'],
  [relics.includes("'world-core'") && relics.includes("source: 'worldboss'") && reward.includes("unlockVeilRelic('world-core')"), 'world-boss-exclusive relic is missing'],
  [effects.includes("relic === 'world-core'") && effects.includes('activateWorldCoreForCurrentRun'), 'World Core has no real run effect'],
  [menu.includes("onOpenOnline={() => setOverlay('online')}") && friends.includes('onOpenOnline') && guild.includes('onOpenOnline') && worldboss.includes('onOpenOnline'), 'direct Online & Cloud navigation is missing'],
  [inventory.includes('Bossräume ab Raum 20') && inventory.includes('ausschließlich vom Weltboss'), 'relic source explanation is not accurate'],
  [quests.includes('data-testid="quest-board-summary"') && quests.includes('data-testid="quest-active-section"') && quests.includes('data-testid="quest-completed-section"'), 'quest board is not separated into summary, active and completed sections'],
  [quests.includes('activeTasks') && quests.includes('completedTasks') && quests.includes('completedOpen'), 'quest board does not derive or control its structured task groups'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Menu copy/relic progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Menu copy/relic progression audit passed: menu routes, structured quests, item levels, relic sources and direct sign-in routes are coherent.');
