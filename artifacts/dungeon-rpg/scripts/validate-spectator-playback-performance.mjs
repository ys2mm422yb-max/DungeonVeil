import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [screen, playback, buffer, online, bridge, menu, simulator] = await Promise.all([
  read('../src/components/SpectatorScreen.tsx'),
  read('../src/components/SpectatorPlaybackStage.tsx'),
  read('../src/game/spectatorInterpolation.ts'),
  read('../src/game/socialSpectatorOnline.ts'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/MainMenuDungeonScene.tsx'),
  read('./spectator-interpolation-simulator.mjs'),
]);

const checks = [
  [buffer.includes('class SpectatorSnapshotBuffer') && buffer.includes('SPECTATOR_BUFFER_LIMIT = 8') && buffer.includes('SPECTATOR_INTERPOLATION_DELAY_MS = 165'), 'timestamped bounded spectator buffer is missing'],
  [buffer.includes('SPECTATOR_MAX_EXTRAPOLATION_MS = 120') && buffer.includes("requestedExtrapolationMs <= SPECTATOR_MAX_EXTRAPOLATION_MS ? 'extrapolate' : 'hold'") && buffer.includes('if (extrapolationMs > 0)') && buffer.includes('clamp(projected - to, -32, 32)'), 'spectator extrapolation does not stop in a bounded hold state'],
  [buffer.includes('this.output.player = replacement.player') && buffer.includes('Object.assign(this.output, replacement)') && !buffer.includes('this.output = cloneState(target);\n      this.outputRoomKey = key;\n      this.lastSampleAt = 0;\n      this.metrics.roomResets += 1;\n    }\n    return this.output;'), 'stable playback root is replaced on room changes'],
  [screen.includes('<SpectatorPlaybackStage stableState={stageState} />') && !screen.includes('<CombatStage') && !screen.includes('setDisplayState') && !screen.includes('interpolateState'), 'spectator still rerenders the combat tree on animation frames'],
  [screen.includes('HUD_PAINT_MS = 250') && screen.includes('bufferRef.current.sample(now)') && screen.includes('requestAnimationFrame(animate)') && screen.includes('setHud(nextHud)'), 'spectator playback and low-frequency HUD cadences are not separated'],
  [screen.includes("const next = await loadFriendSpectatorFeed(friendId);\n        const receivedAt = Date.now();") && screen.includes('bufferRef.current.push(next.snapshot.emittedAt, next.snapshot.state, receivedAt)'), 'spectator packet timing is not measured at actual response arrival'],
  [playback.includes('data-render-contract="single-stable-three-state"') && playback.includes('<GameCanvasKayKit3D gameState={stableState} />'), 'spectator does not mount a single stable Three.js state object'],
  [screen.includes('SPECTATOR_RENDERER_EVENT') && screen.includes('active: true') && screen.includes('active: false') && screen.includes('data-renderer-handoff="exclusive"'), 'exclusive menu/spectator renderer handoff was removed'],
  [menu.includes('SPECTATOR_RENDERER_EVENT') && menu.includes('if (suspended) return null'), 'menu renderer does not release its WebGL context while spectating'],
  [online.includes('SPECTATOR_PUBLISH_MS = 125') && online.includes('SPECTATOR_POLL_MS = 125') && online.includes('SPECTATOR_KEYFRAME_MS = 1_000'), 'network, polling and room-keyframe cadences are not explicit'],
  [online.includes('const { map, ...stateWithoutMap } = state;') && online.includes('...stateWithoutMap') && online.includes("...(keyframe ? { map: compactMap(map) } : {})") && !online.includes('const safeState: SpectatorNetworkState = {\n    ...state,'), 'spectator delta packets still include the full room map outside keyframes'],
  [online.includes('version: 2') && online.includes('keyframe') && online.includes('spectatorMapCache') && online.includes('raw.state.map ??'), 'compact snapshot v2 cannot recover room maps for late joiners'],
  [online.includes('SPECTATOR_DAMAGE_LIMIT = 8') && online.includes('SPECTATOR_PARTICLE_LIMIT = 12') && online.includes('SPECTATOR_EFFECT_LIMIT = 14') && online.includes('nearPlayer'), 'spectator transient objects are not spatially and numerically bounded'],
  [bridge.includes('SPECTATOR_PUBLISH_MS') && bridge.includes('window.setInterval(() => void publish(), SPECTATOR_PUBLISH_MS)'), 'host publish loop does not use the dedicated spectator cadence'],
  [screen.includes("PERFORMANCE_KEY = 'dungeon-veil-spectator-performance'") && screen.includes('reactRenders') && screen.includes('interpolationFrames') && screen.includes('extrapolationFrames'), 'measurable spectator performance diagnostics are missing'],
  [simulator.includes('JITTER') && simulator.includes('MAX_EXTRAPOLATION_MS') && simulator.includes('maxFrameStep') && simulator.includes('maxFrozenMs'), 'deterministic jitter and packet-loss simulation is incomplete'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Spectator playback performance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Spectator playback performance audit passed: map-free delta packets, compact keyframes, buffered timestamp interpolation, bounded extrapolation-to-hold, stable Three.js playback, exclusive renderer handoff and diagnostics are protected.');
