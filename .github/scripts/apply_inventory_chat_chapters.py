from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f"missing marker in {path}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1))


# Main-menu naming.
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/MainMenuScreen.tsx",
    "{action(language === 'de' ? 'Schleierkammer' : 'Veil Chamber', language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Staub` : `Rank ${meta.rank} · ${meta.dust} dust`, props.onVeilChamber, 'violet')}",
    "{action(language === 'de' ? 'Inventar' : 'Inventory', language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Staub` : `Rank ${meta.rank} · ${meta.dust} dust`, props.onVeilChamber, 'violet')}",
)

# Remove NPC names below the five main-menu routes.
hub_path = ROOT / "artifacts/dungeon-rpg/src/components/VillageNpcHub.tsx"
hub = hub_path.read_text()
hub = hub.replace("  detailDe: string;\n  detailEn: string;\n", "")
for old, new in [
    ("{ testId: 'npc-questmaster', icon: '✦', labelDe: 'Aufträge', labelEn: 'Quests', detailDe: 'Mira', detailEn: 'Mira', badge: dailyProgress, action: onQuests }", "{ testId: 'npc-questmaster', icon: '✦', labelDe: 'Aufträge', labelEn: 'Quests', badge: dailyProgress, action: onQuests }"),
    ("{ testId: 'npc-postmaster', icon: '✉', labelDe: 'Post', labelEn: 'Mail', detailDe: 'Orin', detailEn: 'Orin', badge: mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined, action: onMailbox }", "{ testId: 'npc-postmaster', icon: '✉', labelDe: 'Post', labelEn: 'Mail', badge: mailUnread > 0 ? String(Math.min(99, mailUnread)) : undefined, action: onMailbox }"),
    ("{ testId: 'npc-scout', icon: '♡', labelDe: 'Freunde', labelEn: 'Friends', detailDe: 'Tala', detailEn: 'Tala', action: onFriends }", "{ testId: 'npc-scout', icon: '♡', labelDe: 'Freunde', labelEn: 'Friends', action: onFriends }"),
    ("{ testId: 'npc-guildmaster', icon: '♜', labelDe: 'Gilde', labelEn: 'Guild', detailDe: 'Brom', detailEn: 'Brom', action: onGuild }", "{ testId: 'npc-guildmaster', icon: '♜', labelDe: 'Gilde', labelEn: 'Guild', action: onGuild }"),
    ("{ testId: 'npc-worldkeeper', icon: '◉', labelDe: 'Weltboss', labelEn: 'World Boss', detailDe: 'Aelric', detailEn: 'Aelric', action: onWorldBoss }", "{ testId: 'npc-worldkeeper', icon: '◉', labelDe: 'Weltboss', labelEn: 'World Boss', action: onWorldBoss }"),
]:
    if old not in hub:
        raise SystemExit(f"missing village hub row: {old}")
    hub = hub.replace(old, new, 1)
name_span = "        <span className=\"mt-0.5 block truncate text-[5px] uppercase tracking-[.08em] text-white/30\">{de ? place.detailDe : place.detailEn}</span>\n"
if name_span not in hub:
    raise SystemExit("missing NPC detail span")
hub = hub.replace(name_span, "", 1)
hub = hub.replace("px-1 py-2 text-center", "px-1 py-2.5 text-center", 1)
hub_path.write_text(hub)

# Chapter availability helper, deliberately separate from rank progression.
(ROOT / "artifacts/dungeon-rpg/src/game/equipmentChapterGates.ts").write_text("""import type { EquipmentId } from './metaProgression';

const CHAPTER_KEY = 'dungeon-veil-highest-chapter-v1';

export const EQUIPMENT_UNLOCK_CHAPTER: Record<EquipmentId, number> = {
  'ash-bow': 1,
  'ember-bow': 1,
  'hunter-bow': 2,
  'frost-bow': 3,
  'splinter-bow': 3,
  'veil-bow': 4,
  'warden-bow': 5,
  'ranger-quiver': 1,
  'black-quiver': 2,
  'rune-quiver': 4,
  'frost-quiver': 3,
  'splinter-quiver': 3,
  'warden-quiver': 5,
  'veil-key': 1,
  'guardian-sigil': 3,
  'frost-grimoire': 4,
  'ritual-shard': 4,
  'ash-amulet': 2,
  'depth-seal': 3,
  'veil-eye': 5,
};

export function highestReachedChapter(): number {
  try {
    return Math.max(1, Math.min(99, Math.floor(Number(localStorage.getItem(CHAPTER_KEY)) || 1)));
  } catch {
    return 1;
  }
}

export function recordReachedChapter(chapter: number): number {
  const next = Math.max(highestReachedChapter(), Math.max(1, Math.floor(Number(chapter) || 1)));
  try { localStorage.setItem(CHAPTER_KEY, String(next)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-chapter-unlock-changed'));
  return next;
}

export function equipmentUnlockChapter(id: EquipmentId): number {
  return EQUIPMENT_UNLOCK_CHAPTER[id] ?? 1;
}

export function equipmentUnlockedForCurrentProgress(id: EquipmentId): boolean {
  return highestReachedChapter() >= equipmentUnlockChapter(id);
}
""")

replace_once(
    "artifacts/dungeon-rpg/src/game/metaProgression.ts",
    "import { isBossRoom } from './chapterRun';\n",
    "import { isBossRoom } from './chapterRun';\nimport { equipmentUnlockedForCurrentProgress, recordReachedChapter } from './equipmentChapterGates';\n",
)
replace_once(
    "artifacts/dungeon-rpg/src/game/metaProgression.ts",
    "return Object.values(EQUIPMENT).filter(item => item.unlockRank <= meta.rank && item.dropSource === source && !isStarterItem(item.id));",
    "return Object.values(EQUIPMENT).filter(item => item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(item.id) && item.dropSource === source && !isStarterItem(item.id));",
)
replace_once(
    "artifacts/dungeon-rpg/src/game/metaProgression.ts",
    "export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {\n  const meta = loadMetaProgression();",
    "export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {\n  recordReachedChapter(chapter);\n  const meta = loadMetaProgression();",
)

# Rename the chamber itself and expose chapter requirements for locked items.
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "} from '../../game/metaProgression';\n",
    "} from '../../game/metaProgression';\nimport { equipmentUnlockChapter, highestReachedChapter } from '../../game/equipmentChapterGates';\n",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "  const de = language === 'de';\n",
    "  const de = language === 'de';\n  const highestChapter = highestReachedChapter();\n",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "        return a.unlockRank - b.unlockRank;",
    "        return equipmentUnlockChapter(a.id) - equipmentUnlockChapter(b.id) || a.unlockRank - b.unlockRank;",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "  const sourceLabel = selectedItem ? SOURCE_LABELS[selectedItem.dropSource][de ? 'de' : 'en'] : '';\n",
    "  const sourceLabel = selectedItem ? SOURCE_LABELS[selectedItem.dropSource][de ? 'de' : 'en'] : '';\n  const lockedLabel = (item: (typeof EQUIPMENT)[EquipmentId]) => {\n    const chapter = equipmentUnlockChapter(item.id);\n    if (highestChapter < chapter) return `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${chapter}`;\n    if (meta.rank < item.unlockRank) return `${de ? 'AB RANG' : 'FROM RANK'} ${item.unlockRank}`;\n    return de ? 'NOCH NICHT GEFUNDEN' : 'NOT FOUND YET';\n  };\n",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "<h1 className=\"mt-1 font-serif text-[2.05rem] leading-none tracking-[.08em] text-[#e7c37a]\">{de ? 'SCHLEIERKAMMER' : 'VEIL CHAMBER'}</h1>",
    "<h1 className=\"mt-1 font-serif text-[2.05rem] leading-none tracking-[.08em] text-[#e7c37a]\">{de ? 'INVENTAR' : 'INVENTORY'}</h1>",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "{de ? 'DAUERHAFTER FORTSCHRITT ZWISCHEN DEN RUNS' : 'PERMANENT PROGRESS BETWEEN RUNS'}",
    "{de ? 'AUSRÜSTUNG UND DAUERHAFTER FORTSCHRITT' : 'EQUIPMENT AND PERMANENT PROGRESS'}",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "{selectedLevel > 0 ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5 · ${selectedCopies} ${de ? 'KOPIEN' : 'COPIES'}` : meta.rank >= selectedItem.unlockRank ? `${de ? 'NOCH NICHT GEFUNDEN' : 'NOT FOUND YET'} · ${sourceLabel}` : `${de ? 'AB RANG' : 'FROM RANK'} ${selectedItem.unlockRank} · ${sourceLabel}`}",
    "{selectedLevel > 0 ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5 · ${selectedCopies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(selectedItem)} · ${sourceLabel}`}",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "{meta.rank >= selectedItem.unlockRank ? (de ? `NOCH NICHT GEFUNDEN · DROP: ${sourceLabel}` : `NOT FOUND YET · DROP: ${sourceLabel}`) : `${de ? 'AB RANG' : 'FROM RANK'} ${selectedItem.unlockRank} · DROP: ${sourceLabel}`}",
    "{`${lockedLabel(selectedItem)} · DROP: ${sourceLabel}`}",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx",
    "{progress ? `${de ? 'STUFE' : 'LEVEL'} ${progress.level} · ${progress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : meta.rank >= item.unlockRank ? `${de ? 'NOCH NICHT GEFUNDEN' : 'NOT FOUND'} · ${itemSource}` : `${de ? 'AB RANG' : 'FROM RANK'} ${item.unlockRank} · ${itemSource}`}",
    "{progress ? `${de ? 'STUFE' : 'LEVEL'} ${progress.level} · ${progress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(item)} · ${itemSource}`}",
)

# Guild chat REST client. Polling is used deliberately; no public realtime channel is required.
(ROOT / "artifacts/dungeon-rpg/src/game/guildChatOnline.ts").write_text("""import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export type OnlineGuildChatMessage = {
  id: string;
  guild_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: { id: string; display_name: string; avatar_key: string | null } | null;
};

type MessageRow = Omit<OnlineGuildChatMessage, 'profile'>;
type ChatProfile = NonNullable<OnlineGuildChatMessage['profile']>;

export async function listGuildChatMessages(guildId: string, limit = 50): Promise<OnlineGuildChatMessage[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await authenticatedSupabaseRest<MessageRow[]>(
    `guild_messages?guild_id=eq.${encodeURIComponent(guildId)}&select=id,guild_id,user_id,body,created_at&order=created_at.desc&limit=${safeLimit}`,
  );
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(row => row.user_id))];
  const profiles = await authenticatedSupabaseRest<ChatProfile[]>(
    `profiles?id=in.(${ids.map(id => encodeURIComponent(id)).join(',')})&select=id,display_name,avatar_key`,
  );
  const byId = new Map(profiles.map(profile => [profile.id, profile]));
  return rows.slice().reverse().map(row => ({ ...row, profile: byId.get(row.user_id) ?? null }));
}

export async function sendGuildChatMessage(guildId: string, body: string): Promise<void> {
  const session = currentOnlineSession();
  if (!session) throw new Error('Nicht angemeldet');
  const message = body.trim();
  if (!message) throw new Error('Nachricht eingeben');
  if (message.length > 400) throw new Error('Nachricht ist zu lang');
  await authenticatedSupabaseRest('guild_messages', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ guild_id: guildId, user_id: session.user.id, body: message }),
  });
}
""")

(ROOT / "artifacts/dungeon-rpg/src/components/GuildChatPanel.tsx").write_text("""import React, { useCallback, useEffect, useRef, useState } from 'react';
import { currentOnlineSession } from '../game/supabaseOnline';
import { listGuildChatMessages, sendGuildChatMessage, type OnlineGuildChatMessage } from '../game/guildChatOnline';

function formatTime(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function GuildChatPanel({ guildId, language }: { guildId: string; language: 'de' | 'en' }) {
  const de = language === 'de';
  const ownUserId = currentOnlineSession()?.user.id ?? '';
  const [messages, setMessages] = useState<OnlineGuildChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const next = await listGuildChatMessages(guildId, 50);
    setMessages(next);
  }, [guildId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await listGuildChatMessages(guildId, 50);
        if (active) setMessages(next);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [guildId]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendGuildChatMessage(guildId, message);
      setDraft('');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return <section data-testid="guild-chat-tab" className="flex min-h-0 flex-1 flex-col pt-3">
    <div ref={scrollRef} data-testid="guild-chat-messages" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-2xl border border-white/8 bg-black/28 p-3 [-webkit-overflow-scrolling:touch]">
      {messages.map(message => {
        const mine = message.user_id === ownUserId;
        const name = message.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
        return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[86%] rounded-2xl border px-3 py-2 ${mine ? 'border-amber-300/20 bg-amber-500/10' : 'border-white/8 bg-white/[.035]'}`}>
            <div className="flex items-center gap-2 text-[6px] font-black uppercase tracking-[.12em] text-white/28"><span className="truncate">{name}</span><span>{formatTime(message.created_at, language)}</span></div>
            <div className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/78">{message.body}</div>
          </div>
        </div>;
      })}
      {!messages.length && <div className="grid min-h-32 place-items-center text-center text-[9px] leading-relaxed text-white/30">{de ? 'Noch keine Nachrichten. Starte den Gildenchat.' : 'No messages yet. Start the guild chat.'}</div>}
    </div>
    {error && <div className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[8px] text-red-200">{error}</div>}
    <div className="mt-2 flex shrink-0 gap-2">
      <textarea
        data-testid="guild-chat-input"
        value={draft}
        maxLength={400}
        rows={2}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
        placeholder={de ? 'Nachricht an die Gilde …' : 'Message the guild …'}
        className="min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
      />
      <button data-testid="guild-chat-send" type="button" onClick={() => void send()} disabled={busy || !draft.trim()} className="min-w-16 rounded-xl border border-amber-300/30 bg-amber-500/14 px-3 text-[8px] font-black uppercase tracking-[.12em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{busy ? '…' : (de ? 'Senden' : 'Send')}</button>
    </div>
    <div className="mt-1 text-right text-[6px] text-white/20">{draft.length}/400</div>
  </section>;
}
""")

replace_once(
    "artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx",
    "import { GuildInviteLinkCard } from './GuildInviteLinkCard';\n",
    "import { GuildInviteLinkCard } from './GuildInviteLinkCard';\nimport { GuildChatPanel } from './GuildChatPanel';\n",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx",
    "type GuildTab = 'overview' | 'members' | 'invite';",
    "type GuildTab = 'overview' | 'chat' | 'members' | 'invite';",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx",
    "? (de ? 'Mitglieder, Rollen und Einladungen an einem Ort.' : 'Members, roles and invitations in one place.')",
    "? (de ? 'Chat, Mitglieder, Rollen und Einladungen an einem Ort.' : 'Chat, members, roles and invitations in one place.')",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx",
    "<div data-testid=\"guild-tabs\" className=\"grid shrink-0 grid-cols-3 gap-2 pt-3\">\n        {tabButton('overview', de ? 'Übersicht' : 'Overview')}\n        {tabButton('members', de ? 'Mitglieder' : 'Members')}\n        {tabButton('invite', de ? 'Einladen' : 'Invite')}\n      </div>",
    "<div data-testid=\"guild-tabs\" className=\"grid shrink-0 grid-cols-4 gap-1.5 pt-3\">\n        {tabButton('overview', de ? 'Übersicht' : 'Overview')}\n        {tabButton('chat', 'Chat')}\n        {tabButton('members', de ? 'Mitglieder' : 'Members')}\n        {tabButton('invite', de ? 'Einladen' : 'Invite')}\n      </div>",
)
replace_once(
    "artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx",
    "      {tab === 'members' && <section data-testid=\"guild-members-tab\"",
    "      {tab === 'chat' && <GuildChatPanel guildId={membership.guild.id} language={language} />}\n\n      {tab === 'members' && <section data-testid=\"guild-members-tab\"",
)

# Secure guild-message table: only current guild members can read or send.
(ROOT / "supabase/migrations/20260714183000_guild_text_chat.sql").write_text("""create table if not exists public.guild_messages (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);

create index if not exists guild_messages_guild_created_idx
  on public.guild_messages (guild_id, created_at desc);

alter table public.guild_messages enable row level security;
revoke all on public.guild_messages from anon, authenticated;
grant select, insert on public.guild_messages to authenticated;

drop policy if exists guild_messages_read_members on public.guild_messages;
create policy guild_messages_read_members
  on public.guild_messages for select to authenticated
  using (
    exists (
      select 1 from public.guild_members gm
      where gm.guild_id = guild_messages.guild_id
        and gm.user_id = (select auth.uid())
    )
  );

drop policy if exists guild_messages_send_members on public.guild_messages;
create policy guild_messages_send_members
  on public.guild_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.guild_members gm
      where gm.guild_id = guild_messages.guild_id
        and gm.user_id = (select auth.uid())
    )
  );
""")

# Dedicated regression audit for all four requested changes.
(ROOT / "artifacts/dungeon-rpg/scripts/validate-inventory-guild-chat-chapters.mjs").write_text("""import { readFile } from 'node:fs/promises';

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
""")

# Add the new audit to both normal validation chains.
package_path = ROOT / "artifacts/dungeon-rpg/package.json"
package_text = package_path.read_text()
package_text = package_text.replace(
    "node scripts/validate-main-menu-equipped-ranger.mjs\"",
    "node scripts/validate-main-menu-equipped-ranger.mjs && node scripts/validate-inventory-guild-chat-chapters.mjs\"",
)
if package_text.count('validate-inventory-guild-chat-chapters.mjs') != 2:
    raise SystemExit('new audit was not added to both package scripts')
package_path.write_text(package_text)

# Extend the existing guild audit so chat cannot disappear in a later refactor.
replace_once(
    "artifacts/dungeon-rpg/scripts/validate-guild-mobile-layout.mjs",
    "  [panel.includes('data-testid=\"guild-invite-tab\"') && panel.includes('<GuildInviteLinkCard language={language} />'), 'link sharing is not isolated inside the Invite tab'],",
    "  [panel.includes('data-testid=\"guild-invite-tab\"') && panel.includes('<GuildInviteLinkCard language={language} />'), 'link sharing is not isolated inside the Invite tab'],\n  [panel.includes(\"tabButton('chat', 'Chat')\") && panel.includes('<GuildChatPanel guildId={membership.guild.id}'), 'member guild chat tab is missing'],",
)
replace_once(
    "artifacts/dungeon-rpg/scripts/validate-guild-mobile-layout.mjs",
    "console.log('Guild mobile layout audit passed: close control stays visible and invitations live only in the Invite tab.');",
    "console.log('Guild mobile layout audit passed: close control stays visible, chat is available and invitations live only in the Invite tab.');",
)

# Self-clean after the workflow has executed this script.
Path(__file__).unlink()
workflow = ROOT / '.github/workflows/apply-inventory-chat-chapters.yml'
if workflow.exists():
    workflow.unlink()
