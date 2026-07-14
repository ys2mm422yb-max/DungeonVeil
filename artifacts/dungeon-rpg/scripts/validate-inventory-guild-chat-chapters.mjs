import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [menu, inventory, hub, guildPanel, chatPanel, chatClient, meta, gates, migration] = await Promise.all([
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/components/VillageNpcHub.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/GuildChatPanel.tsx'),
  read('../src/game/guildChatOnline.ts'),
  read('../src/game/metaProgression.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../../../supabase/migrations/20260714183000_guild_text_chat.sql'),
]);

const checks = [
  [menu.includes("language === 'de' ? 'Inventar' : 'Inventory'") && !menu.includes("'Schleierkammer' : 'Veil Chamber'"), 'main-menu inventory label is missing'],
  [inventory.includes("'INVENTAR' : 'INVENTORY'") && inventory.includes('equipmentUnlockChapter') && inventory.includes("'AB KAPITEL' : 'FROM CHAPTER'"), 'inventory heading or chapter requirement is missing'],
  [!hub.includes('detailDe') && !hub.includes('detailEn') && !hub.includes('Mira') && !hub.includes('Orin') && !hub.includes('Tala') && !hub.includes('Brom') && !hub.includes('Aelric'), 'NPC names remain below the main-menu routes'],
  [guildPanel.includes("type GuildTab = 'overview' | 'chat' | 'members' | 'invite'") && guildPanel.includes("tabButton('chat', 'Chat')") && guildPanel.includes('<GuildChatPanel guildId={membership.guild.id}'), 'guild chat tab is not mounted'],
  [chatPanel.includes('window.setInterval') && chatPanel.includes('5000') && chatPanel.includes('maxLength={400}') && chatPanel.includes('guild-chat-send'), 'guild chat polling, input limit or send control is missing'],
  [chatClient.includes("authenticatedSupabaseRest('guild_messages'") && chatClient.includes('listGuildChatMessages') && chatClient.includes('sendGuildChatMessage'), 'authenticated guild chat client is incomplete'],
  [meta.includes('equipmentUnlockedForCurrentProgress(item.id)') && meta.includes('recordReachedChapter(chapter)'), 'equipment drops are not chapter gated'],
  [gates.includes("'warden-bow': 5") && gates.includes("'veil-eye': 5") && gates.includes("'hunter-bow': 2"), 'strong equipment chapter thresholds are incomplete'],
  [migration.includes('alter table public.guild_messages enable row level security') && migration.includes('guild_messages_read_members') && migration.includes('guild_messages_send_members') && migration.includes('user_id = (select auth.uid())'), 'guild chat RLS is incomplete'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Inventory/guild-chat/chapter audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Inventory/guild-chat/chapter audit passed: labels are clean, guild chat is member-only and stronger items unlock in later chapters.');
