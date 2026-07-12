import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptGuildInvite,
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

type Props = {
  language: 'de' | 'en';
};

type GuildTab = 'overview' | 'members' | 'invite';

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

export function GuildPanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
  const [invites, setInvites] = useState<OnlineGuildInvite[]>([]);
  const [tab, setTab] = useState<GuildTab>('overview');
  const [description, setDescription] = useState('');
  const [inviteName, setInviteName] = useState('');
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
    const refresh = () => { void run(refreshGuildData); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void run(refreshGuildData);
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, [refreshGuildData, run]);

  const stats = useMemo(() => ({
    members: members.length,
    officers: members.filter(member => member.role === 'officer').length,
  }), [members]);

  const canInvite = membership?.role === 'owner' || membership?.role === 'officer';
  const isOwner = membership?.role === 'owner';

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

  const tabButton = (key: GuildTab, label: string) => <button
    type="button"
    onClick={() => setTab(key)}
    className={`min-h-10 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[.14em] active:scale-[.98] ${tab === key ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/8 bg-black/25 text-white/38'}`}
  >{label}</button>;

  return <div className="max-h-[76vh] overflow-y-auto rounded-3xl border border-amber-300/18 bg-[#0d0b08]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.3em] text-amber-200/48">{de ? 'GILDE' : 'GUILD'}</div>
      <div className="mt-1 text-lg font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Noch gesperrt' : 'Locked')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{membership
        ? (de ? 'Verwalte Mitglieder, Rollen, Einladungen und die Gildenbeschreibung.' : 'Manage members, roles, invitations and the guild description.')
        : (de ? 'Gilden werden später im Spiel gegen Gold freigeschaltet.' : 'Guilds unlock later in the game for gold.')}</div>
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

        <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[.035] p-3 text-[9px] leading-relaxed text-white/38">{de
          ? 'Die Gründung neuer Gilden bleibt gesperrt und wird später ausschließlich gegen Gold freigeschaltet.'
          : 'Creating new guilds remains locked and will later unlock only for gold.'}</div>
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
            {isOwner && !ownerEntry && <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton
                label={member.role === 'officer' ? (de ? 'Zum Mitglied' : 'Make member') : (de ? 'Zum Offizier' : 'Make officer')}
                onClick={() => changeRole(member, member.role === 'officer' ? 'member' : 'officer')}
                disabled={busy}
              />
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
      <section className="rounded-2xl border border-amber-300/14 bg-amber-400/[.04] p-3">
        <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/75">{de ? 'Noch gesperrt' : 'Locked'}</div>
        <div className="mt-1 text-[10px] leading-relaxed text-white/40">{de ? 'Hier kann keine kostenlose Gilde gegründet werden. Die Freischaltung erfolgt später gegen Gold.' : 'A free guild cannot be created here. Guild access will unlock later for gold.'}</div>
      </section>
      <ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} />
    </div>}

    {session && invites.length > 0 && <section className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
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
