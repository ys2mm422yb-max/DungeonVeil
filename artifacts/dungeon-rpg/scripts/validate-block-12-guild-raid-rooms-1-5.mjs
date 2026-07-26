import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [mechanics, panel, portal, app, plan] = await Promise.all([
  read('../src/game/guildRaidRoomsOneToFive.ts'),
  read('../src/components/GuildRaidRunPanel.tsx'),
  read('../src/components/GuildRaidRunPortal.tsx'),
  read('../src/App.tsx'),
  read('../../../docs/BLOCK_12_GUILD_RAID_ROOMS_1_5_EXECUTION_PLAN.md'),
]);

const checks = [
  [mechanics.includes('veil-anchors') && mechanics.includes('split-guard-lines') && mechanics.includes('veil-burden') && mechanics.includes('cleansing-circle') && mechanics.includes('four-seals'), 'all five room identities are required'],
  [mechanics.includes("type: 'anchor'") && mechanics.includes("type: 'line'") && mechanics.includes("type: 'interrupt'") && mechanics.includes("type: 'burden-pass'") && mechanics.includes("type: 'cleanse'") && mechanics.includes("type: 'seal'"), 'cooperative room action surface is incomplete'],
  [mechanics.includes('createGuildRaidMutationKey') && mechanics.includes('mutateGuildRaidRunState') && mechanics.includes('snapshot.stateVersion'), 'authoritative versioned mutation path is missing'],
  [mechanics.includes("roomMechanicPatch: { block12: next }") && mechanics.includes('idempotencyKey'), 'canonical mechanic state or idempotency handoff is missing'],
  [mechanics.includes("phase === 'cleared'") && mechanics.includes("throw new Error('Aktion passt nicht"), 'terminal lockout or invalid-action rejection is missing'],
  [panel.includes('watchGuildRaidRun') && panel.includes('rejoinGuildRaidRun') && panel.includes('gap'), 'rejoin and version-gap reconciliation are missing'],
  [panel.includes('guild-raid-run-panel') && panel.includes('guild-raid-run-overlay') && panel.includes('min-h-14'), 'mobile raid runtime or safe touch targets are missing'],
  [portal.includes('guild-raid-started-handoff') && portal.includes('guild-raid-enter-run'), 'lobby-to-run handoff is not wired'],
  [app.includes('<GuildRaidRunPortal />'), 'raid run portal is not mounted'],
  [!mechanics.toLowerCase().includes('duo') && !panel.toLowerCase().includes('coop-lobby'), 'Block 12 improperly reuses Duo runtime'],
  [plan.includes('Raum 1 – Schleieranker') && plan.includes('Raum 5 – Vier Siegel') && plan.includes('Doppeltap- und Idempotenzschutz'), 'execution plan contract is incomplete'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Block 12 guild raid rooms audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Block 12 guild raid rooms audit passed: five cooperative rooms, authoritative mutations, rejoin reconciliation and portrait-mobile runtime are wired.');
