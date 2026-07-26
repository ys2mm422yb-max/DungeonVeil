import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [mechanics, panel, plan] = await Promise.all([
  read('../src/game/guildRaidRoomsSixToTen.ts'),
  read('../src/components/GuildRaidRunPanel.tsx'),
  read('../../../docs/BLOCK_13_GUILD_RAID_ROOMS_6_10_EXECUTION_PLAN.md'),
]);

const checks = [
  [mechanics.includes('mirror-pairs') && mechanics.includes('rune-relay') && mechanics.includes('shadow-hunt') && mechanics.includes('shared-breath') && mechanics.includes('raid-gate'), 'all five advanced room identities are required'],
  [mechanics.includes("type: 'mirror'") && mechanics.includes("type: 'relay'") && mechanics.includes("type: 'mark'") && mechanics.includes("type: 'strike'") && mechanics.includes("type: 'stabilize'") && mechanics.includes("type: 'gate-role'") && mechanics.includes("type: 'gate-rune'") && mechanics.includes("type: 'gate-channel'"), 'advanced cooperative action surface is incomplete'],
  [mechanics.includes('createGuildRaidMutationKey') && mechanics.includes('mutateGuildRaidRunState') && mechanics.includes('snapshot.stateVersion'), 'authoritative versioned mutation path is missing'],
  [mechanics.includes('roomMechanicPatch: { block13: next }') && mechanics.includes('idempotencyKey'), 'canonical Block 13 state or idempotency handoff is missing'],
  [mechanics.includes('bossHandoffReady') && mechanics.includes("phase: ready ? 'cleared' : 'active'"), 'room 10 boss handoff contract is missing'],
  [panel.includes('GUILD_RAID_ADVANCED_ROOM_DEFINITIONS') && panel.includes('submitGuildRaidAdvancedRoomAction'), 'rooms 6-10 are not mounted in the live raid panel'],
  [panel.includes('guild-raid-mirror-sun') && panel.includes('guild-raid-relay') && panel.includes('guild-raid-shadow-mark') && panel.includes('guild-raid-stabilize') && panel.includes('guild-raid-gate-channel'), 'portrait touch controls for advanced rooms are incomplete'],
  [panel.includes('watchGuildRaidRun') && panel.includes('rejoinGuildRaidRun') && panel.includes('gap'), 'rejoin and version-gap reconciliation are missing'],
  [panel.includes('min-h-16') && panel.includes('overflow-y-auto'), 'mobile touch target or overflow protections are missing'],
  [plan.includes('Raum 6') && plan.includes('Raum 10') && plan.includes('Boss-Handoff'), 'execution plan contract is incomplete'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Block 13 guild raid rooms audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Block 13 guild raid rooms audit passed: rooms 6-10, advanced cooperation, authoritative mutations, rejoin reconciliation and boss handoff are wired.');
