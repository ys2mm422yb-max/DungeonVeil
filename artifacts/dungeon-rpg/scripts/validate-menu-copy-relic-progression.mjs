import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [credits, inventory, presentation, gates, relics, retention, reward, effects, menu, friends, guild, worldboss, quests, profile, publicProfile, weekly, bundle, syncRuntime, sessionBridge, main] = await Promise.all([
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
  read('../src/components/PlayerProfilePanel.tsx'),
  read('../src/components/PlayerProfileCard.tsx'),
  read('../src/game/weeklyElite.ts'),
  read('../src/game/persistentSaveBundle.ts'),
  read('../src/game/cloudAccountSyncRuntime.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/main.tsx'),
]);

const checks = [
  [credits.includes('Ein hobbyloser Typ bei seinem ersten Spielprojekt') && !credits.includes('value="Replit AI"'), 'credits are not the new humorous first-project copy'],
  [presentation.includes("'je Ausrüstungslevel'") && inventory.includes("'AUSRÜSTUNGSLEVEL'") && inventory.includes('Ausrüstungslevel ist dauerhaft') && inventory.includes('Gold, Itemkopien und Schleierstaub'), 'equipment levels or their permanent three-resource upgrade path remain unclear'],
  [gates.includes("'splinter-bow': 5") && gates.includes("'rune-quiver': 7") && gates.includes("'veil-mantle': 8") && gates.includes("'warden-quiver': 9") && gates.includes("'warden-bow': 10") && gates.includes("'veil-eye': 10") && !gates.match(/: (?:1[1-9]|[2-9]\d),/), 'equipment is not distributed through chapter 10 as intended'],
  [retention.includes("if (isBossRoom(engine.state.floor)) spawnRareRelicDrop(engine, state, 'boss'") && retention.includes("engine.state.floor === 50 ? 0.2 : 0.12"), 'boss relics are not available at every boss milestone with the intended room-50 bonus'],
  [relics.includes("'world-core'") && relics.includes("source: 'worldboss'") && reward.includes("unlockVeilRelic('world-core')"), 'world-boss-exclusive relic is missing'],
  [effects.includes("relic === 'world-core'") && effects.includes('activateWorldCoreForCurrentRun'), 'World Core has no real run effect'],
  [menu.includes("onOpenOnline={() => setOverlay('online')}") && friends.includes('onOpenOnline') && guild.includes('onOpenOnline') && worldboss.includes('onOpenOnline'), 'direct Online & Cloud navigation is missing'],
  [inventory.includes('Bossräume 10, 20, 30, 40 und 50') && inventory.includes("compact ? 'BOSS-DROP' : 'BOSS-RELIKT'") && !inventory.includes('Bossräume ab Raum 20') && inventory.includes('ausschließlich vom Weltboss'), 'relic source explanation does not match all five boss rooms'],
  [quests.includes('data-testid="quest-board-summary"') && quests.includes('data-testid="quest-active-section"') && quests.includes('data-testid="quest-gold-section"') && quests.includes('data-testid="quest-elite-section"') && quests.includes('data-testid="quest-completed-section"'), 'quest board is not separated into daily, gold, weekly elite and completed sections'],
  [quests.includes('Wöchentliche Elite-Aufträge') && quests.includes('weeklyEliteQuests') && quests.includes('claimWeeklyEliteQuest') && quests.includes('weekly-elite-card'), 'real weekly elite contracts are not shown in the quest board'],
  [quests.includes('Gold-Aufträge') && quests.includes("data-quest-kind={task.gold ? 'gold' : 'standard'}"), 'daily gold quests are still mislabeled as weekly elite contracts'],
  [weekly.includes("id: 'enemy-hunt'") && weekly.includes("id: 'contract-master'") && weekly.includes('ownedRewardIds') && weekly.includes('eliteMarks'), 'weekly elite rotation or permanent rewards are incomplete'],
  [profile.includes("type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars'") && profile.includes('Visitenkarten') && profile.includes('profile-collection-summary') && !profile.includes("| 'weekly'"), 'profile collections are incomplete or elite contracts leaked back into the profile'],
  [publicProfile.includes('resolveOnlineAvatar') && publicProfile.includes('resolveOnlineTitle') && publicProfile.includes('resolveOnlineCard'), 'public profiles do not display equipped cosmetics'],
  [bundle.includes("'dungeon-veil-player-profile-v1'") && bundle.includes("'dungeon-veil-weekly-elite-v1'") && bundle.includes("'dungeon-veil-seen-unlocks-v1'"), 'cloud bundle omits profile cosmetics, elite rewards or new-content markers'],
  [bundle.includes('shouldRestoreRemoteBundle') && bundle.includes('bundleProgressWeight') && bundle.includes('bundleActivityTimestamp') && bundle.includes('dungeon-veil-pre-cloud-restore-v1'), 'cloud conflict resolution does not protect meaningful local progress with a pre-restore backup'],
  [syncRuntime.includes('readCloudSave()') && syncRuntime.includes('shouldRestoreRemoteBundle(local, remote)') && syncRuntime.includes('pushCloudSave(local)') && syncRuntime.includes('window.location.reload()'), 'account save synchronization does not safely choose between local and remote progress'],
  [main.includes("import './game/profileCosmeticsExpansion'") && main.includes('installCloudAccountSyncRuntime()'), 'expanded profile collections or account synchronization are not installed at startup'],
  [sessionBridge.includes("number.id.startsWith('dmg-')") && sessionBridge.includes("number.id.startsWith('burn-')"), 'real outgoing damage is not counted for profile and elite progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Menu/profile/cloud progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Menu/profile/cloud progression audit passed: complete collections, safe account saves, chapter-10 equipment, all boss relic milestones, dust upgrades and weekly elite contracts are integrated.');
