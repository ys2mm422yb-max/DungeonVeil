import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [bundle, safety, cloud, runtime, saveManager, onlinePanel, updateGate, spectator, interpolation, spectatorScreen, spectatorQa, spectatorTest, browserConfig, menuScene, hud, themes, migration] = await Promise.all([
  read('../src/game/persistentSaveBundle.ts'),
  read('../src/game/cloudSaveSafety.ts'),
  read('../src/game/cloudSave.ts'),
  read('../src/game/cloudAccountSyncRuntime.ts'),
  read('../src/game/saveManager.ts'),
  read('../src/components/OnlinePanel.tsx'),
  read('../src/components/MainMenuUpdateGate.tsx'),
  read('../src/game/socialSpectatorOnline.ts'),
  read('../src/game/spectatorInterpolation.ts'),
  read('../src/components/SpectatorScreen.tsx'),
  read('../src/components/SpectatorPerformanceQa.tsx'),
  read('../tests/spectator-performance.spec.mjs'),
  read('../playwright.regression.config.mjs'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/components/kaykitRoomThemes3D.ts'),
  read('../../../supabase/migrations/20260716235500_cloud_conflict_guard_and_spectator_presence.sql'),
]);

const checks = [
  [bundle.includes('managedBundleKeys') && bundle.includes('localStorage.length') && bundle.includes('isCloudManagedKey'), 'cloud export does not dynamically include persistent Dungeon Veil keys'],
  [bundle.includes('activityAt?: number') && bundle.includes('progressWeight?: number') && bundle.includes('shouldRestoreRemoteBundle'), 'cloud bundles lack conflict metadata or legacy restore ordering'],
  [safety.includes('bundleHasCoreProgress') && safety.includes('shouldRestoreRemoteBundleSafely') && safety.includes('recoveryBundleForThinRemote') && safety.includes('STARTER_EQUIPMENT_IDS'), 'new-device core progress detection, safe ordering or recovery repair is incomplete'],
  [cloud.includes('rpc/upsert_guarded_game_save') && cloud.includes('bundleHasCoreProgress') && cloud.includes('shouldRestoreRemoteBundleSafely'), 'cloud pushes can still upload or restore a profile-only game bundle'],
  [migration.includes('for update') && migration.includes("jsonb_build_object('accepted', false") && migration.includes('upsert_guarded_game_save'), 'server-side cloud conflict guard is incomplete'],
  [saveManager.includes("SAVE_EVENT = 'dungeon-veil-save-changed'") && saveManager.includes('emitSaveChange();'), 'normal run saves do not notify the cloud sync runtime'],
  [runtime.includes('CLOUD_RECONCILE_MS = 10_000') && runtime.includes('bundleDataSignature') && runtime.includes('visibilitychange') && runtime.includes("window.addEventListener('focus'") && runtime.includes('SAVE_EVENT'), 'global cloud reconciliation is not frequent or browser-switch aware'],
  [runtime.includes('hydratedUserId') && runtime.includes('cloudAccountHydrated') && runtime.includes('pendingPush') && runtime.includes('readCloudSave') && runtime.includes('recoveryBundleForThinRemote'), 'account uploads are not gated behind pull-first hydration and thin-remote recovery'],
  [runtime.includes("window.addEventListener('pagehide'") && runtime.includes('cloudAccountHydrated()'), 'pagehide can upload before account hydration'],
  [onlinePanel.includes('data-testid="player-name-change-submit"') && onlinePanel.includes('setMyPlayerNameOnline') && onlinePanel.includes('commitServerPlayerNameChange') && onlinePanel.includes('applyConfirmedNameLocally') && onlinePanel.includes('void pushCloudSave()') && onlinePanel.includes('cloud-autosync-status') && !onlinePanel.includes('Spielstand hochladen') && !onlinePanel.includes('Spielstand herunterladen') && !onlinePanel.includes('Profil speichern'), 'online panel does not combine authoritative player-name confirmation with automatic cloud synchronization'],
  [updateGate.includes('CLOUD_POLL_MS = 15_000') && updateGate.includes('pullCloudSave') && updateGate.includes('window.location.reload'), 'main-menu multi-device refresh is missing'],
  [updateGate.includes('cloudAccountHydrated') && updateGate.includes('safeReload(false)') && !updateGate.includes('pull(true)'), 'main menu can still push a fresh device before its first pull'],
  [updateGate.includes('deployment.json') && updateGate.includes('UPDATE_DELAY_MS') && updateGate.includes('pushCloudSave'), 'safe automatic main-menu deployment update is missing'],
  [spectator.includes('SPECTATOR_REFRESH_MS = 100') && spectator.includes('SPECTATOR_PAYLOAD_LIMITS') && spectator.includes('damageNumbers: 6') && spectator.includes('particles: 12') && spectator.includes('effects: 16'), 'spectator network cadence or bounded payload budget changed'],
  [!spectator.includes('JSON.parse(JSON.stringify') && spectator.includes('authenticatedSupabaseRest') && spectator.includes('serializes the RPC body once'), 'spectator publisher still performs duplicate full-snapshot serialization'],
  [interpolation.includes('SPECTATOR_BUFFER_CAPACITY = 8') && interpolation.includes('SPECTATOR_INTERPOLATION_DELAY_MS = 140') && interpolation.includes('SPECTATOR_MAX_EXTRAPOLATION_MS = 80') && interpolation.includes('SPECTATOR_MAX_EXTRAPOLATION_PX = 28') && interpolation.includes('SPECTATOR_MAX_CORRECTION_STEP_PX = 10'), 'timestamped spectator buffer, extrapolation or correction limits are missing'],
  [interpolation.includes('duplicateSnapshots') && interpolation.includes('outOfOrderSnapshots') && interpolation.includes('roomResets') && interpolation.includes('networkHz') && interpolation.includes('maxPacketGapMs'), 'spectator interpolation diagnostics do not measure packet behaviour'],
  [interpolation.includes('reconcileStableArray') && interpolation.includes('Object.assign(stable, item)') && interpolation.includes('this.frames.splice(0, this.frames.length - SPECTATOR_BUFFER_CAPACITY)'), 'spectator objects or snapshot buffer are not kept stable and bounded'],
  [interpolation.includes('moveTowardPosition') && interpolation.includes('maxCorrectionStepPx') && interpolation.includes('this.motion.correction'), 'packet recovery can still apply hard position corrections'],
  [spectatorScreen.includes('SpectatorInterpolationBuffer') && spectatorScreen.includes('buffer?.sample(Date.now())') && spectatorScreen.includes('SPECTATOR_UI_PAINT_MS') && !spectatorScreen.includes('setDisplayState(next)'), 'spectator still drives full React state updates from every render frame'],
  [spectatorScreen.includes('spectator-performance-diagnostics') && spectatorScreen.includes('reactPaintHz') && spectatorScreen.includes('renderFps') && spectatorScreen.includes('maxExtrapolatedDistancePx'), 'spectator runtime performance diagnostics are incomplete'],
  [menuScene.includes('SPECTATOR_RENDERER_EVENT') && menuScene.includes('if (suspended) return null') && spectatorScreen.includes("detail: { active: true }") && spectatorScreen.includes("detail: { active: false }"), 'exclusive menu/spectator renderer handoff was removed'],
  [spectatorQa.includes('gapPhase >= 16 && gapPhase <= 19') && spectatorQa.includes('SpectatorInterpolationBuffer') && spectatorQa.includes('maxCorrectionStepPx') && spectatorQa.includes('document.querySelectorAll') && spectatorQa.includes('menuRendererSuspended'), 'deterministic spectator packet-loss and recovery QA is missing'],
  [browserConfig.includes('spectator-performance') && spectatorTest.includes('data-extrapolated-frames') && spectatorTest.includes('data-held-frames') && spectatorTest.includes('data-max-packet-gap-ms') && spectatorTest.includes('data-react-paint-hz') && spectatorTest.includes('data-canvases'), 'four-device spectator long-run regression is missing'],
  [spectatorTest.includes('toBeLessThanOrEqual(28.1)') && spectatorTest.includes('toBeLessThanOrEqual(10.1)') && spectatorTest.includes('toBeLessThanOrEqual(8)') && spectatorTest.includes('toBe(1)') && spectatorTest.includes('isContextLost'), 'spectator regression does not enforce bounded extrapolation, smooth correction, React paints, one renderer and healthy WebGL'],
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

console.log('Cloud sync and spectator performance validated: ten-hertz bounded payloads feed a timestamped eight-snapshot buffer, React paints stay throttled, extrapolation and correction are capped, and renderer handoff remains exclusive.');
