import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const requireText = (source, pattern, message) => {
  if (!pattern.test(source)) throw new Error(message);
};

const [mechanics, recovery, bridge, duoQa, gameCanvas, combatStage, sessionBridge, main, spec, hiddenHudSpec, postClearSpec, atomicReadySpec, config, workflow] = await Promise.all([
  read('src/game/roomMechanics.ts'),
  read('src/game/runRendererRecovery.ts'),
  read('src/game/runtimeEvidenceBridge.ts'),
  read('src/components/RuntimeDuoEvidenceQa.tsx'),
  read('src/components/GameCanvas.tsx'),
  read('src/components/CombatStage.tsx'),
  read('src/components/GameSessionBridge.tsx'),
  read('src/main.tsx'),
  read('tests/complete-runtime-evidence.spec.mjs'),
  read('tests/renderer-recovery-hidden-hud.spec.mjs'),
  read('tests/post-clear-player-hazards.spec.mjs'),
  read('tests/atomic-room-readiness.spec.mjs'),
  read('playwright.complete-runtime.config.mjs'),
  read('../../.github/workflows/complete-runtime-evidence-qa.yml'),
]);

requireText(mechanics, /!hasLivingEnemies\(engine\)/, 'Room mechanics must stop as soon as no living enemy remains.');
requireText(mechanics, /clearPendingHazards\(engine, state\)/, 'Pending room hazards must be cleared on room completion.');
requireText(mechanics, /engine\.state\.roomClearReady \|\| !hasLivingEnemies\(engine\)/, 'Room-clear and living-enemy guards must share the final hazard cleanup path.');
requireText(mechanics, /arc-warn-|forge-warn-/, 'Arc and forge warnings must be explicitly removable.');
requireText(recovery, /webglcontextlost/, 'The run renderer must listen for WebGL context loss.');
requireText(recovery, /WEBGL_lose_context/, 'The global renderer fallback must retain direct context restoration.');
requireText(recovery, /dungeon-veil-room-preparing/, 'Renderer loss must use the existing room save and input-freeze lifecycle.');
requireText(recovery, /dungeon-veil-renderer-lost/, 'Renderer recovery must expose a diagnostic event.');
requireText(recovery, /dungeon-veil-room-ready/, 'Renderer recovery must resume the engine after the visual context is ready.');
requireText(recovery, /runRendererIsMounted\(\)/, 'Renderer recovery must depend on the mounted run renderer, not HUD visibility.');
requireText(recovery, /primaryRecoverySignal/, 'The global renderer watchdog must observe the primary GameCanvas recovery lifecycle.');
requireText(recovery, /queueMicrotask/, 'The fallback must wait for the synchronous primary recovery signal before acting.');
requireText(recovery, /primaryRecoverySignal !== signalBeforePrimaryHandlers/, 'The fallback must not duplicate a primary renderer recovery.');
requireText(recovery, /PRIMARY_RECOVERY_GRACE_MS/, 'The primary renderer recovery must receive a bounded grace period.');
requireText(recovery, /primaryRecoveryStartedAt/, 'The watchdog must track when the primary recovery started.');
requireText(recovery, /!primaryRecoveryHasGrace/, 'The watchdog must not race the primary renderer remount.');
requireText(recovery, /fallbackActive/, 'The global renderer recovery must be an idempotent fallback.');
if (/RUN_HUD_SELECTOR/.test(recovery)) throw new Error('Renderer recovery must not fail when the HUD is hidden during a room transition.');
requireText(bridge, /127\.0\.0\.1|localhost/, 'Runtime evidence controls must remain localhost-only.');
requireText(bridge, /dungeon-veil-runtime-evidence-v1/, 'Runtime evidence controls require an explicit session marker.');
requireText(duoQa, /remotePlayer=\{remotePlayer\}/, 'Duo runtime evidence must render a real second player path.');
requireText(gameCanvas, /GameCanvasKayKit3D owns the only normal room-ready signal/, 'Only the atomically built Three.js room may release a normal room transition.');
const stageRoomBody = gameCanvas.match(/const stageRoom = async \(\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
if (/dungeon-veil-room-ready/.test(stageRoomBody)) throw new Error('The preload stage must never emit a premature room-ready signal.');
requireText(combatStage, /roomIdentity\(floor\)/, 'Run room titles must use the complete room bible instead of a 20-room list.');
requireText(combatStage, /identity\.nameEn.*identity\.nameDe/, 'Room titles must follow the selected language.');
requireText(combatStage, /data-room-title=\{roomTitle\}/, 'The runtime suite needs an explicit room-title evidence marker.');
if (/const ROOM_NAMES/.test(combatStage)) throw new Error('The obsolete 20-room title list must not return.');
requireText(sessionBridge, /runtimeSystemsReadyRef/, 'Independent runtime systems must pause with the room renderer.');
requireText(sessionBridge, /hasLivingEnemies\(engine\) && !engine\.state\.roomClearReady/, 'Player hazards must require a living combat encounter.');
requireText(sessionBridge, /clearPostCombatHazards/, 'Post-combat player hazard visuals must be removed.');
requireText(sessionBridge, /suspendPendingHazards/, 'Armed hazards must be cancelled when the renderer becomes unavailable.');
requireText(sessionBridge, /effects\.runeStrikeAt = 0/, 'Armed rune storms must be cancelled on renderer loss.');
requireText(sessionBridge, /roomMechanics\.warningAt = 0/, 'Armed room-mechanic warnings must be cancelled on renderer loss.');
requireText(main, /qaMode === 'runtime-duo'/, 'The dedicated Duo evidence view must be reachable by the test runner.');
requireText(main, /installRunRendererRecovery\(\)/, 'Renderer recovery must be installed at app startup.');
requireText(spec, /\[1, 10\].*\[11, 20\].*\[21, 30\].*\[31, 40\].*\[41, 50\]/s, 'The evidence suite must cover every room 1-50.');
requireText(spec, /\['solo', 'duo'\]/, 'The evidence suite must cover both Solo and Duo.');
requireText(spec, /room hazards stop before the final enemy death animation finishes/, 'The ghost-damage regression must be tested.');
requireText(spec, /lost WebGL context recovers/, 'The black-room recovery must be tested.');
requireText(hiddenHudSpec, /hud\.style\.display = 'none'/, 'The black-room regression must cover a hidden HUD during a room transition.');
requireText(hiddenHudSpec, /pageIdentity/, 'The hidden-HUD regression must prove recovery occurred without a fallback page reload.');
requireText(hiddenHudSpec, /saveReason\)\.toBe\('dungeon-session'\)/, 'The hidden-HUD regression must prove the real Solo run was saved.');
requireText(hiddenHudSpec, /frozen\.hp.*armed\.hp/s, 'The hidden-HUD regression must prove HP remains frozen while the renderer is unavailable.');
requireText(hiddenHudSpec, /evidence\.preparing.*toBe\(1\)/s, 'Renderer recovery must emit exactly one preparing lifecycle.');
requireText(hiddenHudSpec, /evidence\.lost.*toBe\(1\)/s, 'Renderer recovery must emit exactly one loss lifecycle.');
requireText(hiddenHudSpec, /evidence\.ready.*toBe\(1\)/s, 'Renderer recovery must emit exactly one recovered lifecycle.');
requireText(postClearSpec, /\[13, 16, 19\]/, 'All rune-storm rooms must be covered by post-clear regression evidence.');
requireText(postClearSpec, /rune-warning-/, 'The post-clear regression must arm a real rune storm before killing enemies.');
requireText(postClearSpec, /killLivingEnemies/, 'The post-clear regression must remove the final living enemies.');
requireText(postClearSpec, /settled\.hp.*armed\.hp/s, 'The post-clear regression must prove player HP cannot change afterward.');
requireText(atomicReadySpec, /\[13, 14, 21, 41, 50\]/, 'Complex rooms across every later visual phase must be covered by atomic readiness evidence.');
requireText(atomicReadySpec, /evidence\.ready.*toBe\(1\)/s, 'Each complex room transition must expose exactly one normal room-ready signal.');
requireText(atomicReadySpec, /waitForPaintedCanvas/, 'Atomic room readiness must finish with a painted Three.js canvas.');
requireText(config, /post-clear-player-hazards/, 'The complete browser matrix must include post-clear player hazard regressions.');
requireText(config, /atomic-room-readiness/, 'The complete browser matrix must include atomic room readiness regressions.');
requireText(workflow, /tests\/post-clear-player-hazards\.spec\.mjs/, 'The GitHub workflow must execute post-clear player hazard evidence.');
requireText(workflow, /tests\/atomic-room-readiness\.spec\.mjs/, 'The GitHub workflow must execute atomic room readiness evidence.');
requireText(config, /video: \{ mode: 'on'/, 'Successful evidence runs must always record video.');
requireText(config, /iphone-webkit[\s\S]*android-chromium[\s\S]*ipad-landscape-webkit[\s\S]*desktop-chromium/, 'The complete four-device matrix is required.');

console.log('Complete runtime stability contract verified.');
