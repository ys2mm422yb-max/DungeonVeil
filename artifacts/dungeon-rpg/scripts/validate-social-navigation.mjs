import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, mailbox, inviteCard, client, migration, main, stage, band] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/MailboxPanel.tsx'),
  read('../src/components/GuildInviteLinkCard.tsx'),
  read('../src/game/guildMailboxOnline.ts'),
  read('../../../supabase/migrations/20260713020000_guild_invite_links_and_player_mailbox.sql'),
  read('../src/main.tsx'),
  read('../src/components/WorldBossDedicatedStage.tsx'),
  read('../src/components/WorldBossCombatBandStage.tsx'),
]);

const checks = [
  [menu.includes('data-testid="mailbox-button"') && menu.includes('<MailboxPanel'), 'main-menu mailbox entry is missing'],
  [!menu.includes('WeeklyRiftPanel') && !menu.includes("overlay === 'rift'") && !menu.includes("setOverlay('rift')"), 'weekly-rift shortcut or panel is still mounted in the main menu'],
  [menu.includes('<GuildInviteLinkCard') && inviteCard.includes('createGuildInviteLinkOnline') && inviteCard.includes('navigator.share'), 'shareable guild invite link UI is missing'],
  [client.includes('captureGuildInviteTokenFromUrl') && client.includes('claimPendingGuildInviteLink') && client.includes('rpc/claim_guild_invite_link'), 'guild invitation link claim flow is incomplete'],
  [mailbox.includes('acceptGuildInvite') && mailbox.includes('declineGuildInvite') && mailbox.includes('markMailboxActioned'), 'mailbox invitation actions are incomplete'],
  [migration.includes('create table if not exists public.guild_invite_links') && migration.includes('create table if not exists public.player_mailbox'), 'guild invite link or mailbox table migration is missing'],
  [migration.includes('enable row level security') && migration.includes('security definer') && migration.includes('extensions.digest'), 'mailbox and link security controls are incomplete'],
  [main.includes("qaMode === 'worldboss'") && main.includes('<WorldBossVisualQa'), 'world-boss visual QA route is missing'],
  [stage.includes('const ARENA_DEPTH = 20.4;') && stage.includes("dais.name = 'AshKingDais'") && stage.includes("threshold.name = 'VeilGateThreshold'") && stage.includes("channel.name = 'EmberChannel'"), 'semantic ritual arena set pieces are missing'],
  [band.includes('data-testid="worldboss-combat-band"') && band.includes('ritual-arena-meaning'), 'world-boss combat band QA markers are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Social/navigation audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Social/navigation audit passed: weekly rift removed, mailbox active, secure guild links available, and the semantic Ash King ritual arena is QA-addressable.');
