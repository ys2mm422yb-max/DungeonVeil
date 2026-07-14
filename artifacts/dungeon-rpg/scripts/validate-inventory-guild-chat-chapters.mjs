import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, inventory, hub, guildPanel, chatPanel, chatClient, meta, gates, migration, invitePermissionFix] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/GuildChatPanel.tsx'),
  read('../src/game/guildChatOnline.ts'),
  read('../src/game/metaProgression.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../../../supabase/migrations/20260714183000_guild_text_chat.sql'),
  read('../../../supabase/migrations/20260714194500_fix_guild_invite_mailbox_permission.sql'),
]);

const checks = [
  [menu.includes("language === 'de' ? 'Inventar' : 'Inventory'") && !menu.includes("'Schleierkammer' : 'Veil Chamber'") && menu.includes('recordReachedChapter(props.saveData?.chapter ?? 1)'), 'main-menu inventory label or saved chapter migration is missing'],
  [inventory.includes("'INVENTAR' : 'INVENTORY'") && inventory.includes('equipmentUnlockChapter') && inventory.includes("'AB KAPITEL' : 'FROM CHAPTER'"), 'inventory heading or chapter requirement is missing'],
  [!hub.includes('detailDe') && !hub.includes('detailEn') && !hub.includes('Mira') && !hub.includes('Orin') && !hub.includes('Tala') && !hub.includes('Brom') && !hub.includes('Aelric'), 'NPC names remain below the main-menu routes'],
  [guildPanel.includes("type GuildTab = 'overview' | 'chat' | 'members' | 'invite'") && guildPanel.includes("tabButton('chat', 'Chat')") && guildPanel.includes('<GuildChatPanel guildId={membership.guild.id}'), 'guild chat tab is not mounted'],
  [chatPanel.includes('window.setInterval') && chatPanel.includes('5000') && chatPanel.includes('maxLength={400}') && chatPanel.includes('guild-chat-send'), 'guild chat polling, input limit or send control is missing'],
  [chatClient.includes("authenticatedSupabaseRest('guild_messages'") && chatClient.includes('listGuildChatMessages') && chatClient.includes('sendGuildChatMessage'), 'authenticated guild chat client is incomplete'],
  [meta.includes('equipmentUnlockedForCurrentProgress(item.id)') && meta.includes('recordReachedChapter(chapter)'), 'equipment drops are not chapter gated'],
  [gates.includes("'warden-bow': 4") && gates.includes("'veil-eye': 4") && gates.includes("'hunter-bow': 2") && !gates.match(/: [5-9],/), 'equipment must all unlock by chapter 4'],
  [migration.includes('alter table public.guild_messages enable row level security') && migration.includes('guild_messages_read_members') && migration.includes('guild_messages_send_members') && migration.includes('user_id = (select auth.uid())') && migration.includes('guild_messages_user_idx'), 'guild chat RLS or required indexes are incomplete'],
  [invitePermissionFix.includes('create or replace function public.accept_guild_invite') && invitePermissionFix.includes('update public.guild_invites') && !invitePermissionFix.includes('update public.player_mailbox') && invitePermissionFix.includes('grant execute on function public.accept_guild_invite(uuid) to authenticated'), 'guild invite acceptance still writes directly to the protected mailbox table'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Inventory/guild-chat/chapter audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Inventory/guild-chat/chapter audit passed: labels are clean, guild chat is member-only, all normal equipment unlocks by chapter 4 and guild invites use the protected mailbox RPC flow.');
