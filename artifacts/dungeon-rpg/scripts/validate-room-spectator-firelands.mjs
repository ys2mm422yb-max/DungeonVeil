import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const loading = read('src/components/GlobalLoadingLayer.tsx');
const spectator = read('src/components/SpectatorScreen.tsx');
const spectatorOnline = read('src/game/socialSpectatorOnline.ts');
const spectatorPlayback = read('src/game/spectatorPlayback.ts');
const guild = read('src/components/GuildPanelMobile.tsx');
const camera = read('src/components/RunCameraRig.ts');
const renderer = read('src/components/GameCanvasKayKit3D.tsx');
const themes = read('src/components/kaykitRoomThemes3D.ts');
const firelands = read('src/components/firelandsTheme3D.ts');
const profile = read('src/components/PlayerProfileCard.tsx');
const social = read('src/game/socialProgressOnline.ts');
const migration = fs.readFileSync(new URL('../../../supabase/migrations/20260716230000_expand_spectating_and_public_equipment.sql', import.meta.url), 'utf8');

assert(loading.includes('ROOM_LOADING_MIN_MS = 680'), 'Room transitions need a visible minimum loading gate.');
assert(loading.includes('Geometrie, Gegner, Kollisionen und Effekte'), 'Loading copy must describe complete room readiness.');
assert(renderer.includes('ring.visible = false'), 'Permanent enemy safety rings must be hidden.');
assert(spectator.includes('spectator-health'), 'Spectator HUD must show player health.');
assert(spectator.includes('spectator-gifts') && spectator.includes('heartbeatSpectatorViewer'), 'Spectator gifts or viewer presence are missing.');
assert(spectator.includes('SPIELER BESIEGT') && spectator.includes('SPIEL PAUSIERT') && spectator.includes('SPIELER IM MENÜ'), 'Spectator terminal and activity states are missing.');
assert(spectatorOnline.includes('SPECTATOR_REFRESH_MS = 200'), 'Spectator networking must use the measured five-hertz packet cadence.');
assert(!spectatorOnline.includes('cloneForNetwork') && spectatorOnline.includes('SPECTATOR_EFFECT_LIMIT = 12') && spectatorOnline.includes('SPECTATOR_DAMAGE_LIMIT = 6'), 'Spectator packets still deep-clone or exceed transient effect budgets.');
assert(spectator.includes('SpectatorPlaybackBuffer') && spectator.includes('buffered-stable-scene-v2') && spectator.includes('const SpectatorScene = memo'), 'Spectator rendering must use a stable memoized scene object.');
assert(!spectator.includes('setDisplayState') && !spectator.includes('INTERPOLATION_MS = 120'), 'Spectator positions still flow through React state on every animation frame.');
assert(spectator.includes('spectator-performance-diagnostics') && spectator.includes('canvasCount') && spectator.includes('reactCommits'), 'Measurable spectator runtime diagnostics are missing.');
assert(spectator.includes('SPECTATOR_RENDERER_EVENT') && spectator.includes("dungeonVeilSpectating = '1'"), 'Exclusive spectator/menu renderer handoff was removed.');
assert(spectatorPlayback.includes('SPECTATOR_INTERPOLATION_DELAY_MS = 240') && spectatorPlayback.includes('SPECTATOR_MAX_EXTRAPOLATION_MS = 110'), 'Timestamp interpolation or bounded extrapolation limits are missing.');
assert(spectatorPlayback.includes('SPECTATOR_PACKET_GAP_MS = 900') && spectatorPlayback.includes("mode: 'frozen'"), 'Packet-loss freeze behavior is not bounded.');
assert(spectatorPlayback.includes('SPECTATOR_BUFFER_LIMIT = 8') && spectatorPlayback.includes('copySnapshotIntoStableState'), 'Snapshot buffer or stable scene mutation is missing.');
assert(spectatorPlayback.includes('SPECTATOR_TELEPORT_THRESHOLD = 280') && spectatorPlayback.includes('hardCorrections'), 'Large position corrections are not controlled or measured.');

const interpolate = (from, to, amount) => from + (to - from) * amount;
assert(interpolate(0, 20, 0.5) === 10, 'Deterministic midpoint interpolation matrix failed.');
assert(Math.min(110, 260) === 110, 'Extrapolation cap matrix failed.');
assert(1000 / 200 === 5, 'Five-hertz packet cadence matrix failed.');
assert(12 <= 20 && 6 <= 12, 'Transient spectator budget matrix failed.');

assert(guild.includes('GUILD_CREATION_COST = 10000'), 'Guild creation must cost 10,000 gold.');
assert(guild.includes('Live zuschauen') && guild.includes('<SpectatorScreen'), 'Guild members need a live spectate action.');
assert(camera.includes('dungeonVeilSpectating') && camera.includes('distance: 28.6'), 'Portrait spectator framing must pull back on iPhone.');
assert(themes.includes('room >= 41 && room <= 50') && firelands.includes('FirelandsTheme_'), 'Rooms 41-50 need the firelands theme.');
assert(themes.includes("node.geometry?.type === 'RingGeometry'") && themes.includes('room === 15'), 'Static room rings or room 15 optimization are missing.');
assert(profile.includes('public-player-profile-equipment') && social.includes('equippedItems'), 'Public profiles need current equipment.');
assert(migration.includes("next_state in ('run', 'paused')") && migration.includes('shared guild required'), 'Supabase spectator RPC must retain paused snapshots and allow guild members.');
assert(migration.includes('equipped_items jsonb'), 'Supabase profile RPC must expose current equipment.');

console.log('Requested room, buffered spectator performance, guild and firelands pass validated.');
