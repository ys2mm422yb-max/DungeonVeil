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
import { GuildInviteLinkCard } from './GuildInviteLinkCard';
import { GuildChatPanel } from './GuildChatPanel';
import { SocialIdentityCard } from './SocialIdentityCard';

type Props = {
  language: 'de' | 'en';
  onClose: () => void;
  onOpenOnline: () => void;
  onOpenMemberProfile?: (userId: string) => void;
};
type GuildTab = 'overview' | 'chat' | 'members' | 'invite';
const GUILD_CREATION_COST = 2500;

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

export function GuildPanelMobile({ language, onClose, onOpenOnline, onOpenMemberProfile }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
  const [presenceByUserId, setPresenceByUserId] = useState<OnlinePresenceMap>({});
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [invites, setInvites] = useState<OnlineGuildInvite[]>([]);
  const [tab, setTab] = useState<GuildTab>('overview');
  const [description, setDescription] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [gold, setGold] = useState(() => loadMetaProgression().gold);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, []);

  const refreshGuildData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
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
  }, [refreshGuildData, run]);

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
    if (accept) await acceptGuildInvite(inviteId); else await declineGuildInvite(inviteId);
    await refreshGuildData();
    setMessage(accept ? (de ? 'Einladung angenommen.' : 'Invite accepted.') : (de ? 'Einladung abgelehnt.' : 'Invite declined.'));
  });

  const saveDescription = () => run(async () => {
    if (!membership) return;
    const guild = await updateGuildDescription(membership.guild.id, description);
    setMembership({ ...membership, guild });
    setDescription(guild.description);
    setMessage(de ? 'Gildenbeschreibung gespeichert.' : 'Guild description saved.');
  });

  const sendInvite = () => run(async () => {
    if (!membership) return;
    if (inviteName.trim().length < 2) throw new Error(de ? 'Spielername eingeben.' : 'Enter a player name.');
    const player = await inviteGuildMemberByDisplayName(membership.guild.id, inviteName);
    setInviteName('');
    setMessage(de ? `Einladung an ${player.display_name} gesendet.` : `Invitation sent to ${player.display_name}.`);
  });

  const changeRole = (member: OnlineGuildMember, role: 'officer' | 'member') => run(async () => {
    if (!membership) return;
    await updateGuildMemberRole(membership.guild.id, member.user_id, role);
    await refreshGuildData();
    setMessage(de ? 'Rolle aktualisiert.' : 'Role updated.');
  });

  const kickMember = (member: OnlineGuildMember) => run(async () => {
    if (!membership) return;
    await removeGuildMember(membership.guild.id, member.user_id);
    await refreshGuildData();
    setMessage(de ? 'Mitglied entfernt.' : 'Member removed.');
  });

  const transferLeadership = (member: OnlineGuildMember) => run(async () => {
    if (!membership || !isOwner) return;
    const playerName = member.profile?.display_name ?? (de ? 'dieses Mitglied' : 'this member');
    if (!window.confirm(de ? `Gildenführung wirklich an ${playerName} übertragen?` : `Really transfer guild leadership to ${playerName}?`)) return;
    await transferGuildOwnershipOnline(membership.guild.id, member.user_id);
    await refreshGuildData();
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
    if (!window.confirm(disband ? (de ? 'Gilde endgültig auflösen? Dieser Schritt kann nicht rückgängig gemacht werden.' : 'Disband the guild permanently? This cannot be undone.') : (de ? 'Gilde wirklich verlassen?' : 'Really leave the guild?'))) return;
    const result = await leaveGuildOnline();
    await refreshGuildData();
    setTab('overview');
    setMessage(result.disbanded ? (de ? 'Gilde aufgelöst.' : 'Guild disbanded.') : (de ? 'Gilde verlassen.' : 'Guild left.'));
  });

  const createNewGuild = () => run(async () => {
    const name = guildName.trim();
    const tag = guildTag.trim().toUpperCase();
    const nextDescription = guildDescription.trim();
    if (name.length < 3 || name.length > 32) throw new Error(de ? 'Der Gildenname muss 3 bis 32 Zeichen lang sein.' : 'Guild name must be 3 to 32 characters long.');
    if (!/^[A-Z0-9]{2,6}$/.test(tag)) throw new Error(de ? 'Das Kürzel muss 2 bis 6 Buchstaben oder Zahlen enthalten.' : 'The tag must contain 2 to 6 letters or numbers.');
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
    setGuildName('');
    setGuildTag('');
    setGuildDescription('');
    await refreshGuildData();
    setMessage(de ? `Gilde gegründet. ${formatGold(GUILD_CREATION_COST, language)} Gold wurden bezahlt.` : `Guild created. ${formatGold(GUILD_CREATION_COST, language)} gold was paid.`);
  });

  const tabButton = (key: GuildTab, label: string) => <button type="button" onClick={() => setTab(key)} className={`min-h-10 rounded-xl border px-2 text-[7px] font-black uppercase tracking-[.12em] active:scale-[.98] ${tab === key ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/8 bg-black/25 text-white/38'}`}>{label}</button>;
  const scrollClass = 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(18px,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch]';

  return <div data-testid="guild-panel-shell" className="flex h-[min(64dvh,620px)] min-h-[360px] flex-col overflow-hidden rounded-3xl border border-amber-300/18 bg-[#0d0b08]/96 p-3 text-white shadow-2xl">
    <header data-testid="guild-panel-header" className="relative shrink-0 border-b border-white/8 pb-3 pr-24">
      <button data-testid="guild-close-button" type="button" aria-label={de ? 'Gilde schließen' : 'Close guild'} onClick={onClose} className="absolute right-0 top-0 z-30 grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/45 text-lg font-black text-white/72 active:scale-90">×</button>
      <div className="text-[7px] font-black uppercase tracking-[.28em] text-amber-200/48">{de ? 'GILDE' : 'GUILD'}</div>
      <div className="mt-1 truncate text-[16px] font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Gilde gründen' : 'Create a guild')}</div>
      <div className="mt-1 line-clamp-2 text-[8px] leading-relaxed text-white/36">{membership ? (de ? 'Chat, Mitglieder, Rollen und Einladungen an einem Ort.' : 'Chat, members, roles and invitations in one place.') : (de ? `Gründe eine Gilde für ${formatGold(GUILD_CREATION_COST, language)} Gold oder nimm eine Einladung an.` : `Create a guild for ${formatGold(GUILD_CREATION_COST, language)} gold or accept an invite.`)}</div>
    </header>

    {(message || error) && <div className={`mt-2 shrink-0 rounded-xl border px-3 py-2 text-[9px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}
    {!session && <div className={`${scrollClass} space-y-3 text-[10px] leading-relaxed text-white/45`}><div>{de ? 'Melde dich an, damit Mitgliedschaften und Einladungen hier geladen werden.' : 'Sign in to load memberships and invitations here.'}</div><ActionButton label={de ? 'Zu Online & Cloud' : 'Open Online & Cloud'} onClick={onOpenOnline} primary /></div>}

    {session && membership && <div className="flex min-h-0 flex-1 flex-col">
      <div data-testid="guild-tabs" className="grid shrink-0 grid-cols-4 gap-1.5 pt-3">{tabButton('overview', de ? 'Übersicht' : 'Overview')}{tabButton('chat', 'Chat')}{tabButton('members', de ? 'Mitglieder' : 'Members')}{tabButton('invite', de ? 'Einladen' : 'Invite')}</div>

      {tab === 'overview' && <div data-testid="guild-overview-tab" className={`${scrollClass} space-y-3`}>
        <section data-testid="guild-presence-summary" className="grid grid-cols-2 gap-2">{[[stats.members, de ? 'Mitglieder' : 'Members'], [stats.online, de ? 'Online' : 'Online'], [stats.officers, de ? 'Offiziere' : 'Officers'], [roleLabel(membership.role, de), de ? 'Deine Rolle' : 'Your role']].map(([value, label]) => <div key={String(label)} className="rounded-xl border border-amber-300/12 bg-amber-400/[.04] px-2 py-2 text-center"><div className="truncate text-[12px] font-black text-amber-100">{value}</div><div className="mt-1 truncate text-[6px] font-black uppercase tracking-[.12em] text-white/30">{label}</div></div>)}</section>
        <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'GILDENBESCHREIBUNG' : 'GUILD DESCRIPTION'}</div>{isOwner ? <><textarea value={description} maxLength={500} rows={3} onChange={event => setDescription(event.target.value)} placeholder={de ? 'Ziele und Spielstil.' : 'Goals and play style.'} className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] leading-relaxed text-white outline-none placeholder:text-white/24 focus:border-amber-300/35" /><div className="flex items-center justify-between gap-3"><span className="text-[7px] text-white/24">{description.length}/500</span><ActionButton label={de ? 'Speichern' : 'Save'} onClick={saveDescription} disabled={busy} primary compact /></div></> : <div className="text-[9px] leading-relaxed text-white/45">{membership.guild.description || (de ? 'Noch keine Beschreibung vorhanden.' : 'No description yet.')}</div>}</section>
        <details data-testid="guild-danger-zone" className="group rounded-2xl border border-red-400/14 bg-red-500/[.035]"><summary className="cursor-pointer list-none px-3 py-3 text-[7px] font-black uppercase tracking-[.18em] text-red-200/55"><span className="flex items-center justify-between"><span>{de ? 'MITGLIEDSCHAFT VERWALTEN' : 'MANAGE MEMBERSHIP'}</span><span className="transition-transform group-open:rotate-90">›</span></span></summary><div className="space-y-2 border-t border-red-400/10 px-3 pb-3 pt-2"><div className="text-[9px] leading-relaxed text-white/38">{ownerMustTransfer ? (de ? 'Übertrage zuerst die Führung an ein anderes Mitglied.' : 'Transfer leadership to another member first.') : isOwner ? (de ? 'Beim Verlassen wird die Gilde vollständig aufgelöst.' : 'Leaving will disband the guild.') : (de ? 'Du kannst die Gilde jederzeit verlassen.' : 'You can leave at any time.')}</div><ActionButton label={ownerMustTransfer ? (de ? 'Mitglied auswählen' : 'Choose member') : isOwner ? (de ? 'Gilde auflösen' : 'Disband guild') : (de ? 'Gilde verlassen' : 'Leave guild')} onClick={ownerMustTransfer ? () => setTab('members') : leaveCurrentGuild} disabled={busy} danger /></div></details>
      </div>}

      {tab === 'chat' && <GuildChatPanel guildId={membership.guild.id} language={language} />}

      {tab === 'members' && <section data-testid="guild-members-tab" className={`${scrollClass} space-y-2`}>
        <div className="flex items-center justify-between gap-3 px-1"><div className="text-[8px] font-black uppercase tracking-[.18em] text-amber-100/62">{de ? `${members.length} Mitglieder` : `${members.length} members`}</div><div className="text-[7px] text-white/34">{stats.online} online</div></div>
        {members.map(member => {
          const ownerEntry = member.role === 'owner';
          const name = member.profile?.display_name ?? (de ? 'Unbekannter Spieler' : 'Unknown player');
          const presence = presenceByUserId[member.user_id];
          const online = isPresenceOnline(presence, presenceNow);
          const detail = `${roleLabel(member.role, de)}${member.joined_at ? ` · ${de ? 'Seit' : 'Since'} ${formatJoined(member.joined_at, language)}` : ''}`;
          return <article key={member.user_id} data-testid="guild-member-card" className="rounded-2xl border border-white/8 bg-white/[.025] p-2.5">
            <SocialIdentityCard
              testId="guild-member-profile-button"
              displayName={name}
              avatarKey={member.profile?.avatar_key}
              language={language}
              online={online}
              statusLabel={formatPresence(presence, language, presenceNow)}
              detail={detail}
              compact
              onClick={onOpenMemberProfile ? () => onOpenMemberProfile(member.user_id) : undefined}
            />
            <div data-testid="guild-member-presence" className="sr-only">{formatPresence(presence, language, presenceNow)}</div>
            {isOwner && !ownerEntry && <div data-testid="guild-member-management" className="mt-2 grid grid-cols-3 gap-2 border-t border-white/7 pt-2"><ActionButton label={member.role === 'officer' ? (de ? 'Mitglied' : 'Member') : (de ? 'Offizier' : 'Officer')} onClick={() => changeRole(member, member.role === 'officer' ? 'member' : 'officer')} disabled={busy} compact /><ActionButton label={de ? 'Führung' : 'Leader'} onClick={() => transferLeadership(member)} disabled={busy} primary compact /><ActionButton label={de ? 'Entfernen' : 'Remove'} onClick={() => kickMember(member)} disabled={busy} danger compact /></div>}
          </article>;
        })}
        {!members.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[9px] text-white/38">{de ? 'Keine Mitglieder gefunden.' : 'No members found.'}</div>}
      </section>}

      {tab === 'invite' && <section data-testid="guild-invite-tab" className={`${scrollClass} space-y-3`}><GuildInviteLinkCard language={language} /><div className="rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'SPIELER EINLADEN' : 'INVITE PLAYER'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/34">{de ? 'Nutze den exakten Spielernamen aus dem Online-Profil.' : 'Use the exact player name from the online profile.'}</div></div>{canInvite ? <div className="space-y-2"><input value={inviteName} maxLength={24} onChange={event => setInviteName(event.target.value)} placeholder={de ? 'Spielername' : 'Player name'} className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[11px] text-white outline-none placeholder:text-white/24 focus:border-amber-300/35" /><ActionButton label={de ? 'Einladung senden' : 'Send invitation'} onClick={sendInvite} disabled={busy} primary /></div> : <div className="rounded-xl border border-white/8 bg-black/25 p-3 text-[9px] text-white/38">{de ? 'Nur Anführer und Offiziere können Spieler einladen.' : 'Only leaders and officers can invite players.'}</div>}</section>}
      <div className="shrink-0 pt-2"><ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} compact /></div>
    </div>}

    {session && !membership && <div className={`${scrollClass} space-y-3`}><section className="space-y-3 rounded-2xl border border-amber-300/14 bg-amber-400/[.04] p-3"><div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"><span className="text-[7px] font-black uppercase text-white/34">{de ? 'DEIN GOLD' : 'YOUR GOLD'}</span><span className={`text-[11px] font-black ${canAffordGuild ? 'text-amber-100' : 'text-red-200'}`}>{formatGold(gold, language)} / {formatGold(GUILD_CREATION_COST, language)}</span></div><input value={guildName} maxLength={32} onChange={event => setGuildName(event.target.value)} placeholder={de ? 'Gildenname' : 'Guild name'} className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[11px] text-white outline-none placeholder:text-white/24" /><input value={guildTag} maxLength={6} onChange={event => setGuildTag(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} placeholder={de ? 'Kürzel, z. B. VEIL' : 'Tag, e.g. VEIL'} className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[11px] uppercase text-white outline-none placeholder:text-white/24" /><textarea value={guildDescription} maxLength={500} rows={3} onChange={event => setGuildDescription(event.target.value)} placeholder={de ? 'Beschreibung (optional)' : 'Description (optional)'} className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[10px] text-white outline-none placeholder:text-white/24" /><ActionButton label={de ? `Für ${formatGold(GUILD_CREATION_COST, language)} Gold gründen` : `Create for ${formatGold(GUILD_CREATION_COST, language)} gold`} onClick={createNewGuild} disabled={busy || !canAffordGuild} primary /></section>{invites.length > 0 && <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'EINGEHENDE EINLADUNGEN' : 'INCOMING INVITATIONS'}</div>{invites.map(invite => <div key={invite.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 p-2.5"><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold">[{invite.guild.tag}] {invite.guild.name}</div></div><ActionButton label="✓" onClick={() => answerInvite(invite.id, true)} disabled={busy} primary compact /><ActionButton label="×" onClick={() => answerInvite(invite.id, false)} disabled={busy} compact /></div>)}</section>}<ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} compact /></div>}
  </div>;
}
