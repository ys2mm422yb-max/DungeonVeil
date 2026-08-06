import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profilePath = 'artifacts/dungeon-rpg/src/lib/upgradeVisualTiers.ts';
const overlayPath = 'artifacts/dungeon-rpg/src/components/EquippedUpgradePrestigeOverlay.tsx';
const bindingsPath = 'artifacts/dungeon-rpg/src/components/UpgradeTierSurfaceBindings.tsx';
const bowRigPath = 'artifacts/dungeon-rpg/src/components/bowRig.ts';
const equipmentBindingPath = 'artifacts/dungeon-rpg/src/components/equipmentUpgradePrestige3D.ts';
const companionBindingPath = 'artifacts/dungeon-rpg/src/components/companionUpgradePrestige3D.ts';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';
const hotfixCssPath = 'artifacts/dungeon-rpg/src/components/upgradePrestigeMobileHotfix.css';
const prestigeJourneyPath = 'artifacts/dungeon-rpg/tests/upgrade-prestige-visual.spec.mjs';

const [profiles, overlay, bindings, bowRig, equipmentBinding, companionBinding, app, hotfixCss, prestigeJourney] = await Promise.all([
  readFile(profilePath, 'utf8'),
  readFile(overlayPath, 'utf8'),
  readFile(bindingsPath, 'utf8'),
  readFile(bowRigPath, 'utf8'),
  readFile(equipmentBindingPath, 'utf8'),
  readFile(companionBindingPath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(hotfixCssPath, 'utf8'),
  readFile(prestigeJourneyPath, 'utf8'),
]);

for (const tier of [1, 2, 3, 4, 5]) {
  assert.match(profiles, new RegExp(`\\b${tier}: Object\\.freeze\\(\\{`), `tier ${tier} profile must exist`);
}
assert.match(profiles, /tier: 1,[\s\S]*?edgeGlow: 0,[\s\S]*?particleDensity: 0,/);
assert.match(profiles, /tier: 2,[\s\S]*?edgeGlow: 0,[\s\S]*?particleDensity: 0,/);
assert.match(profiles, /tier: 3,[\s\S]*?prestige: 'refined'/);
assert.match(profiles, /tier: 4,[\s\S]*?prestige: 'strong'/);
assert.match(profiles, /tier: 5,[\s\S]*?prestige: 'maximum'/);
assert.match(profiles, /particleDensity: 0,[\s\S]*?particleIntervalMs: 0,[\s\S]*?pulseStrength: 0,[\s\S]*?lightSweepSpeed: 0/,
  'reduced-motion and low-GPU profiles must remove moving effects');

assert.match(overlay, /className="pointer-events-none fixed inset-0/,
  'the historical regression source must remain recognizable to the guard');
assert.doesNotMatch(app, /import \{ EquippedUpgradePrestigeOverlay \}/,
  'the application shell must never import the full-screen equipped overlay again');
assert.doesNotMatch(app, /<EquippedUpgradePrestigeOverlay \/>/,
  'the application shell must never mount a fixed full-screen equipment overlay');
assert.match(app, /import \{ UpgradeTierSurfaceBindings \}/);
assert.match(app, /<UpgradeTierSurfaceBindings \/>/,
  'the application shell must retain explicit local surface and companion bindings');
assert.match(app, /upgradePrestigeMobileHotfix\.css/,
  'the mobile safe-area and stale-overlay guards must be loaded by the real app');

assert.match(hotfixCss, /\[data-testid="equipped-upgrade-prestige-overlay"\][\s\S]*display: none !important/,
  'even a stale cached full-screen overlay must be suppressed');
assert.match(hotfixCss, /forge-mark-chamber-wrapper[\s\S]*top: env\(safe-area-inset-top\) !important/,
  'the equipment scroll viewport must remain below the iOS status bar');
assert.match(hotfixCss, /equipment-upgrade-preview[\s\S]*box-shadow: none !important/,
  'upgrade-stat panels must never receive item prestige decoration');

assert.match(bindings, /const EQUIPMENT_SURFACE_SELECTORS =/);
assert.match(bindings, /data-testid=\"equipment-model-preview\"/,
  'the actual equipment model preview must remain an eligible local surface');
assert.doesNotMatch(bindings, /equipment-upgrade-preview/,
  'the numeric upgrade preview must not be selected as an item model surface');
assert.doesNotMatch(bindings, /surface\.closest\('section'\)\?\.textContent|parentElement\?\.textContent|readable\.includes/,
  'equipment identity must never be guessed from surrounding visible text');
assert.match(bindings, /validOwnedEquipmentId\(surface\.dataset\.equipmentId, meta\)/,
  'explicit item identity must be preferred when present');
assert.match(bindings, /surface\.dataset\.equipmentPreviewModel/,
  'the selected preview must resolve through its exact authored model path');
assert.match(bindings, /equipmentVisualProfile\(id\)/,
  'preview model paths must resolve through the canonical equipment visual profile');
assert.match(bindings, /modelPath === visual\.primaryPath[\s\S]*modelPath === visual\.fallbackPath[\s\S]*modelPath === item\.assetPath/,
  'only exact model-path matches may bind the selected item tier');
assert.match(bindings, /if \(tier < 3\)[\s\S]*clearSurface\(surface\)/,
  'levels one and two must remove any previous local effect');
assert.match(bindings, /data-testid=\"equipment-model-preview\"\]\[data-upgrade-tier=\"4\"\]::after/,
  'moving sweeps must stay clipped to the actual preview surface');
assert.match(bindings, /pointer-events: none/,
  'local sweep layers must never intercept input');
assert.match(bindings, /prefers-reduced-motion: reduce/);
assert.match(bindings, /dungeon-veil-renderer-lost/);
assert.match(bindings, /dungeon-veil-renderer-ready/);

assert.match(bowRig, /function createPlayerBowUpgradeBinding\(THREE: any, heroRoot: any, bow: any\)/,
  'the live bow rig must own a mesh-local upgrade binding');
assert.match(bowRig, /startsWith\('KayKitPlayerBody_'\)/,
  'player prestige must never leak onto enemy bow rigs');
assert.match(bowRig, /const bowId = meta\.equipped\.bow;/);
assert.match(bowRig, /meta\.owned\[bowId\]\?\.level/,
  'the live bow mesh must use the actual equipped bow level');
assert.match(bowRig, /dungeonVeilUpgradeBinding: 'in-run-player-bow-mesh'/);
assert.match(bowRig, /if \(tier < 3\) return \{ update:/,
  'levels one and two must not clone materials or create a light');
assert.match(bowRig, /baseEmissive: material\.emissive\.clone/,
  'the bow binding must preserve each original emissive color');
assert.match(bowRig, /state\.material\.emissive\.copy\(state\.baseEmissive\)/,
  'every frame must restore the authored bow emissive color before adding a restrained accent');
assert.match(bowRig, /state\.material\.emissive\.lerp\(glowColor, blend\)/,
  'the prestige color must blend rather than replace the authored material');
assert.match(bowRig, /glowLight\.intensity = Math\.min\(0\.18/,
  'the moving bow light must remain below the mobile readability ceiling');
assert.doesNotMatch(bowRig, /material\.emissive\.setHex\(glowColor\)/,
  'the bow must never be recolored wholesale');
assert.match(bowRig, /dungeonVeilArmorUpgradeMaterialTint: false/,
  'the live player must expose that armor prestige does not tint the body materials');
assert.match(bowRig, /binding: 'in-run-player-armor-model-local-motes'/,
  'armor prestige must use a model-local non-material binding');
assert.match(bowRig, /binding: 'in-run-player-quiver-mesh'/);
assert.match(bowRig, /startsWith\('DungeonVeilEquippedQuiver_'\)/,
  'the quiver binding must attach only to the actual equipped quiver object');
assert.match(bowRig, /equipmentUpgradeBinding\.update\(pulse\)/,
  'live equipment prestige must follow player animation updates');

assert.match(equipmentBinding, /type EquipmentUpgradeSlot3D = 'armor' \| 'quiver'/);
assert.match(equipmentBinding, /if \(tier < 3\)/,
  'levels one and two must remain untouched on live armor and quiver objects');
assert.match(equipmentBinding, /if \(isArmor\) \{[\s\S]*new THREE\.OctahedronGeometry/,
  'armor prestige must use tiny model-local motes instead of body material recoloring');
assert.match(equipmentBinding, /DungeonVeilArmorUpgradeMotes_Tier/);
assert.match(equipmentBinding, /moteMaterial\.opacity = moteGroup\.visible \? Math\.min\(0\.34/,
  'armor motes must remain visually bounded');
assert.match(equipmentBinding, /return \{ tier, update \};[\s\S]*const accentColor = new THREE\.Color\(color\)/,
  'the armor branch must return before the quiver-only material traversal');
assert.match(equipmentBinding, /baseEmissive: material\.emissive\.clone/,
  'quiver materials must retain their authored emissive base');
assert.match(equipmentBinding, /state\.material\.emissive\.copy\(state\.baseEmissive\)/);
assert.match(equipmentBinding, /light\.intensity = Math\.min\(0\.16/,
  'quiver lighting must remain bounded on mobile');
assert.doesNotMatch(equipmentBinding, /material\.emissive\.setHex\(color\)/,
  'quiver prestige must not replace the authored material color');
assert.match(equipmentBinding, /staticFallbackActive\(\)/,
  'renderer recovery and Reduced Motion must be re-evaluated while the rig is alive');

assert.match(bindings, /import \{ createCompanionUpgradePrestigeBinding \} from '\.\/companionUpgradePrestige3D';/,
  'the mounted binding must still install live companion combat prestige');
assert.match(bindings, /root\?\.userData\?\.dungeonVeilCompanionV5/,
  'only real CompanionV5 combat roots may receive companion prestige');
assert.match(bindings, /startsWith\('CompanionVisual_'\)/,
  'companion prestige must attach to the model group rather than a DOM surrogate');
assert.match(bindings, /root\.userData\.companionLevel/,
  'the live companion effect must use that role instance own level');
assert.match(bindings, /createCompanionUpgradePrestigeBinding\(THREE, visual, role, level, definition\.accentHex\)/);
assert.match(bindings, /document\.documentElement\.dataset\.dungeonVeilActiveRun === '1'/);
assert.match(bindings, /queueMicrotask\(restoreSceneCapture\)/);
assert.match(bindings, /THREE\.Object3D\.prototype\.add = originalAdd/,
  'the shared Three.js prototype must be restored explicitly');
assert.match(bindings, /for \(const child of observedCompanionScene\.children \?\? \[\]\) bindCompanionCombatRoot\(child\)/);
assert.match(bindings, /window\.addEventListener\(COMPANION_ACTION_EVENT, handleCompanionAction\)/);
assert.match(bindings, /const actionPulse = entry\.actionEndsAt > now \? Math\.sin\(progress \* Math\.PI\) : 0;/);
assert.match(bindings, /entry\.binding\.update\(now, actionPulse\)/);
assert.match(bindings, /entry\.binding\.dispose\(\);[\s\S]*combatBindings\.delete\(root\)/);

assert.match(companionBinding, /normalizeUpgradeVisualTier\(level\)/);
assert.match(companionBinding, /dungeonVeilUpgradeBinding = 'in-run-companion-combat-mesh'/);
assert.match(companionBinding, /if \(tier < 3\) \{[\s\S]*publishRuntimeTelemetry\(role, tier, 'none', 0, false, false\)/,
  'companion levels one and two must stay effect-free while exposing factual telemetry');
assert.match(companionBinding, /material\?\.clone\?\.\(\)/);
assert.match(companionBinding, /new THREE\.PointLight\(/);
assert.match(companionBinding, /const accentColor = new THREE\.Color\(accentHex\);/);
assert.match(companionBinding, /prefersReducedMotion\(\) \|\| rendererRecoveryActive\(\)/);
assert.match(companionBinding, /dungeonVeilRendererRecovery === 'true'[\s\S]*dungeonVeilRendererRecovery === '1'/);
assert.match(companionBinding, /dungeonVeilLowGpu === 'true'[\s\S]*dungeonVeilLowGpu === '1'/);
assert.match(companionBinding, /const movingProfile = getUpgradeVisualProfile\(tier\);/);
assert.match(companionBinding, /const staticProfile = \(\(\) => \{[\s\S]*const staticFallback = true;/);
assert.match(companionBinding, /const profile = staticFallback \? staticProfile : movingProfile;/);
assert.match(companionBinding, /visual\.userData\.dungeonVeilUpgradeStaticFallback = staticFallback;/);
assert.match(companionBinding, /publishRuntimeTelemetry\([\s\S]*particleGroup\.visible,[\s\S]*staticFallback,/);
assert.doesNotMatch(companionBinding, /document\.createElement|appendChild|canvas/,
  'companion combat prestige must not create a DOM or second-canvas surrogate');

assert.match(prestigeJourney, /async function readTransientRoomTitleState\(page\)/);
assert.match(prestigeJourney, /return \{ owners, visibleOwners \};/);
assert.match(prestigeJourney, /owners\.length > 1 \|\| visibleOwners\.length > 1/);
assert.match(prestigeJourney, /visibleOwners\.length === 1[\s\S]*hiddenSince = 0/);
assert.match(prestigeJourney, /Date\.now\(\) - hiddenSince >= 1_200 \? 'stable' : 'settling'/);
assert.match(prestigeJourney, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.doesNotMatch(prestigeJourney, /resolveTransientRoomTitle|toHaveLength\(1\)/);

console.log('Upgrade visual tier contract passed.');
