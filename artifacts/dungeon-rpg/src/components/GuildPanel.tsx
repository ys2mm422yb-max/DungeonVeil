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

type Props = {
  language: 'de' | 'en';
};

type GuildTab = 'overview' | 'members' | 'invite';

const GUILD_CREATION_COST = 2500;

function ActionButton({ label, onClick, disabled = false, primary = false, danger = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const style = danger
    ? 'border-red-400/25 bg-red-500/10 text-red-200'
    : primary
      ? 'border-amber-300/35 bg-amber-500/15 text-amber-100'
      : 'border-white/10 bg-white/[.04] text-white/62';
  return <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`min-h-10 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${style} ${disabled ? 'pointer-events-none opacity-35' : ''}`}
  >{label}</button>;
}

function roleLabel(role: OnlineGuildRole, de: boolean): string {
  if (role === 'owner') return de ? 'Anführer' : 'Leader';
  if (role === 'officer') return de ? 'Offizier' : 'Officer';
  return de ? 'Mitglied' : 'Member';
}

function formatJoined(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

function formatGold(value: number, language: 'de' | 'en'): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US').format(Math.floor(value));
}

export function GuildPanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
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
    if (!active) {
      setMembership(null);
      setMembers([]);
      setInvites([]);
      return;
    }

    const [nextMembership, nextInvites] = await Promise.all([
      getMyGuildMembership(),
      listMyGuildInvites(),
    ]);
    const nextMembers = nextMembership ? await listGuildMembers(nextMembership.guild.id) : [];

    setMembership(nextMembership);
    setMembers(nextMembers);
    setInvites(nextInvites);
    setDescription(nextMembership?.guild.description ?? '');
  }, []);

  useEffect(() => {
    const refreshOnline = () => { void run(refreshGuildData); };
    const refreshGold = () => setGold(loadMetaProgression().gold);
    window.addEventListener(onlineSessionEventName(), refreshOnline);
    window.addEventListener('dungeon-veil-meta-changed', refreshGold);
    void run(refreshGuildData);
    return () => {
      window.removeEventListener(onlineSessionEventName(), refreshOnline);
      window.removeEventListener('dungeon-veil-meta-changed', refreshGold);
    };
  }, [refreshGuildData, run]);

  const stats = useMemo(() => ({
    members: members.length,
    officers: members.filter(member => member.role === 'officer').length,
  }), [members]);

  const canInvite = membership?.role === 'owner' || membership?.role === 'officer';
  const isOwner = membership?.role === 'owner';
  const ownerMustTransfer = Boolean(isOwner && members.length > 1);
  const canAffordGuild = gold >= GUILD_CREATION_COST;

  const answerInvite = (inviteId: string, accept: boolean) => run(async () => {
    if (accept) await acceptGuildInvite(inviteId);
    else await declineGuildInvite(inviteId);
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
    const confirmed = window.confirm(de
      ? `Gildenführung wirklich an ${playerName} übertragen?`
      : `Really transfer guild leadership to ${playerName}?`);
    if (!confirmed) return;
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
    const confirmed = window.confirm(disband
      ? (de ? 'Gilde endgültig auflösen? Dieser Schritt kann nicht rückgängig gemacht werden.' : 'Disband the guild permanently? This cannot be undone.')
      : (de ? 'Gilde wirklich verlassen?' : 'Really leave the guild?'));
    if (!confirmed) return;

    const result = await leaveGuildOnline();
    await refreshGuildData();
    setTab('overview');
    setMessage(result.disbanded
      ? (de ? 'Gilde aufgelöst.' : 'Guild disbanded.')
      : (de ? 'Gilde verlassen.' : 'Guild left.'));
  });

  const createNewGuild = () => run(async () => {
    const name = guildName.trim();
    const tag = guildTag.trim().toUpperCase();
    const nextDescription = guildDescription.trim();

    if (name.length < 3 || name.length > 32) throw new Error(de ? 'Der Gildenname muss 3 bis 32 Zeichen lang sein.' : 'Guild name must be 3 to 32 characters long.');
    if (!/^[A-Z0-9]{2,6}$/.test(tag)) throw new Error(de ? 'Das Kürzel muss 2 bis 6 Buchstaben oder Zahlen enthalten.' : 'The tag must contain 2 to 6 letters or numbers.');

    const meta = loadMetaProgression();
    if (meta.gold < GUILD_CREATION_COST) {
      throw new Error(de
        ? `Dir fehlen ${formatGold(GUILD_CREATION_COST - meta.gold, language)} Gold.`
        : `You need ${formatGold(GUILD_CREATION_COST - meta.gold, language)} more gold.`);
    }

    meta.gold -= GUILD_CREATION_COST;
    saveMetaProgression(meta);
    setGold(meta.gold);

    try {
      await createGuild(name, tag, nextDescription);
    } catch (reason) {
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

  const tabButton = (key: GuildTab, label: string) => <button
    type="button"
    onClick={() => setTab(key)}
    className={`min-h-10 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[.14em] active:scale-[.98] ${tab === key ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/8 bg-black/25 text-white/38'}`}
  >{label}</button>;

  return <div className="max-h-[76vh] overflow-y-auto rounded-3xl border border-amber-300/18 bg-[#0d0b08]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.3em] text-amber-200/48">{de ? 'GILDE' : 'GUILD'}</div>
      <div className="mt-1 text-lg font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Gilde gründen' : 'Create a guild')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{membership
        ? (de ? 'Verwalte Mitglieder, Rollen, Einladungen und die Gildenbeschreibung.' : 'Manage members, roles, invitations and the guild description.')
        : (de ? `Gründe deine eigene Gilde für ${formatGold(GUILD_CREATION_COST, language)} Gold oder nimm eine Einladung an.` : `Create your own guild for ${formatGold(GUILD_CREATION_COST, language)} gold or accept an invitation.`)}</div>
    </div>

    {(message || error) && <div className={`mb-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session && <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42">{de ? 'Melde dich zuerst unter Online & Cloud an. Bestehende Mitgliedschaften und Einladungen werden danach hier geladen.' : 'Sign in through Online & Cloud first. Existing memberships and invitations will then load here.'}</div>}

    {session && membership && <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {tabButton('overview', de ? 'Übersicht' : 'Overview')}
        {tabButton('members', de ? 'Mitglieder' : 'Members')}
        {tabButton('invite', de ? 'Einladen' : 'Invite')}
      </div>

      {tab === 'overview' && <div className="space-y-3">
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-amber-300/14 bg-amber-400/[.045] p-3 text-center">
            <div className="text-lg font-black text-amber-100">{stats.members}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-[.16em] text-white/32">{de ? 'Mitglieder' : 'Members'}</div>
          </div>
          <div className="rounded-2xl border border-amber-300/14 bg-amber-400/[.045] p-3 text-center">
            <div className="text-lg font-black text-amber-100">{stats.officers}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-[.16em] text-white/32">{de ? 'Offiziere' : 'Officers'}</div>
          </div>
          <div className="rounded-2xl border border-amber-300/14 bg-amber-400/[.045] p-3 text-center">
            <div className="text-[11px] font-black text-amber-100">{roleLabel(membership.role, de)}</div>
            <div className="mt-2 text-[7px] font-black uppercase tracking-[.16em] text-white/32">{de ? 'Deine Rolle' : 'Your role'}</div>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'GILDENBESCHREIBUNG' : 'GUILD DESCRIPTION'}</div>
          {isOwner ? <>
            <textarea
              value={description}
              maxLength={500}
              rows={4}
              onChange={event => setDescription(event.target.value)}
              placeholder={de ? 'Beschreibe eure Gilde, Ziele und Spielstil.' : 'Describe your guild, goals and play style.'}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] text-white/24">{description.length}/500</span>
              <ActionButton label={de ? 'Speichern' : 'Save'} onClick={saveDescription} disabled={busy} primary />
            </div>
          </> : <div className="text-[10px] leading-relaxed text-white/45">{membership.guild.description || (de ? 'Noch keine Beschreibung vorhanden.' : 'No description yet.')}</div>}
        </section>

        <section className="space-y-2 rounded-2xl border border-red-400/14 bg-red-500/[.035] p-3">
          <div className="text-[8px] font-black uppercase tracking-[.2em] text-red-200/55">{de ? 'MITGLIEDSCHAFT' : 'MEMBERSHIP'}</div>
          {ownerMustTransfer ? <>
            <div className="text-[9px] leading-relaxed text-white/38">{de ? 'Als Anführer musst du die Führung übertragen, bevor du die Gilde verlassen kannst.' : 'As leader, transfer leadership before leaving the guild.'}</div>
            <ActionButton label={de ? 'Mitglied auswählen' : 'Choose member'} onClick={() => setTab('members')} disabled={busy} danger />
          </> : <>
            <div className="text-[9px] leading-relaxed text-white/38">{isOwner
              ? (de ? 'Du bist das einzige Mitglied. Beim Verlassen wird die Gilde vollständig aufgelöst.' : 'You are the only member. Leaving will disband the guild.')
              : (de ? 'Du kannst die Gilde jederzeit verlassen.' : 'You can leave the guild at any time.')}</div>
            <ActionButton label={isOwner ? (de ? 'Gilde auflösen' : 'Disband guild') : (de ? 'Gilde verlassen' : 'Leave guild')} onClick={leaveCurrentGuild} disabled={busy} danger />
          </>}
        </section>
      </div>}

      {tab === 'members' && <section className="space-y-2">
        {members.map(member => {
          const ownerEntry = member.role === 'owner';
          return <div key={member.user_id} className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-black text-white/82">{member.profile?.display_name ?? (de ? 'Unbekannter Spieler' : 'Unknown player')}</div>
                <div className="mt-1 text-[8px] uppercase tracking-[.14em] text-amber-100/50">{roleLabel(member.role, de)}{member.joined_at ? ` · ${formatJoined(member.joined_at, language)}` : ''}</div>
              </div>
              <div className="rounded-full border border-amber-300/14 bg-amber-400/[.06] px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-amber-100/65">{member.role}</div>
            </div>
            {isOwner && !ownerEntry && <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionButton
                label={member.role === 'officer' ? (de ? 'Mitglied' : 'Member') : (de ? 'Offizier' : 'Officer')}
                onClick={() => changeRole(member, member.role === 'officer' ? 'member' : 'officer')}
                disabled={busy}
              />
              <ActionButton label={de ? 'Führung' : 'Leader'} onClick={() => transferLeadership(member)} disabled={busy} primary />
              <ActionButton label={de ? 'Entfernen' : 'Remove'} onClick={() => kickMember(member)} disabled={busy} danger />
            </div>}
          </div>;
        })}
        {!members.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[10px] text-white/38">{de ? 'Keine Mitglieder gefunden.' : 'No members found.'}</div>}
      </section>}

      {tab === 'invite' && <section className="space-y-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'SPIELER EINLADEN' : 'INVITE PLAYER'}</div>
          <div className="mt-1 text-[9px] leading-relaxed text-white/34">{de ? 'Suche exakt nach dem Spielernamen aus dem Online-Profil.' : 'Search using the exact player name from the online profile.'}</div>
        </div>
        {canInvite ? <>
          <input
            value={inviteName}
            maxLength={24}
            onChange={event => setInviteName(event.target.value)}
            placeholder={de ? 'Spielername' : 'Player name'}
            className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
          />
          <ActionButton label={de ? 'Einladung senden' : 'Send invitation'} onClick={sendInvite} disabled={busy} primary />
        </> : <div className="rounded-xl border border-white/8 bg-black/25 p-3 text-[10px] leading-relaxed text-white/38">{de ? 'Nur Anführer und Offiziere können Spieler einladen.' : 'Only leaders and officers can invite players.'}</div>}
      </section>}

      <ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} />
    </div>}

    {session && !membership && <div className="space-y-3">
      <section className="space-y-3 rounded-2xl border border-amber-300/14 bg-amber-400/[.04] p-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
          <span className="text-[8px] font-black uppercase tracking-[.16em] text-white/34">{de ? 'DEIN GOLD' : 'YOUR GOLD'}</span>
          <span className={`text-[12px] font-black ${canAffordGuild ? 'text-amber-100' : 'text-red-200'}`}>{formatGold(gold, language)} / {formatGold(GUILD_CREATION_COST, language)}</span>
        </div>
        <input
          value={guildName}
          maxLength={32}
          onChange={event => setGuildName(event.target.value)}
          placeholder={de ? 'Gildenname' : 'Guild name'}
          className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
        />
        <input
          value={guildTag}
          maxLength={6}
          onChange={event => setGuildTag(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
          placeholder={de ? 'Kürzel, z. B. VEIL' : 'Tag, e.g. VEIL'}
          className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[12px] uppercase text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
        />
        <textarea
          value={guildDescription}
          maxLength={500}
          rows={3}
          onChange={event => setGuildDescription(event.target.value)}
          placeholder={de ? 'Beschreibung (optional)' : 'Description (optional)'}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[11px] leading-relaxed text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
        />
        <ActionButton
          label={de ? `Für ${formatGold(GUILD_CREATION_COST, language)} Gold gründen` : `Create for ${formatGold(GUILD_CREATION_COST, language)} gold`}
          onClick={createNewGuild}
          disabled={busy || !canAffordGuild}
          primary
        />
      </section>
      <ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} />
    </div>}

    {session && !membership && invites.length > 0 && <section className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
      <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'EINGEHENDE EINLADUNGEN' : 'INCOMING INVITATIONS'}</div>
      {invites.map(invite => <div key={invite.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 p-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold">[{invite.guild.tag}] {invite.guild.name}</div>
          <div className="text-[8px] text-white/30">{de ? 'Gildeneinladung' : 'Guild invitation'}</div>
        </div>
        <ActionButton label="✓" onClick={() => answerInvite(invite.id, true)} disabled={busy} primary />
        <ActionButton label="×" onClick={() => answerInvite(invite.id, false)} disabled={busy} />
      </div>)}
    </section>}
  </div>;
}
