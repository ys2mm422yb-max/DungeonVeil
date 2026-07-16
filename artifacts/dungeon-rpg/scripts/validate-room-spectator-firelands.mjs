import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const loading = read('src/components/GlobalLoadingLayer.tsx');
const spectator = read('src/components/SpectatorScreen.tsx');
const spectatorOnline = read('src/game/socialSpectatorOnline.ts');
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
assert(spectator.includes('SPIELER BESIEGT') && spectator.includes('SPIEL PAUSIERT') && spectator.includes('SPIELER IM MENÜ'), 'Spectator terminal and activity states are missing.');
assert(spectatorOnline.includes('SPECTATOR_REFRESH_MS = 500'), 'Spectator refresh must be tightened.');
assert(guild.includes('GUILD_CREATION_COST = 10000'), 'Guild creation must cost 10,000 gold.');
assert(guild.includes('Live zuschauen') && guild.includes('<SpectatorScreen'), 'Guild members need a live spectate action.');
assert(camera.includes('dungeonVeilSpectating') && camera.includes('distance: 28.6'), 'Portrait spectator framing must pull back on iPhone.');
assert(themes.includes('room >= 41 && room <= 50') && firelands.includes('FirelandsTheme_'), 'Rooms 41-50 need the firelands theme.');
assert(profile.includes('public-player-profile-equipment') && social.includes('equippedItems'), 'Public profiles need current equipment.');
assert(migration.includes("next_state in ('run', 'paused')") && migration.includes('shared guild required'), 'Supabase spectator RPC must retain paused snapshots and allow guild members.');
assert(migration.includes('equipped_items jsonb'), 'Supabase profile RPC must expose current equipment.');

console.log('Requested room, spectator, guild and firelands pass validated.');
