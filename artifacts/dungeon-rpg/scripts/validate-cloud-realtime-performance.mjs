import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [bundle, cloud, updateGate, spectator, spectatorScreen, hud, themes, migration] = await Promise.all([
  read('../src/game/persistentSaveBundle.ts'),
  read('../src/game/cloudSave.ts'),
  read('../src/components/MainMenuUpdateGate.tsx'),
  read('../src/game/socialSpectatorOnline.ts'),
  read('../src/components/SpectatorScreen.tsx'),
  read('../src/components/HUD.tsx'),
  read('../src/components/kaykitRoomThemes3D.ts'),
  read('../../../supabase/migrations/20260716235500_cloud_conflict_guard_and_spectator_presence.sql'),
]);

const checks = [
  [bundle.includes('managedBundleKeys') && bundle.includes('localStorage.length') && bundle.includes('isCloudManagedKey'), 'cloud export does not dynamically include persistent Dungeon Veil keys'],
  [bundle.includes('activityAt?: number') && bundle.includes('progressWeight?: number') && bundle.includes('shouldRestoreRemoteBundle'), 'cloud bundles lack conflict metadata or restore ordering'],
  [cloud.includes("rpc/upsert_guarded_game_save") && cloud.includes('shouldRestoreRemoteBundle(bundle, result.payload)'), 'cloud pushes are not protected from stale-device overwrite'],
  [migration.includes('for update') && migration.includes("jsonb_build_object('accepted', false") && migration.includes('upsert_guarded_game_save'), 'server-side cloud conflict guard is incomplete'],
  [updateGate.includes('CLOUD_POLL_MS = 15_000') && updateGate.includes('pullCloudSave') && updateGate.includes('window.location.reload'), 'main-menu multi-device refresh is missing'],
  [updateGate.includes('deployment.json') && updateGate.includes('UPDATE_DELAY_MS') && updateGate.includes('pushCloudSave'), 'safe automatic main-menu deployment update is missing'],
  [spectator.includes('SPECTATOR_REFRESH_MS = 100') && spectator.includes('runSkills: { ...state.runSkills }'), 'spectator feed is not ten-hertz and gift-aware'],
  [spectatorScreen.includes('INTERPOLATION_MS = 120') && spectatorScreen.includes('spectator-gifts') && spectatorScreen.includes('heartbeatSpectatorViewer'), 'spectator smoothing, gifts or heartbeat are missing'],
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

console.log('Cloud multi-device, safe updates, 10Hz spectating, viewer presence, gifts, ring cleanup and room 15 performance validated.');

// Deployment validation marker for merged PR #185.
