import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptGuildInvite,
  createGuild,
  currentOnlineSession,
  declineGuildInvite,
  getMyGuildMembership,
  inviteGuildMemberByDisplayName,
  listGuildMembers,
  listMyGuildInvites,
  onlineSessionEventName,
  removeGuildMember,
  updateGuildDescription,
  updateGuildMemberRole,
  type OnlineGuildInvite,
  type OnlineGuildMember,
  type OnlineGuildMembership,
  type OnlineGuildRole,
  type OnlineSession,
} from '../game/supabaseOnline';
import { leaveGuildOnline, transferGuildOwnershipOnline } from '../game/guildOnlineActions';
import { loadMetaProgression, saveMetaProgression } from '../game/metaProgression';
import {
  formatPresence,
  isPresenceOnline,
  loadPresenceByUserIds,
  ONLINE_PRESENCE_REFRESH_EVENT,
  ONLINE_PRESENCE_TICK_EVENT,
  type OnlinePresenceMap,
} from '../game/onlinePresence';
import type { OnlineGuildChatMessage } from '../game/guildChatOnline';
import { GuildInviteLinkCard } from './GuildInviteLinkCard';
import { GuildChatPanel } from './GuildChatPanel';
import { SocialIdentityCard } from './SocialIdentityCard';
import { SpectatorScreen } from './SpectatorScreen';

type Props = {
  language: 'de' | 'en';
  onClose: () => void;
  onOpenOnline: () => void;
  onOpenMemberProfile?: (userId: string) => void;
};
type GuildTab = 'overview' | 'chat' | 'members' | 'invite';
const GUILD_CREATION_COST = 10000;

const QA_GUILD = { id: 'qa-guild', name: 'Hüter des Schleiers', tag: 'VEIL', description: 'Gemeinsam durchbrechen wir den Schleier. Aktive Runs, faire Beute und Hilfe für neue Waldläufer.', owner_id: 'qa-owner' };
const QA_SESSION: OnlineSession = { access_token: 'qa', refresh_token: 'qa', expires_at: 4102444800, token_type: 'bearer', user: { id: 'qa-owner', email: 'qa@dungeonveil.invalid' } };
const QA_MEMBERSHIP: OnlineGuildMembership = { role: 'owner', guild: QA_GUILD };
const QA_MEMBERS: OnlineGuildMember[] = [
  { user_id: 'qa-owner', role: 'owner', joined_at: '2026-06-12T18:00:00.000Z', profile: { id: 'qa-owner', display_name: 'Maxi', avatar_key: 'ranger' } },
  { user_id: 'qa-officer', role: 'officer', joined_at: '2026-06-18T19:30:00.000Z', profile: { id: 'qa-officer', display_name: 'Nyra', avatar_key: 'veil' } },
  { user_id: 'qa-member', role: 'member', joined_at: '2026-07-02T20:10:00.000Z', profile: { id: 'qa-member', display_name: 'Torven', avatar_key: 'guardian' } },
  { user_id: 'qa-away', role: 'member', joined_at: '2026-07-08T11:20:00.000Z', profile: { id: 'qa-away', display_name: 'Liora', avatar_key: 'ember' } },
];
const QA_PRESENCE: OnlinePresenceMap = {
  'qa-owner': new Date().toISOString(),
  'qa-officer': new Date(Date.now() - 90_000).toISOString(),
  'qa-member': new Date(Date.now() - 22 * 60_000).toISOString(),
  'qa-away': new Date(Date.now() - 28 * 60 * 60_000).toISOString(),
};
const QA_CHAT: OnlineGuildChatMessage[] = [
  { id: 'qa-chat-1', guild_id: QA_GUILD.id, user_id: 'qa-officer', body: 'Raum 30 ist frei. Wer braucht noch den Wächter?', created_at: '2026-07-21T12:05:00.000Z', profile: { id: 'qa-officer', display_name: 'Nyra', avatar_key: 'veil' } },
  { id: 'qa-chat-2', guild_id: QA_GUILD.id, user_id: 'qa-owner', body: 'Ich starte danach einen Duo-Run. Einladung kommt gleich.', created_at: '2026-07-21T12:07:00.000Z', profile: { id: 'qa-owner', display_name: 'Maxi', avatar_key: 'ranger' } },
  { id: 'qa-chat-3', guild_id: QA_GUILD.id, user_id: 'qa-member', body: 'Bin dabei. Meine Rüstung ist jetzt Stufe 4.', created_at: '2026-07-21T12:08:00.000Z', profile: { id: 'qa-member', display_name: 'Torven', avatar_key: 'guardian' } },
];

function ActionButton({ label, onClick, disabled = false, primary = false, danger = false, compact = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  compact?: boolean;
}) {
  const style = danger
    ? 'border-red-400/25 bg-red-500/10 text-red-200'
    : primary
      ? 'border-amber-300/35 bg-amber-500/15 text-amber-100'
      : 'border-white/10 bg-white/[.04] text-white/62';
  return <button type="button" disabled={disabled} onClick={onClick} className={`${compact ? 'min-h-8 px-2 py-1.5 text-[7px]' : 'min-h-10 px-3 py-2 text-[8px]'} rounded-xl border font-black uppercase tracking-[.13em] active:scale-[.98] ${style} ${disabled ? 'pointer-events-none opacity-35' : ''}`}>{label}</button>;
}

function roleLabel(role: OnlineGuildRole, de: boolean) {
  if (role === 'owner') return de ? 'Anführer' : 'Leader';
  if (role === 'officer') return de ? 'Offizier' : 'Officer';
  return de ? 'Mitglied' : 'Member';
}

function formatJoined(value: string, language: 'de' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
}

function formatGold(value: number, language: 'de' | 'en') {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US').format(Math.floor(value));
}

function visualQaEnabled() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visualQa') === 'filled-social';
}

export function GuildPanelMobile({ language, onClose, onOpenOnline, onOpenMemberProfile }: Props) {
  const de = language === 'de';
  const qaMode = visualQaEnabled();
  const [session, setSession] = useState<OnlineSession | null>(() => qaMode ? QA_SESSION : currentOnlineSession());
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(() => qaMode ? QA_MEMBERSHIP : null);
  const [members, setMembers] = useState<OnlineGuildMember[]>(() => qaMode ? QA_MEMBERS : []);
  const [presenceByUserId, setPresenceByUserId] = useState<OnlinePresenceMap>(() => qaMode ? QA_PRESENCE : {});
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [invites, setInvites] = useState<OnlineGuildInvite[]>([]);
  const [tab, setTab] = useState<GuildTab>('overview');
  const [description, setDescription] = useState(() => qaMode ? QA_GUILD.description : '');
  const [inviteName, setInviteName] = useState('');
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [gold, setGold] = useState(() => qaMode ? 24850 : loadMetaProgression().gold);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [spectatingMember, setSpectatingMember] = useState<{ id: string; name: string } | null>(null);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, []);

  const refreshGuildData = useCallback(async () => {
    if (qaMode) {
      setSession(QA_SESSION);
      setMembership(current => current ?? QA_MEMBERSHIP);
      setMembers(current => current.length ? current : QA_MEMBERS);
      setPresenceByUserId(QA_PRESENCE);
      setPresenceNow(Date.now());
      setInvites([]);
      setGold(24850);
      return;
    }
    const active = currentOnlineSession();
    setSession(active);
    setGold(loadMetaProgression().gold);
    setPresenceNow(Date.now());
    if (!active) {
      setMembership(null);
      setMembers([]);
      setPresenceByUserId({});
      setInvites([]);
      return;
    }
    const [nextMembership, nextInvites] = await Promise.all([getMyGuildMembership(), listMyGuildInvites()]);
    const nextMembers = nextMembership ? await listGuildMembers(nextMembership.guild.id) : [];
    setMembership(nextMembership);
    setMembers(nextMembers);
    setInvites(nextInvites);
    setDescription(nextMembership?.guild.description ?? '');
    if (!nextMembers.length) {
      setPresenceByUserId({});
      return;
    }
    try { setPresenceByUserId(await loadPresenceByUserIds(nextMembers.map(member => member.user_id))); }
    catch { setPresenceByUserId({}); }
  }, [qaMode]);

  useEffect(() => {
    if (qaMode) {
      void refreshGuildData();
      return;
    }
    const refreshOnline = () => { void run(refreshGuildData); };
    const refreshPresence = () => { void refreshGuildData(); };
    const tickPresence = () => setPresenceNow(Date.now());
    const refreshGold = () => setGold(loadMetaProgression().gold);
    window.addEventListener(onlineSessionEventName(), refreshOnline);
    window.addEventListener(ONLINE_PRESENCE_REFRESH_EVENT, refreshPresence);
    window.addEventListener(ONLINE_PRESENCE_TICK_EVENT, tickPresence);
    window.addEventListener('dungeon-veil-meta-changed', refreshGold);
    void run(refreshGuildData);
    return () => {
      window.removeEventListener(onlineSessionEventName(), refreshOnline);
      window.removeEventListener(ONLINE_PRESENCE_REFRESH_EVENT, refreshPresence);
      window.removeEventListener(ONLINE_PRESENCE_TICK_EVENT, tickPresence);
      window.removeEventListener('dungeon-veil-meta-changed', refreshGold);
    };
  }, [qaMode, refreshGuildData, run]);

  const stats = useMemo(() => ({
    members: members.length,
    officers: members.filter(member => member.role === 'officer').length,
    online: members.filter(member => isPresenceOnline(presenceByUserId[member.user_id], presenceNow)).length,
  }), [members, presenceByUserId, presenceNow]);
  const canInvite = membership?.role === 'owner' || membership?.role === 'officer';
  const isOwner = membership?.role === 'owner';
  const ownerMustTransfer = Boolean(isOwner && members.length > 1);
  const canAffordGuild = gold >= GUILD_CREATION_COST;

  const answerInvite = (inviteId: string, accept: boolean) => run(async () => {
    if (!qaMode) {
      if (accept) await acceptGuildInvite(inviteId); else await declineGuildInvite(inviteId);
      await refreshGuildData();
    }
    setInvites(current => current.filter(invite => invite.id !== inviteId));
    setMessage(accept ? (de ? 'Einladung angenommen.' : 'Invite accepted.') : (de ? 'Einladung abgelehnt.' : 'Invite declined.'));
  });

  const saveDescription = () => run(async () => {
    if (!membership) return;
    if (qaMode) {
      setMembership({ ...membership, guild: { ...membership.guild, description } });
    } else {
      const guild = await updateGuildDescription(membership.guild.id, description);
      setMembership({ ...membership, guild });
      setDescription(guild.description);
    }
    setMessage(de ? 'Gildenbeschreibung gespeichert.' : 'Guild description saved.');
  });

  const sendInvite = () => run(async () => {
    if (!membership) return;
    if (inviteName.trim().length < 2) throw new Error(de ? 'Spielername eingeben.' : 'Enter a player name.');
    const displayName = inviteName.trim();
    if (!qaMode) await inviteGuildMemberByDisplayName(membership.guild.id, displayName);
    setInviteName('');
    setMessage(de ? `Einladung an ${displayName} gesendet.` : `Invitation sent to ${displayName}.`);
  });

  const changeRole = (member: OnlineGuildMember, role: 'officer' | 'member') => run(async () => {
    if (!membership) return;
    if (!qaMode) {
      await updateGuildMemberRole(membership.guild.id, member.user_id, role);
      await refreshGuildData();
    } else setMembers(current => current.map(entry => entry.user_id === member.user_id ? { ...entry, role } : entry));
    setMessage(de ? 'Rolle aktualisiert.' : 'Role updated.');
  });

  const kickMember = (member: OnlineGuildMember) => run(async () => {
    if (!membership) return;
    if (!qaMode) {
      await removeGuildMember(membership.guild.id, member.user_id);
      await refreshGuildData();
    } else setMembers(current => current.filter(entry => entry.user_id !== member.user_id));
    setMessage(de ? 'Mitglied entfernt.' : 'Member removed.');
  });

  const transferLeadership = (member: OnlineGuildMember) => run(async () => {
    if (!membership || !isOwner) return;
    const playerName = member.profile?.display_name ?? (de ? 'dieses Mitglied' : 'this member');
    if (!qaMode && !window.confirm(de ? `Gildenführung wirklich an ${playerName} übertragen?` : `Really transfer guild leadership to ${playerName}?`)) return;
    if (!qaMode) {
      await transferGuildOwnershipOnline(membership.guild.id, member.user_id);
      await refreshGuildData();
    } else {
      setMembership({ ...membership, role: 'member', guild: { ...membership.guild, owner_id: member.user_id } });
      setMembers(current => current.map(entry => entry.user_id === member.user_id ? { ...entry, role: 'owner' } : entry.user_id === QA_SESSION.user.id ? { ...entry, role: 'member' } : entry));
    }
    setTab('overview');
    setMessage(de ? `${playerName} ist jetzt Gildenanführer.` : `${playerName} is now the guild leader.`);
  });

  const leaveCurrentGuild = () => run(async () => {
    if (!membership) return;
    if (ownerMustTransfer) {
      setTab('members');
      throw new Error(de ? 'Übertrage zuerst die Führung an ein anderes Mitglied.' : 'Transfer leadership to another member first.');
    }
    const disband = isOwner;
    if (!qaMode && !window.confirm(disband ? (de ? 'Gilde endgültig auflösen? Dieser Schritt kann nicht rückgängig gemacht werden.' : 'Disband the guild permanently? This cannot be undone.') : (de ? 'Gilde wirklich verlassen?' : 'Really leave the guild?'))) return;
    const result = qaMode ? { disbanded: disband } : await leaveGuildOnline();
    if (qaMode) { setMembership(null); setMembers([]); } else await refreshGuildData();
    setTab('overview');
    setMessage(result.disbanded ? (de ? 'Gilde aufgelöst.' : 'Guild disbanded.') : (de ? 'Gilde verlassen.' : 'Guild left.'));
  });

  const createNewGuild = () => run(async () => {
    const name = guildName.trim();
    const tag = guildTag.trim().toUpperCase();
    const nextDescription = guildDescription.trim();
    if (name.length < 3 || name.length > 32) throw new Error(de ? 'Der Gildenname muss 3 bis 32 Zeichen lang sein.' : 'Guild name must be 3 to 32 characters long.');
    if (!/^[A-Z0-9]{2,6}$/.test(tag)) throw new Error(de ? 'Das Kürzel muss 2 bis 6 Buchstaben oder Zahlen enthalten.' : 'The tag must contain 2 to 6 letters or numbers.');
    if (qaMode) {
      const guild = { id: 'qa-new-guild', name, tag, description: nextDescription, owner_id: QA_SESSION.user.id };
      setMembership({ role: 'owner', guild });
      setMembers([{ user_id: QA_SESSION.user.id, role: 'owner', joined_at: new Date().toISOString(), profile: { id: QA_SESSION.user.id, display_name: 'Maxi', avatar_key: 'ranger' } }]);
      setGold(current => current - GUILD_CREATION_COST);
    } else {
      const meta = loadMetaProgression();
      if (meta.gold < GUILD_CREATION_COST) throw new Error(de ? `Dir fehlen ${formatGold(GUILD_CREATION_COST - meta.gold, language)} Gold.` : `You need ${formatGold(GUILD_CREATION_COST - meta.gold, language)} more gold.`);
      meta.gold -= GUILD_CREATION_COST;
      saveMetaProgression(meta);
      setGold(meta.gold);
      try { await createGuild(name, tag, nextDescription); }
      catch (reason) {
        const refund = loadMetaProgression();
        refund.gold += GUILD_CREATION_COST;
        saveMetaProgression(refund);
        setGold(refund.gold);
        throw reason;
      }
      await refreshGuildData();
    }
    setGuildName('');
    setGuildTag('');
    setGuildDescription('');
    setMessage(de ? `Gilde gegründet. ${formatGold(GUILD_CREATION_COST, language)} Gold wurden bezahlt.` : `Guild created. ${formatGold(GUILD_CREATION_COST, language)} gold was paid.`);
  });

  const tabButton = (key: GuildTab, label: string, icon: string, note: string) => <button data-testid={`guild-tab-${key}`} type="button" onClick={() => setTab(key)} className={`min-w-0 rounded-xl border px-1 py-2 text-center active:scale-[.98] ${tab === key ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/8 bg-black/25 text-white/38'}`}><span className="block text-[12px] leading-none">{icon}</span><span className="mt-1 block truncate text-[6px] font-black uppercase tracking-[.08em]">{label}</span><span className="mt-0.5 hidden truncate text-[5px] text-current/45 sm:block">{note}</span></button>;
  const scrollClass = 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(18px,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch]';

  if (spectatingMember && membership) return <SpectatorScreen language={language} guildId={membership.guild.id} memberId={spectatingMember.id} memberName={spectatingMember.name} onClose={() => setSpectatingMember(null)} />;

  return <section data-testid="guild-panel" data-qa-filled={qaMode ? 'true' : 'false'} className="flex h-[min(78dvh,780px)] min-h-0 flex-col overflow-hidden rounded-3xl border border-amber-200/18 bg-[#0d0c0b]/[.985] p-3 text-white shadow-2xl sm:p-4">
    <header className="relative shrink-0 border-b border-white/8 pb-3 pr-12">
      <button type="button" aria-label={de ? 'Schließen' : 'Close'} onClick={onClose} className="absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/45 text-lg text-white/70 active:scale-95">×</button>
      <div className="text-[7px] font-black uppercase tracking-[.28em] text-amber-200/45">{de ? 'GILDE' : 'GUILD'}</div>
      <div className="mt-1 flex min-w-0 items-center gap-2"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/18 bg-amber-400/[.07] text-lg text-amber-100">♜</div><div className="min-w-0"><div className="truncate text-[16px] font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Gemeinsam durch den Schleier' : 'Together through the Veil')}</div><div className="mt-0.5 text-[7px] text-white/32">{membership ? `${roleLabel(membership.role, de)} · ${stats.online}/${stats.members} ${de ? 'online' : 'online'}` : (de ? 'Gründen, suchen oder Einladung annehmen' : 'Create, search or accept an invitation')}</div></div></div>
    </header>

    {(message || error) && <div className={`mt-2 shrink-0 rounded-xl border px-3 py-2 text-[9px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session ? <div className="grid min-h-0 flex-1 place-items-center py-6 text-center"><div><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-amber-300/16 bg-amber-400/[.05] text-4xl text-amber-100/70">♜</div><div className="mt-4 text-[13px] font-black text-white/82">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div><p className="mx-auto mt-2 max-w-[280px] text-[9px] leading-relaxed text-white/38">{de ? 'Gilden, Chat, Einladungen und Mitgliederprofile werden mit deinem Online-Konto synchronisiert.' : 'Guilds, chat, invitations and member profiles sync with your online account.'}</p><button type="button" onClick={onOpenOnline} className="mt-4 min-h-11 rounded-xl border border-amber-300/30 bg-amber-500/12 px-5 text-[8px] font-black uppercase tracking-[.14em] text-amber-100">{de ? 'ONLINE & CLOUD ÖFFNEN' : 'OPEN ONLINE & CLOUD'}</button></div></div>
    : !membership ? <div className={scrollClass}>
      {invites.length > 0 && <section className="mb-3 space-y-2"><div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-100/48">{de ? 'OFFENE EINLADUNGEN' : 'PENDING INVITATIONS'}</div>{invites.map(invite => <article key={invite.id} className="rounded-2xl border border-amber-300/15 bg-amber-400/[.04] p-3"><div className="text-[11px] font-black text-white/82">[{invite.guild.tag}] {invite.guild.name}</div><div className="mt-2 grid grid-cols-2 gap-2"><ActionButton label={de ? 'Ablehnen' : 'Decline'} onClick={() => void answerInvite(invite.id, false)} disabled={busy} /><ActionButton label={de ? 'Annehmen' : 'Accept'} onClick={() => void answerInvite(invite.id, true)} disabled={busy} primary /></div></article>)}</section>}
      <section className="rounded-3xl border border-white/9 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.18em] text-amber-100/48">{de ? 'EIGENE GILDE' : 'YOUR OWN GUILD'}</div><div className="mt-1 text-[14px] font-black text-white/82">{de ? 'Eine neue Gemeinschaft gründen' : 'Create a new community'}</div></div><div className="rounded-xl border border-amber-300/16 bg-black/28 px-2 py-1.5 text-right"><div className="text-[6px] text-white/30">{de ? 'KOSTEN' : 'COST'}</div><div className="text-[10px] font-black text-amber-100">{formatGold(GUILD_CREATION_COST, language)} G</div></div></div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_90px] gap-2"><input value={guildName} maxLength={32} onChange={event => setGuildName(event.target.value)} placeholder={de ? 'Gildenname' : 'Guild name'} className="min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] outline-none focus:border-amber-300/30"/><input value={guildTag} maxLength={6} onChange={event => setGuildTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="TAG" className="min-w-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-center text-[10px] font-black tracking-[.12em] outline-none focus:border-amber-300/30"/></div><textarea value={guildDescription} maxLength={160} rows={3} onChange={event => setGuildDescription(event.target.value)} placeholder={de ? 'Wofür steht eure Gilde?' : 'What does your guild stand for?'} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] outline-none focus:border-amber-300/30"/><div className="mt-3 flex items-center justify-between gap-3 text-[7px] text-white/30"><span>{de ? 'Verfügbar' : 'Available'}: {formatGold(gold, language)} G</span><span className={canAffordGuild ? 'text-emerald-200/60' : 'text-red-200/70'}>{canAffordGuild ? (de ? 'Finanzierbar' : 'Affordable') : (de ? 'Zu wenig Gold' : 'Not enough gold')}</span></div><button data-testid="guild-create-button" type="button" onClick={() => void createNewGuild()} disabled={busy || !canAffordGuild || guildName.trim().length < 3 || guildTag.length < 2} className="mt-3 min-h-11 w-full rounded-xl border border-amber-300/30 bg-amber-500/14 text-[8px] font-black uppercase tracking-[.14em] text-amber-100 disabled:opacity-30">{de ? 'GILDE GRÜNDEN' : 'CREATE GUILD'}</button></section>
    </div>
    : <>
      <nav data-testid="guild-tabs" className="mt-2 grid shrink-0 grid-cols-4 gap-1">{tabButton('overview', de ? 'Übersicht' : 'Overview', '◇', de ? 'Status' : 'Status')}{tabButton('chat', 'Chat', '✦', de ? 'Nachrichten' : 'Messages')}{tabButton('members', de ? 'Mitglieder' : 'Members', '♟', `${stats.members}`)}{tabButton('invite', de ? 'Einladen' : 'Invite', '↗', de ? 'Link & Name' : 'Link & name')}</nav>
      {tab === 'overview' && <div data-testid="guild-overview-tab" className={scrollClass}>
        <div className="grid grid-cols-3 gap-2"><SocialIdentityCard label={de ? 'Mitglieder' : 'Members'} value={String(stats.members)} hint={de ? 'Gildenstärke' : 'Guild strength'} accent="#f6c56f" /><SocialIdentityCard label="Online" value={String(stats.online)} hint={de ? 'letzte 5 Min.' : 'last 5 min'} accent="#72e8a5" /><SocialIdentityCard label={de ? 'Offiziere' : 'Officers'} value={String(stats.officers)} hint={de ? 'Verwaltung' : 'Management'} accent="#c8a4ff" /></div>
        <section className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'GILDENBESCHREIBUNG' : 'GUILD DESCRIPTION'}</div><span className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-[6px] font-black text-white/36">{description.length}/160</span></div><textarea value={description} maxLength={160} rows={4} disabled={!canInvite} onChange={event => setDescription(event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-white/9 bg-black/35 p-3 text-[10px] leading-relaxed text-white/72 outline-none disabled:text-white/42"/>{canInvite && <button type="button" onClick={() => void saveDescription()} disabled={busy || description === membership.guild.description} className="mt-2 min-h-10 w-full rounded-xl border border-amber-300/20 bg-amber-400/[.07] text-[7px] font-black uppercase tracking-[.14em] text-amber-100 disabled:opacity-30">{de ? 'BESCHREIBUNG SPEICHERN' : 'SAVE DESCRIPTION'}</button>}</section>
        <section className="mt-3 rounded-2xl border border-white/8 bg-black/25 p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/34">{de ? 'DEINE ROLLE' : 'YOUR ROLE'}</div><div className="mt-1 text-[13px] font-black text-amber-100">{roleLabel(membership.role, de)}</div><div className="mt-1 text-[8px] leading-relaxed text-white/34">{ownerMustTransfer ? (de ? 'Vor dem Verlassen musst du die Führung an ein anderes Mitglied übertragen.' : 'Transfer leadership before leaving the guild.') : (isOwner ? (de ? 'Als einziges Mitglied würdest du die Gilde auflösen.' : 'As the only member, leaving would disband the guild.') : (de ? 'Du kannst die Gilde jederzeit verlassen.' : 'You can leave the guild at any time.'))}</div><ActionButton label={isOwner ? (de ? 'GILDE AUFLÖSEN' : 'DISBAND GUILD') : (de ? 'GILDE VERLASSEN' : 'LEAVE GUILD')} onClick={() => void leaveCurrentGuild()} disabled={busy} danger /></section>
      </div>}
      {tab === 'chat' && <GuildChatPanel guildId={membership.guild.id} language={language} qaMessages={qaMode ? QA_CHAT : undefined} />}
      {tab === 'members' && <div data-testid="guild-members-tab" className={scrollClass}><div className="mb-2 flex items-center justify-between gap-3 px-1"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/34">{stats.members} {de ? 'MITGLIEDER' : 'MEMBERS'}</div><div className="text-[7px] text-emerald-200/45">● {stats.online} online</div></div><div className="space-y-2">{members.map(member => {
        const own = member.user_id === session.user.id;
        const online = isPresenceOnline(presenceByUserId[member.user_id], presenceNow);
        const displayName = member.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
        return <article key={member.user_id} data-testid="guild-member-card" className={`rounded-2xl border p-3 ${own ? 'border-amber-300/17 bg-amber-400/[.04]' : 'border-white/8 bg-white/[.025]'}`}><div className="flex items-start gap-3"><button type="button" onClick={() => onOpenMemberProfile?.(member.user_id)} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35 text-lg text-white/58 active:scale-95">{displayName.slice(0, 1).toUpperCase()}<span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0c0b] ${online ? 'bg-emerald-400' : 'bg-white/18'}`}/></button><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><button type="button" onClick={() => onOpenMemberProfile?.(member.user_id)} className="truncate text-left text-[11px] font-black text-white/82 hover:text-amber-100">{displayName}</button>{own && <span className="rounded-full border border-amber-300/14 bg-amber-400/[.06] px-1.5 py-0.5 text-[5px] font-black text-amber-100/65">{de ? 'DU' : 'YOU'}</span>}</div><div className="mt-1 flex flex-wrap gap-1.5 text-[6px] font-black uppercase tracking-[.1em]"><span className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-white/42">{roleLabel(member.role, de)}</span><span className={online ? 'rounded-full border border-emerald-300/14 bg-emerald-400/[.05] px-2 py-1 text-emerald-100/60' : 'rounded-full border border-white/8 bg-black/20 px-2 py-1 text-white/30'}>{formatPresence(presenceByUserId[member.user_id], language, presenceNow)}</span></div><div className="mt-1.5 text-[6px] text-white/23">{de ? 'Beigetreten' : 'Joined'} {formatJoined(member.joined_at, language)}</div></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><ActionButton label={de ? 'PROFIL' : 'PROFILE'} onClick={() => onOpenMemberProfile?.(member.user_id)} compact /><ActionButton label={de ? 'ZUSCHAUEN' : 'SPECTATE'} onClick={() => setSpectatingMember({ id: member.user_id, name: displayName })} compact disabled={!online} /></div>
          {!own && isOwner && member.role !== 'owner' && <div className="mt-2 grid grid-cols-3 gap-1.5"><ActionButton label={member.role === 'officer' ? (de ? 'HERABSTUFEN' : 'DEMOTE') : (de ? 'OFFIZIER' : 'OFFICER')} onClick={() => void changeRole(member, member.role === 'officer' ? 'member' : 'officer')} compact /><ActionButton label={de ? 'FÜHRUNG' : 'LEADER'} onClick={() => void transferLeadership(member)} compact primary /><ActionButton label={de ? 'ENTFERNEN' : 'REMOVE'} onClick={() => void kickMember(member)} compact danger /></div>}
        </article>;
      })}</div></div>}
      {tab === 'invite' && <div data-testid="guild-invite-tab" className={scrollClass}>{canInvite ? <><section className="rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'SPIELER DIREKT EINLADEN' : 'INVITE PLAYER DIRECTLY'}</div><p className="mt-1 text-[8px] leading-relaxed text-white/32">{de ? 'Suche exakt nach dem Anzeigenamen. Die Einladung erscheint im Postfach des Spielers.' : 'Search by exact display name. The invitation appears in the player mailbox.'}</p><div className="mt-3 flex gap-2"><input data-testid="guild-invite-name" value={inviteName} maxLength={32} onChange={event => setInviteName(event.target.value)} placeholder={de ? 'Spielername' : 'Player name'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] outline-none focus:border-amber-300/30"/><button data-testid="guild-invite-send" type="button" onClick={() => void sendInvite()} disabled={busy || inviteName.trim().length < 2} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-3 text-[7px] font-black uppercase tracking-[.12em] text-amber-100 disabled:opacity-30">{de ? 'SENDEN' : 'SEND'}</button></div></section><div className="mt-3"><GuildInviteLinkCard language={language} qaMembership={qaMode ? membership : undefined} /></div></> : <div className="grid min-h-44 place-items-center rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center text-[9px] leading-relaxed text-white/35">{de ? 'Nur Anführer und Offiziere können neue Mitglieder einladen.' : 'Only leaders and officers can invite new members.'}</div>}</div>}
    </>}
  </section>;
}
