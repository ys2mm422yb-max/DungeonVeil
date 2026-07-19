import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [bundle, safety, cloud, runtime, saveManager, onlinePanel, updateGate, spectator, spectatorPlayback, spectatorScreen, hud, themes, migration] = await Promise.all([
  read('../src/game/persistentSaveBundle.ts'),
  read('../src/game/cloudSaveSafety.ts'),
  read('../src/game/cloudSave.ts'),
  read('../src/game/cloudAccountSyncRuntime.ts'),
  read('../src/game/saveManager.ts'),
  read('../src/components/OnlinePanel.tsx'),
  read('../src/components/MainMenuUpdateGate.tsx'),
  read('../src/game/socialSpectatorOnline.ts'),
  read('../src/game/spectatorPlayback.ts'),
  read('../src/components/SpectatorScreen.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/components/kaykitRoomThemes3D.ts'),
  read('../../../supabase/migrations/20260716235500_cloud_conflict_guard_and_spectator_presence.sql'),
]);

const checks = [
  [bundle.includes('managedBundleKeys') && bundle.includes('localStorage.length') && bundle.includes('isCloudManagedKey'), 'cloud export does not dynamically include persistent Dungeon Veil keys'],
  [bundle.includes('activityAt?: number') && bundle.includes('progressWeight?: number') && bundle.includes('shouldRestoreRemoteBundle'), 'cloud bundles lack conflict metadata or legacy restore ordering'],
  [safety.includes('bundleHasCoreProgress') && safety.includes('shouldRestoreRemoteBundleSafely') && safety.includes('recoveryBundleForThinRemote') && safety.includes('STARTER_EQUIPMENT_IDS'), 'new-device core progress detection, safe ordering or recovery repair is incomplete'],
  [cloud.includes("rpc/upsert_guarded_game_save") && cloud.includes('bundleHasCoreProgress') && cloud.includes('shouldRestoreRemoteBundleSafely'), 'cloud pushes can still upload or restore a profile-only game bundle'],
  [migration.includes('for update') && migration.includes("jsonb_build_object('accepted', false") && migration.includes('upsert_guarded_game_save'), 'server-side cloud conflict guard is incomplete'],
  [saveManager.includes("SAVE_EVENT = 'dungeon-veil-save-changed'") && saveManager.includes('emitSaveChange();'), 'normal run saves do not notify the cloud sync runtime'],
  [runtime.includes('CLOUD_RECONCILE_MS = 10_000') && runtime.includes('bundleDataSignature') && runtime.includes('visibilitychange') && runtime.includes("window.addEventListener('focus'") && runtime.includes('SAVE_EVENT'), 'global cloud reconciliation is not frequent or browser-switch aware'],
  [runtime.includes('hydratedUserId') && runtime.includes('cloudAccountHydrated') && runtime.includes('pendingPush') && runtime.includes('readCloudSave') && runtime.includes('recoveryBundleForThinRemote'), 'account uploads are not gated behind pull-first hydration and thin-remote recovery'],
  [runtime.includes("window.addEventListener('pagehide'") && runtime.includes('cloudAccountHydrated()'), 'pagehide can upload before account hydration'],
  [onlinePanel.includes('data-testid="player-name-change-submit"') && onlinePanel.includes('setMyPlayerNameOnline') && onlinePanel.includes('commitServerPlayerNameChange') && onlinePanel.includes('applyConfirmedNameLocally') && onlinePanel.includes('void pushCloudSave()') && onlinePanel.includes('cloud-autosync-status') && !onlinePanel.includes('Spielstand hochladen') && !onlinePanel.includes('Spielstand herunterladen') && !onlinePanel.includes('Profil speichern'), 'online panel does not combine authoritative player-name confirmation with automatic cloud synchronization'],
  [updateGate.includes('CLOUD_POLL_MS = 15_000') && updateGate.includes('pullCloudSave') && updateGate.includes('window.location.reload'), 'main-menu multi-device refresh is missing'],
  [updateGate.includes('cloudAccountHydrated') && updateGate.includes('safeReload(false)') && !updateGate.includes('pull(true)'), 'main menu can still push a fresh device before its first pull'],
  [updateGate.includes('deployment.json') && updateGate.includes('UPDATE_DELAY_MS') && updateGate.includes('pushCloudSave'), 'safe automatic main-menu deployment update is missing'],
  [spectator.includes('SPECTATOR_REFRESH_MS = 200') && spectator.includes('SPECTATOR_EFFECT_LIMIT = 12') && spectator.includes('runSkills: { ...state.runSkills }'), 'spectator feed is not compact five-hertz and gift-aware'],
  [spectatorPlayback.includes('SPECTATOR_BUFFER_LIMIT = 8') && spectatorPlayback.includes('SPECTATOR_INTERPOLATION_DELAY_MS = 240') && spectatorPlayback.includes('SPECTATOR_MAX_EXTRAPOLATION_MS = 110'), 'spectator buffer, timestamp interpolation or extrapolation cap is missing'],
  [spectatorScreen.includes('SpectatorPlaybackBuffer') && spectatorScreen.includes('const SpectatorScene = memo') && !spectatorScreen.includes('setDisplayState') && spectatorScreen.includes('spectator-gifts') && spectatorScreen.includes('heartbeatSpectatorViewer'), 'spectator smoothing, stable scene rendering, gifts or heartbeat are missing'],
  [spectatorScreen.includes('spectator-performance-diagnostics') && spectatorScreen.includes('canvasCount') && spectatorScreen.includes('reactCommits'), 'spectator runtime diagnostics do not measure renderer exclusivity or React churn'],
  [hud.includes('spectator-viewer-count') && hud.includes('loadMySpectatorViewerCount'), 'the watched player cannot see the current viewer count'],
  [migration.includes('spectator_viewers') && migration.includes('heartbeat_spectator_viewer') && migration.includes('get_my_spectator_viewer_count'), 'spectator presence storage or RPCs are missing'],
  [themes.includes("node.geometry?.type === 'RingGeometry'") && themes.includes('node.visible = false'), 'decorative static room rings are not removed'],
  [themes.includes('room === 15') && themes.includes('pointLights > 1') && themes.includes('animatedDecor'), 'room 15 does not receive its mobile performance reduction'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Cloud/realtime/performance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Explicit player-name confirmation, pull-first account hydration, thin-bundle protection, recovery repair, automatic cloud reconciliation, safe updates, buffered spectating and mobile performance validated.');
