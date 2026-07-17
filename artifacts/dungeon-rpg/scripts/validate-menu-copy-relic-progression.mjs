import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [credits, inventory, presentation, gates, relics, retention, daily, dailyRuntime, reward, effects, menu, friends, guild, worldboss, quests, profile, publicProfile, weekly, bundle, syncRuntime, settingsPersistence, markers, unlockLayer, globalLoading, loading, sessionBridge, main] = await Promise.all([
  read('../src/components/screens/CreditsScreen.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/game/equipmentPresentation.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/dailyQuests.ts'),
  read('../src/game/dailyQuestRotationRuntime.ts'),
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
  read('../src/game/settingsPersistence.ts'),
  read('../src/game/newContentMarkers.ts'),
  read('../src/components/UnlockPresentationLayer.tsx'),
  read('../src/components/GlobalLoadingLayer.tsx'),
  read('../src/components/LoadingScreen.tsx'),
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
  [quests.includes('Gold-Auftrag') && quests.includes("data-quest-kind={task.gold ? 'gold' : 'standard'}"), 'daily gold quests are still mislabeled as weekly elite contracts'],
  [daily.includes('return [standard[0].id, standard[1].id, gold[0].id]') && daily.includes('dailyTimeLabel') && quests.includes('daily-quest-reset-timer') && !quests.includes('Heute ist kein seltener Gold-Auftrag aktiv.'), 'daily rotations do not guarantee one gold quest with a visible 24-hour timer'],
  [dailyRuntime.includes('DAILY_ROTATION_VERSION') && dailyRuntime.includes('ensureDailyQuestRotation') && dailyRuntime.includes('nextDailyResetAt') && dailyRuntime.includes("window.addEventListener('focus'") && dailyRuntime.includes('visibilitychange'), 'daily and gold quests are not persisted and refreshed at the next local day boundary'],
  [weekly.includes("id: 'enemy-hunt'") && weekly.includes("id: 'contract-master'") && weekly.includes('ownedRewardIds') && weekly.includes('eliteMarks'), 'weekly elite rotation or permanent rewards are incomplete'],
  [profile.includes("type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars'") && profile.includes('Visitenkarten') && profile.includes('profile-collection-summary') && !profile.includes("| 'weekly'"), 'profile collections are incomplete or elite contracts leaked back into the profile'],
  [publicProfile.includes('resolveOnlineAvatar') && publicProfile.includes('resolveOnlineTitle') && publicProfile.includes('resolveOnlineCard'), 'public profiles do not display equipped cosmetics'],
  [markers.includes('MARKER_VERSION = 2') && markers.includes('announcedEquipment') && markers.includes('announcedRelics') && markers.includes('unannouncedEquipmentIds') && markers.includes('markEquipmentAnnounced') && markers.includes('...currentEquipment') && markers.includes('...currentRelics'), 'unlock notifications are not separated from inventory NEW markers or legacy items can replay'],
  [unlockLayer.includes('unannouncedEquipmentIds') && unlockLayer.includes('unannouncedRelicIds') && unlockLayer.includes('persistAnnouncement(next)') && unlockLayer.includes('APP_BOOT_READY_EVENT') && unlockLayer.includes("document.documentElement.dataset.dungeonVeilBootReady === '1'") && unlockLayer.includes('if (!bootReady || !current) return null'), 'unlock notices can replay, miss the boot-ready signal or appear over the boot screen'],
  [globalLoading.includes("APP_BOOT_READY_EVENT = 'dungeon-veil-app-boot-ready'") && globalLoading.includes("document.documentElement.dataset.dungeonVeilBootReady = '1'") && loading.includes('data-boot-presentation="veil-gate"'), 'the dedicated boot sequence does not gate menu notifications'],
  [bundle.includes("'dungeon-veil-player-profile-v1'") && bundle.includes("'dungeon-veil-weekly-elite-v1'") && bundle.includes("'dungeon-veil-seen-unlocks-v1'"), 'cloud bundle omits profile cosmetics, elite rewards or new-content markers'],
  [bundle.includes('shouldRestoreRemoteBundle') && bundle.includes('bundleProgressWeight') && bundle.includes('bundleActivityTimestamp') && bundle.includes('dungeon-veil-pre-cloud-restore-v1'), 'cloud conflict resolution does not protect meaningful local progress with a pre-restore backup'],
  [syncRuntime.includes('readCloudSave()') && syncRuntime.includes('shouldRestoreRemoteBundle(local, remote)') && syncRuntime.includes('pushCurrentAccountState(true)') && syncRuntime.includes('CLOUD_RECONCILE_MS = 10_000') && syncRuntime.includes('SETTINGS_PERSISTENCE_EVENT') && syncRuntime.includes('window.location.reload()'), 'account save and settings synchronization does not safely reconcile local and remote progress'],
  [settingsPersistence.includes('profile.updatedAt = updatedAt') && settingsPersistence.includes('dungeon-veil-settings-activity-v1'), 'settings changes are not protected by the guarded cloud activity timestamp'],
  [main.includes("import './game/profileCosmeticsExpansion'") && main.includes('installDailyQuestRotationRuntime();') && main.includes('installControlSettings();') && main.indexOf('installDailyQuestRotationRuntime();') < main.indexOf('installCloudAccountSyncRuntime();'), 'daily rotation, settings migration or account synchronization are not installed safely at startup'],
  [sessionBridge.includes("number.id.startsWith('dmg-')") && sessionBridge.includes("number.id.startsWith('burn-')"), 'real outgoing damage is not counted for profile and elite progress'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Menu/profile/cloud progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Menu/profile/cloud progression audit passed: one-time unlock notices, gated Veil boot, daily rotations, durable settings, safe account saves and weekly elite contracts are integrated.');
