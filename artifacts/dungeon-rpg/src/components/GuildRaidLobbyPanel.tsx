import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  currentOnlineSession,
  getMyGuildMembership,
  listGuildMembers,
  type OnlineGuildMember,
  type OnlineGuildMembership,
} from '../game/supabaseOnline';
import {
  answerGuildRaidInvitation,
  cancelGuildRaidInvitation,
  createGuildRaidLobby,
  createGuildRaidStartKey,
  dissolveGuildRaidLobby,
  fetchGuildRaidLobbySnapshot,
  inviteGuildRaidMember,
  leaveGuildRaidLobby,
  listMyGuildRaidInvitations,
  removeGuildRaidMember,
  setGuildRaidReady,
  startGuildRaidLobby,
  watchGuildRaidLobby,
  type GuildRaidIncomingInvitation,
  type GuildRaidLobbyMember,
  type GuildRaidLobbySnapshot,
  type GuildRaidRealtimeStatus,
} from '../game/guildRaidLobbyOnline';

type Props = { language: 'de' | 'en'; onClose: () => void };

function useLandscape(): boolean {
  const [landscape, setLandscape] = useState(() => typeof window !== 'undefined' && window.innerWidth > window.innerHeight);
  useEffect(() => {
    const refresh = () => setLandscape(window.innerWidth > window.innerHeight);
    const media = window.matchMedia('(orientation: landscape)');
    media.addEventListener?.('change', refresh);
    window.addEventListener('resize', refresh);
    refresh();
    return () => {
      media.removeEventListener?.('change', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, []);
  return landscape;
}

function timeRemaining(expiresAt: string, language: 'de' | 'en'): string {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return language === 'de' ? 'abgelaufen' : 'expired';
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  return language === 'de' ? `${minutes} Min.` : `${minutes} min`;
}

function roleLabel(member: GuildRaidLobbyMember, de: boolean): string {
  if (member.isLeader) return de ? 'Gruppenführer' : 'Party leader';
  if (member.guildRole === 'owner') return de ? 'Gildenanführer' : 'Guild leader';
  if (member.guildRole === 'officer') return de ? 'Offizier' : 'Officer';
  return de ? 'Mitglied' : 'Member';
}

function statusCopy(snapshot: GuildRaidLobbySnapshot, de: boolean): string {
  if (snapshot.status === 'started') return de ? 'Raid-Run wurde serverseitig angelegt.' : 'Raid run was created by the server.';
  if (snapshot.memberCount < 4) return de ? `${4 - snapshot.memberCount} Platz/Plätze noch frei.` : `${4 - snapshot.memberCount} slot(s) still open.`;
  if (snapshot.readyCount < 4) return de ? `${4 - snapshot.readyCount} Bereitschaft(en) fehlen.` : `${4 - snapshot.readyCount} ready state(s) missing.`;
  return de ? 'Alle vier bereit. Der Gruppenführer kann starten.' : 'All four ready. The party leader can start.';
}

export function GuildRaidLobbyPanel({ language, onClose }: Props) {
  const de = language === 'de';
  const session = currentOnlineSession();
  const landscape = useLandscape();
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [guildMembers, setGuildMembers] = useState<OnlineGuildMember[]>([]);
  const [snapshot, setSnapshot] = useState<GuildRaidLobbySnapshot | null>(null);
  const [incoming, setIncoming] = useState<GuildRaidIncomingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<GuildRaidRealtimeStatus>('offline');
  const startKeyRef = useRef(createGuildRaidStartKey());
  const snapshotVersionRef = useRef(0);
  const wasLandscapeRef = useRef(landscape);

  const refresh = useCallback(async () => {
    const nextMembership = await getMyGuildMembership();
    setMembership(nextMembership);
    if (!nextMembership) {
      setGuildMembers([]);
      setSnapshot(null);
      setIncoming([]);
      setLoading(false);
      return;
    }
    const [nextSnapshot, nextInvitations, nextMembers] = await Promise.all([
      fetchGuildRaidLobbySnapshot(),
      listMyGuildRaidInvitations(),
      listGuildMembers(nextMembership.guild.id),
    ]);
    setSnapshot(nextSnapshot);
    setIncoming(nextInvitations);
    setGuildMembers(nextMembers);
    snapshotVersionRef.current = nextSnapshot?.version ?? 0;
    setLoading(false);
  }, []);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (landscape) return;
    setBusy(true);
    setError('');
    setNotice('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, [landscape]);

  useEffect(() => {
    let active = true;
    void refresh().catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : String(reason));
      setLoading(false);
    });
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !landscape) void refresh().catch(() => undefined);
    }, 12_000);
    const visible = () => { if (document.visibilityState === 'visible' && !landscape) void refresh().catch(() => undefined); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [landscape, refresh]);

  useEffect(() => {
    if (!snapshot || snapshot.status === 'dissolved') {
      setRealtimeStatus('offline');
      return;
    }
    snapshotVersionRef.current = snapshot.version;
    return watchGuildRaidLobby(snapshot.lobbyId, snapshot.version, (version) => {
      if (version <= snapshotVersionRef.current) return;
      snapshotVersionRef.current = version;
      void refresh().catch(() => setRealtimeStatus('degraded'));
    }, setRealtimeStatus);
  }, [refresh, snapshot?.lobbyId, snapshot?.status]);

  useEffect(() => {
    if (wasLandscapeRef.current && !landscape) void refresh().catch(() => undefined);
    wasLandscapeRef.current = landscape;
  }, [landscape, refresh]);

  const currentUserId = session?.user.id ?? '';
  const me = snapshot?.members.find(member => member.userId === currentUserId) ?? null;
  const memberIds = useMemo(() => new Set(snapshot?.members.map(member => member.userId) ?? []), [snapshot?.members]);
  const invitedIds = useMemo(() => new Set(snapshot?.invitations.map(invitation => invitation.targetUserId) ?? []), [snapshot?.invitations]);
  const eligibleMembers = useMemo(() => guildMembers.filter(member => member.user_id !== currentUserId && !memberIds.has(member.user_id) && !invitedIds.has(member.user_id)), [currentUserId, guildMembers, invitedIds, memberIds]);
  const slots = useMemo(() => Array.from({ length: 4 }, (_, index) => snapshot?.members.find(member => member.slot === index + 1) ?? null), [snapshot?.members]);

  const applySnapshot = (next: GuildRaidLobbySnapshot) => {
    setSnapshot(next);
    snapshotVersionRef.current = next.version;
  };

  const realtimeLabel = realtimeStatus === 'connected'
    ? 'Live'
    : realtimeStatus === 'reconnecting'
      ? (de ? 'Neu verbinden' : 'Reconnecting')
      : realtimeStatus === 'connecting'
        ? (de ? 'Verbinden' : 'Connecting')
        : realtimeStatus === 'degraded'
          ? (de ? 'Sync eingeschränkt' : 'Sync degraded')
          : (de ? 'Snapshot' : 'Snapshot');

  return <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" data-testid="guild-raid-lobby-overlay">
    <section aria-label={de ? 'Gildenraid-Lobby' : 'Guild raid lobby'} data-testid="guild-raid-lobby-panel" data-lobby-version={snapshot?.version ?? 0} className="relative flex h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-violet-200/25 bg-[radial-gradient(circle_at_top,rgba(117,68,170,.22),transparent_38%),linear-gradient(155deg,#171221,#0b0910_62%,#100c14)] p-3 text-white shadow-[0_28px_80px_rgba(0,0,0,.65)]">
      {landscape && <div data-testid="guild-raid-landscape-blocker" className="absolute inset-0 z-50 grid place-items-center bg-[#08070d]/98 p-6 text-center">
        <div className="max-w-sm"><div className="text-4xl">↻</div><div className="mt-4 text-lg font-black text-violet-100">{de ? 'Zurück ins Hochformat' : 'Return to portrait'}</div><p className="mt-2 text-sm leading-relaxed text-white/55">{de ? 'Lobby-Aktionen sind im Querformat vollständig gesperrt. Nach dem Drehen wird der bestätigte Serverstand neu geladen.' : 'Lobby actions are fully blocked in landscape. The confirmed server snapshot reloads after rotation.'}</p></div>
      </div>}

      <header className="relative shrink-0 border-b border-white/10 pb-3 pr-14">
        <button type="button" data-testid="guild-raid-close" aria-label={de ? 'Gildenraid schließen' : 'Close guild raid'} onClick={onClose} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-black/35 text-xl text-white/75 active:scale-[.97]">×</button>
        <div className="flex flex-wrap items-center gap-2 text-[7px] font-black uppercase tracking-[.22em] text-violet-100/55"><span>{de ? 'Gildenraid' : 'Guild raid'}</span><span className={`rounded-full border px-2 py-1 ${realtimeStatus === 'connected' ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/[.04] text-white/45'}`}>{realtimeLabel}</span></div>
        <h2 className="mt-1 text-xl font-black text-violet-50">{de ? 'Vierer-Lobby' : 'Four-player lobby'}</h2>
        <p className="mt-1 text-[9px] leading-relaxed text-white/45">{de ? 'Vier feste Plätze. Nur Gildenmitglieder. Der Server entscheidet über Start und Teilnehmer.' : 'Four fixed slots. Guild members only. The server decides the start and participants.'}</p>
      </header>

      {(error || notice) && <div data-testid={error ? 'guild-raid-error' : 'guild-raid-notice'} className={`mt-2 rounded-xl border px-3 py-2 text-[9px] leading-relaxed ${error ? 'border-red-300/25 bg-red-500/10 text-red-100' : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'}`}>{error || notice}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch]" data-testid="guild-raid-scroll-region">
        {loading && <div className="grid min-h-48 place-items-center text-[10px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'Serverstand wird geladen…' : 'Loading server state…'}</div>}

        {!loading && !session && <div data-testid="guild-raid-auth-blocked" className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-center"><div className="text-base font-black text-white/82">{de ? 'Anmeldung erforderlich' : 'Sign-in required'}</div><p className="mt-2 text-[10px] leading-relaxed text-white/45">{de ? 'Gildenraids sind nur mit einem authentifizierten Konto verfügbar.' : 'Guild raids require an authenticated account.'}</p></div>}

        {!loading && session && !membership && <div data-testid="guild-raid-guildless-blocked" className="rounded-2xl border border-amber-300/20 bg-amber-400/[.06] p-5 text-center"><div className="text-base font-black text-amber-100">{de ? 'Keine aktive Gilde' : 'No active guild'}</div><p className="mt-2 text-[10px] leading-relaxed text-white/48">{de ? 'Tritt zuerst einer Gilde bei. Eine Raid-Lobby darf ausschließlich Mitglieder derselben Gilde enthalten.' : 'Join a guild first. A raid lobby may only contain members of the same guild.'}</p></div>}

        {!loading && membership && !snapshot && <div className="space-y-3">
          <section className="rounded-2xl border border-violet-300/18 bg-violet-400/[.055] p-4"><div className="text-[7px] font-black uppercase tracking-[.2em] text-violet-100/55">[{membership.guild.tag}] {membership.guild.name}</div><div className="mt-2 text-base font-black text-white/88">{de ? 'Raid-Gruppe aufstellen' : 'Form a raid party'}</div><p className="mt-1 text-[9px] leading-relaxed text-white/45">{de ? 'Du eröffnest Platz 1 als Gruppenführer. Weitere Mitglieder kommen ausschließlich über Einladungen hinzu.' : 'You open slot 1 as party leader. Other members join only through invitations.'}</p><button type="button" data-testid="guild-raid-create" disabled={busy} onClick={() => run(async () => { applySnapshot(await createGuildRaidLobby()); setNotice(de ? 'Raid-Lobby erstellt.' : 'Raid lobby created.'); })} className="mt-4 min-h-12 w-full rounded-xl border border-violet-200/30 bg-violet-500/18 px-4 text-[9px] font-black uppercase tracking-[.16em] text-violet-50 disabled:opacity-35 active:scale-[.985]">{de ? 'Raid-Lobby erstellen' : 'Create raid lobby'}</button></section>

          {incoming.length > 0 && <section data-testid="guild-raid-incoming-invitations" className="space-y-2 rounded-2xl border border-amber-300/18 bg-amber-400/[.045] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-100/65">{de ? 'Offene Einladungen' : 'Pending invitations'}</div>{incoming.map(invitation => <article key={invitation.invitationId} className="rounded-xl border border-white/9 bg-black/24 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[11px] font-black text-white/85">[{invitation.guildTag}] {invitation.guildName}</div><div className="mt-1 text-[8px] text-white/42">{de ? `Gruppenführer: ${invitation.leaderName}` : `Party leader: ${invitation.leaderName}`}</div></div><span className="shrink-0 text-[7px] text-amber-100/55">{timeRemaining(invitation.expiresAt, language)}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" data-testid="guild-raid-invite-decline" disabled={busy} onClick={() => run(async () => { await answerGuildRaidInvitation(invitation.invitationId, false); await refresh(); setNotice(de ? 'Einladung abgelehnt.' : 'Invitation declined.'); })} className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-[8px] font-black uppercase tracking-[.12em] text-white/55 disabled:opacity-35">{de ? 'Ablehnen' : 'Decline'}</button><button type="button" data-testid="guild-raid-invite-accept" disabled={busy} onClick={() => run(async () => { const next = await answerGuildRaidInvitation(invitation.invitationId, true); if (next) applySnapshot(next); await refresh(); setNotice(de ? 'Raid-Lobby beigetreten.' : 'Joined raid lobby.'); })} className="min-h-11 rounded-xl border border-emerald-300/25 bg-emerald-500/12 px-3 text-[8px] font-black uppercase tracking-[.12em] text-emerald-100 disabled:opacity-35">{de ? 'Annehmen' : 'Accept'}</button></div></article>)}</section>}
        </div>}

        {!loading && snapshot && <div className="space-y-3">
          <section data-testid="guild-raid-summary" className="rounded-2xl border border-violet-300/18 bg-violet-400/[.05] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[11px] font-black text-violet-50">[{snapshot.guildTag}] {snapshot.guildName}</div><div className="mt-1 text-[8px] leading-relaxed text-white/42">{statusCopy(snapshot, de)}</div></div><button type="button" data-testid="guild-raid-refresh" disabled={busy} onClick={() => run(refresh)} className="min-h-11 shrink-0 rounded-xl border border-white/10 bg-black/25 px-3 text-[7px] font-black uppercase tracking-[.12em] text-white/55 disabled:opacity-35">{de ? 'Aktualisieren' : 'Refresh'}</button></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-white/8 bg-black/22 p-2"><div className="text-sm font-black text-violet-100">{snapshot.memberCount}/4</div><div className="text-[6px] uppercase tracking-[.12em] text-white/30">{de ? 'Plätze' : 'Slots'}</div></div><div className="rounded-xl border border-white/8 bg-black/22 p-2"><div className="text-sm font-black text-emerald-100">{snapshot.readyCount}/4</div><div className="text-[6px] uppercase tracking-[.12em] text-white/30">Ready</div></div><div className="rounded-xl border border-white/8 bg-black/22 p-2"><div className="truncate text-[9px] font-black text-amber-100">v{snapshot.version}</div><div className="text-[6px] uppercase tracking-[.12em] text-white/30">Server</div></div></div></section>

          <section><div className="mb-2 text-[7px] font-black uppercase tracking-[.18em] text-white/38">{de ? 'Feste Raid-Plätze' : 'Stable raid slots'}</div><div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-2" data-testid="guild-raid-slots">{slots.map((member, index) => <article key={index} data-testid={`guild-raid-slot-${index + 1}`} className={`min-h-28 rounded-2xl border p-3 ${member ? 'border-violet-300/18 bg-violet-400/[.045]' : 'border-white/8 bg-black/22'}`}><div className="flex items-center justify-between gap-2"><span className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">Slot {index + 1}</span>{member && <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase ${member.ready ? 'border-emerald-300/18 bg-emerald-400/10 text-emerald-100' : 'border-white/9 bg-white/[.035] text-white/38'}`}>{member.ready ? 'Ready' : (de ? 'Offen' : 'Not ready')}</span>}</div>{member ? <><div className="mt-3 flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-sm font-black text-violet-100">{member.displayName.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="truncate text-[11px] font-black text-white/88">{member.displayName}</div><div className="mt-0.5 text-[7px] text-white/38">{roleLabel(member, de)}</div></div></div>{snapshot.viewerIsLeader && !member.isLeader && !member.ready && snapshot.status !== 'started' && <button type="button" data-testid="guild-raid-remove-member" disabled={busy} onClick={() => run(async () => { applySnapshot(await removeGuildRaidMember(snapshot.lobbyId, member.userId)); setNotice(de ? `${member.displayName} wurde entfernt.` : `${member.displayName} was removed.`); })} className="mt-3 min-h-11 w-full rounded-xl border border-red-300/16 bg-red-500/[.07] px-3 text-[7px] font-black uppercase tracking-[.12em] text-red-100/75 disabled:opacity-35">{de ? 'Nicht bereites Mitglied entfernen' : 'Remove unready member'}</button>}</> : <div className="mt-7 text-center text-[9px] font-bold text-white/22">{de ? 'Freier Platz' : 'Open slot'}</div>}</article>)}</div></section>

          {snapshot.viewerIsLeader && snapshot.status !== 'started' && <section data-testid="guild-raid-invite-section" className="space-y-2 rounded-2xl border border-white/9 bg-white/[.025] p-3"><div className="flex items-center justify-between gap-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/38">{de ? 'Gildenmitglieder einladen' : 'Invite guild members'}</div><span className="text-[7px] text-white/28">{eligibleMembers.length}</span></div>{snapshot.invitations.map(invitation => <div key={invitation.invitationId} data-testid="guild-raid-pending-invite" className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/12 bg-amber-400/[.04] px-3"><div className="min-w-0 flex-1"><div className="truncate text-[9px] font-black text-white/72">{invitation.displayName}</div><div className="text-[6px] uppercase tracking-[.12em] text-amber-100/42">{de ? 'Einladung offen' : 'Invitation pending'} · {timeRemaining(invitation.expiresAt, language)}</div></div><button type="button" data-testid="guild-raid-cancel-invite" disabled={busy} onClick={() => run(async () => { applySnapshot(await cancelGuildRaidInvitation(invitation.invitationId)); setNotice(de ? 'Einladung zurückgezogen.' : 'Invitation cancelled.'); })} className="min-h-11 rounded-lg px-3 text-[7px] font-black uppercase text-red-100/70 disabled:opacity-35">{de ? 'Zurückziehen' : 'Cancel'}</button></div>)}{eligibleMembers.map(member => <button key={member.user_id} type="button" data-testid="guild-raid-invite-member" disabled={busy || snapshot.memberCount >= 4} onClick={() => run(async () => { applySnapshot(await inviteGuildRaidMember(snapshot.lobbyId, member.user_id)); setNotice(de ? 'Einladung gesendet.' : 'Invitation sent.'); })} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/22 px-3 text-left disabled:opacity-30"><span className="min-w-0 truncate text-[9px] font-black text-white/70">{member.profile?.display_name ?? (de ? 'Unbekannter Spieler' : 'Unknown player')}</span><span className="shrink-0 text-[7px] font-black uppercase text-violet-100/65">{de ? 'Einladen +' : 'Invite +'}</span></button>)}{eligibleMembers.length === 0 && snapshot.invitations.length === 0 && <div className="rounded-xl border border-white/7 bg-black/16 p-3 text-center text-[8px] text-white/28">{snapshot.memberCount >= 4 ? (de ? 'Alle vier Plätze sind belegt.' : 'All four slots are occupied.') : (de ? 'Keine weiteren verfügbaren Gildenmitglieder.' : 'No other eligible guild members.')}</div>}</section>}

          {snapshot.status !== 'started' && <section className="grid grid-cols-2 gap-2"><button type="button" data-testid="guild-raid-ready-toggle" disabled={busy || !me} onClick={() => run(async () => { applySnapshot(await setGuildRaidReady(snapshot.lobbyId, !me?.ready)); setNotice(!me?.ready ? (de ? 'Du bist bereit.' : 'You are ready.') : (de ? 'Bereitschaft gelöst.' : 'Ready state cleared.')); })} className={`min-h-12 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[.13em] disabled:opacity-35 ${me?.ready ? 'border-white/10 bg-black/24 text-white/55' : 'border-emerald-300/25 bg-emerald-500/12 text-emerald-100'}`}>{me?.ready ? (de ? 'Nicht bereit' : 'Unready') : (de ? 'Bereit' : 'Ready')}</button><button type="button" data-testid="guild-raid-leave" disabled={busy} onClick={() => run(async () => { if (!window.confirm(de ? 'Raid-Lobby wirklich verlassen?' : 'Leave the raid lobby?')) return; const result = await leaveGuildRaidLobby(snapshot.lobbyId); setSnapshot(null); await refresh(); setNotice(result.newLeaderUserId ? (de ? 'Lobby verlassen. Führung wurde nach Slot-Reihenfolge übertragen.' : 'Left lobby. Leadership transferred by slot order.') : (de ? 'Lobby verlassen.' : 'Left lobby.')); })} className="min-h-12 rounded-xl border border-red-300/18 bg-red-500/[.07] px-3 text-[8px] font-black uppercase tracking-[.13em] text-red-100/75 disabled:opacity-35">{de ? 'Verlassen' : 'Leave'}</button></section>}

          {snapshot.viewerIsLeader && snapshot.status !== 'started' && <button type="button" data-testid="guild-raid-dissolve" disabled={busy} onClick={() => run(async () => { if (!window.confirm(de ? 'Raid-Lobby für alle auflösen?' : 'Dissolve the raid lobby for everyone?')) return; await dissolveGuildRaidLobby(snapshot.lobbyId); setSnapshot(null); await refresh(); setNotice(de ? 'Raid-Lobby aufgelöst.' : 'Raid lobby dissolved.'); })} className="min-h-11 w-full rounded-xl border border-red-300/12 bg-transparent px-3 text-[7px] font-black uppercase tracking-[.14em] text-red-100/45 disabled:opacity-35">{de ? 'Lobby auflösen' : 'Dissolve lobby'}</button>}

          <section data-testid="guild-raid-start-section" className={`rounded-2xl border p-3 ${snapshot.canStart ? 'border-amber-200/28 bg-amber-400/[.08]' : 'border-white/9 bg-black/20'}`}><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/38">{de ? 'Serverstart' : 'Server start'}</div><p className="mt-1 text-[8px] leading-relaxed text-white/40">{snapshot.viewerIsLeader ? statusCopy(snapshot, de) : (de ? 'Nur der aktuelle Gruppenführer kann den Raid starten.' : 'Only the current party leader can start the raid.')}</p><button type="button" data-testid="guild-raid-start" disabled={busy || !snapshot.canStart || snapshot.status === 'started'} onClick={() => run(async () => { const next = await startGuildRaidLobby(snapshot.lobbyId, startKeyRef.current); applySnapshot(next); setNotice(de ? 'Raid-Run genau einmal angelegt.' : 'Raid run created exactly once.'); })} className="mt-3 min-h-12 w-full rounded-xl border border-amber-200/30 bg-amber-500/14 px-4 text-[9px] font-black uppercase tracking-[.17em] text-amber-100 disabled:opacity-30">{snapshot.status === 'started' ? (de ? 'Raid gestartet' : 'Raid started') : (de ? 'Raid starten' : 'Start raid')}</button></section>

          {snapshot.status === 'started' && <section data-testid="guild-raid-started-handoff" className="rounded-2xl border border-emerald-300/22 bg-emerald-500/[.07] p-4"><div className="text-[7px] font-black uppercase tracking-[.18em] text-emerald-100/62">{de ? 'Block-11-Übergabe bereit' : 'Block 11 handoff ready'}</div><div className="mt-2 break-all font-mono text-[9px] text-emerald-50/75">{snapshot.raidRunId}</div><p className="mt-2 text-[8px] leading-relaxed text-white/40">{de ? 'Vier Teilnehmer und Raum 1 wurden serverseitig eingefroren. Der synchronisierte Raid-Run folgt in Block 11.' : 'Four participants and room 1 were frozen server-side. The synchronized raid run follows in Block 11.'}</p></section>}
        </div>}
      </div>
    </section>
  </div>;
}
