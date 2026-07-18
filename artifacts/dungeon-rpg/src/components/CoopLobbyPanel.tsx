import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COOP_LOBBY_EVENT,
  captureCoopInviteCodeFromUrl,
  createCoopLobby,
  getMyCoopLobby,
  heartbeatCoopLobby,
  joinCoopLobby,
  leaveCoopLobby,
  listMyCoopLobbyMembers,
  makeCoopInviteUrl,
  normalizeCoopInviteCode,
  pendingCoopInviteCode,
  setCoopLobbyReady,
  startCoopLobby,
  type CoopLobbyMember,
  type CoopLobbySnapshot,
} from '../game/coopLobbyOnline';
import { COOP_PLAYER_LIMIT } from '../game/coopRunMode';
import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';

type Props = {
  language: 'de' | 'en';
  onOpenOnline: () => void;
  onStartRun: (lobby: CoopLobbySnapshot) => void;
};

const POLL_MS = 3_000;
const HEARTBEAT_MS = 15_000;

function errorText(error: unknown, de: boolean): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (/not authenticated|Nicht angemeldet/i.test(raw)) return de ? 'Bitte zuerst bei Online & Cloud anmelden.' : 'Sign in through Online & Cloud first.';
  if (/not found/i.test(raw)) return de ? 'Keine aktive Duo-Lobby mit diesem Code gefunden.' : 'No active duo lobby was found for that code.';
  if (/full/i.test(raw)) return de ? 'Diese Duo-Lobby ist bereits voll.' : 'This duo lobby is already full.';
  if (/another coop lobby/i.test(raw)) return de ? 'Du bist bereits in einer anderen Duo-Lobby.' : 'You are already in another duo lobby.';
  return raw || (de ? 'Duo-Lobby konnte nicht geladen werden.' : 'The duo lobby could not be loaded.');
}

export function CoopLobbyPanel({ language, onOpenOnline, onStartRun }: Props) {
  const de = language === 'de';
  const startedLobbyRef = useRef('');
  const [signedIn, setSignedIn] = useState(() => Boolean(currentOnlineSession()));
  const [lobby, setLobby] = useState<CoopLobbySnapshot | null>(null);
  const [members, setMembers] = useState<CoopLobbyMember[]>([]);
  const [code, setCode] = useState(() => pendingCoopInviteCode());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const online = Boolean(currentOnlineSession());
    setSignedIn(online);
    if (!online) {
      setLobby(null);
      setMembers([]);
      startedLobbyRef.current = '';
      return;
    }
    try {
      const next = await getMyCoopLobby();
      setLobby(next);
      setMembers(next ? await listMyCoopLobbyMembers() : []);
      setError('');
      if (!next) startedLobbyRef.current = '';
      else if (next.status === 'in_run' && startedLobbyRef.current !== next.lobby_id) {
        startedLobbyRef.current = next.lobby_id;
        onStartRun(next);
      }
    } catch (refreshError) {
      setError(errorText(refreshError, de));
    }
  }, [de, onStartRun]);

  useEffect(() => {
    const captured = captureCoopInviteCodeFromUrl();
    if (captured) setCode(captured);
    void refresh();
    const handleChange = () => void refresh();
    window.addEventListener(COOP_LOBBY_EVENT, handleChange);
    window.addEventListener(onlineSessionEventName(), handleChange);
    const poll = window.setInterval(handleChange, POLL_MS);
    const heartbeat = window.setInterval(() => { void heartbeatCoopLobby().catch(() => {}); }, HEARTBEAT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(heartbeat);
      window.removeEventListener(COOP_LOBBY_EVENT, handleChange);
      window.removeEventListener(onlineSessionEventName(), handleChange);
    };
  }, [refresh]);

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(errorText(actionError, de));
    } finally {
      setBusy(false);
    }
  }, [de, refresh]);

  const shareUrl = useMemo(() => lobby ? makeCoopInviteUrl(lobby.invite_code) : '', [lobby]);
  const me = members.find(member => member.user_id === currentOnlineSession()?.user.id);
  const bothPresent = members.length === COOP_PLAYER_LIMIT;
  const bothReady = bothPresent && members.every(member => member.ready);

  const copyInvite = async () => {
    if (!lobby) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice(de ? 'Einladungslink kopiert.' : 'Invite link copied.');
    } catch {
      setNotice(`${lobby.invite_code} · ${shareUrl}`);
    }
  };

  const shareInvite = async () => {
    if (!lobby) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dungeon Veil Duo',
          text: de ? `Tritt meiner Duo-Lobby bei. Code: ${lobby.invite_code}` : `Join my duo lobby. Code: ${lobby.invite_code}`,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    await copyInvite();
  };

  if (!signedIn) {
    return <section data-testid="coop-lobby-panel" className="rounded-3xl border border-violet-200/16 bg-[#15111d]/96 p-4 text-white shadow-2xl">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-100/52">{de ? 'DUO-RUN · ZWEI SPIELER' : 'DUO RUN · TWO PLAYERS'}</div>
      <h2 className="mt-2 font-serif text-xl font-black text-violet-50">{de ? 'Gemeinsam durch den Schleier' : 'Enter the veil together'}</h2>
      <p className="mt-2 text-[9px] leading-relaxed text-white/48">{de ? 'Für private Duo-Lobbys, gemeinsame Seeds und die spätere sichere Loot-Verteilung wird ein Online-Konto benötigt.' : 'Private duo lobbies, shared seeds and secure loot distribution require an online account.'}</p>
      <button type="button" onPointerDown={event => { event.preventDefault(); onOpenOnline(); }} className="mt-4 w-full rounded-2xl border border-violet-200/22 bg-violet-300/10 py-3 text-[9px] font-black uppercase tracking-[.18em] text-violet-50 active:scale-[.98]">Online & Cloud</button>
    </section>;
  }

  return <section data-testid="coop-lobby-panel" className="max-h-[76dvh] overflow-y-auto rounded-3xl border border-violet-200/16 bg-[#15111d]/96 p-4 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-100/52">{de ? 'DUO-RUN · ECHTZEIT' : 'DUO RUN · REALTIME'}</div><h2 className="mt-1 font-serif text-xl font-black text-violet-50">{lobby ? (de ? 'Private Duo-Lobby' : 'Private duo lobby') : (de ? 'Duo-Lobby erstellen' : 'Create a duo lobby')}</h2></div>
      <div className="rounded-full border border-emerald-200/18 bg-emerald-300/8 px-2 py-1 text-[6px] font-black uppercase tracking-[.13em] text-emerald-100/70">{de ? 'Solo unverändert' : 'Solo unchanged'}</div>
    </div>

    {!lobby && <>
      <p className="mt-3 text-[9px] leading-relaxed text-white/46">{de ? 'Erstelle eine private Gruppe oder tritt mit einem sechsstelligen Code bei. Die Lobby ist auf genau zwei Spieler begrenzt.' : 'Create a private party or join with a six-character code. The lobby is limited to exactly two players.'}</p>
      <button data-testid="coop-create-lobby" type="button" disabled={busy} onPointerDown={event => { event.preventDefault(); void runAction(createCoopLobby); }} className="mt-4 w-full rounded-2xl border border-violet-200/24 bg-violet-300/12 py-3 text-[9px] font-black uppercase tracking-[.18em] text-violet-50 active:scale-[.98] disabled:opacity-40">{busy ? (de ? 'WIRD ERSTELLT…' : 'CREATING…') : (de ? 'PRIVATE DUO-LOBBY ERSTELLEN' : 'CREATE PRIVATE DUO LOBBY')}</button>
      <div className="my-4 flex items-center gap-3 text-[6px] font-black uppercase tracking-[.2em] text-white/24"><span className="h-px flex-1 bg-white/8" />{de ? 'ODER BEITRETEN' : 'OR JOIN'}<span className="h-px flex-1 bg-white/8" /></div>
      <div className="flex gap-2">
        <input data-testid="coop-invite-code-input" value={code} onChange={event => setCode(normalizeCoopInviteCode(event.target.value))} inputMode="text" autoCapitalize="characters" maxLength={6} placeholder="ABC123" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center font-mono text-base font-black tracking-[.28em] text-white outline-none focus:border-violet-200/34" />
        <button data-testid="coop-join-lobby" type="button" disabled={busy || code.length !== 6} onPointerDown={event => { event.preventDefault(); void runAction(() => joinCoopLobby(code)); }} className="rounded-2xl border border-white/12 bg-white/7 px-4 text-[8px] font-black uppercase tracking-[.12em] text-white/72 active:scale-[.98] disabled:opacity-30">{de ? 'BEITRETEN' : 'JOIN'}</button>
      </div>
    </>}

    {lobby && <>
      <div className="mt-4 rounded-2xl border border-amber-100/14 bg-amber-200/[.045] p-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[6px] font-black uppercase tracking-[.2em] text-amber-100/42">{de ? 'GRUPPENCODE' : 'PARTY CODE'}</div><div data-testid="coop-invite-code" className="mt-1 font-mono text-2xl font-black tracking-[.26em] text-amber-50">{lobby.invite_code}</div></div><div className="flex gap-2"><button type="button" onPointerDown={event => { event.preventDefault(); void copyInvite(); }} className="rounded-xl border border-amber-100/14 bg-black/20 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-amber-50/70">{de ? 'KOPIEREN' : 'COPY'}</button><button type="button" onPointerDown={event => { event.preventDefault(); void shareInvite(); }} className="rounded-xl border border-amber-100/14 bg-black/20 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-amber-50/70">{de ? 'TEILEN' : 'SHARE'}</button></div></div>
        <div className="mt-2 text-[7px] text-white/34">Seed {lobby.run_seed} · {lobby.role === 'host' ? (de ? 'Du bist Host' : 'You are host') : (de ? 'Du bist Gast' : 'You are guest')}</div>
      </div>

      <div data-testid="coop-lobby-members" className="mt-3 space-y-2">
        {Array.from({ length: COOP_PLAYER_LIMIT }, (_, index) => {
          const member = members[index];
          return <div key={member?.user_id ?? `empty-${index}`} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/8 bg-black/22 px-3 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-violet-200/14 bg-violet-300/8 text-sm text-violet-100">{member ? (member.role === 'host' ? '♛' : '◆') : '·'}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black text-white/86">{member?.display_name ?? (de ? 'Warte auf Mitspieler…' : 'Waiting for teammate…')}</div><div className="mt-1 text-[6px] font-black uppercase tracking-[.14em] text-white/30">{member ? (member.role === 'host' ? 'HOST' : (de ? 'GAST' : 'GUEST')) : `${members.length}/${COOP_PLAYER_LIMIT}`}</div></div>
            {member && <div className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase tracking-[.11em] ${member.ready ? 'border-emerald-200/18 bg-emerald-300/8 text-emerald-100' : 'border-white/10 bg-white/4 text-white/36'}`}>{member.ready ? (de ? 'BEREIT' : 'READY') : (de ? 'WARTET' : 'WAITING')}</div>}
          </div>;
        })}
      </div>

      <button data-testid="coop-ready-toggle" type="button" disabled={busy} onPointerDown={event => { event.preventDefault(); void runAction(() => setCoopLobbyReady(!(me?.ready ?? lobby.ready))); }} className={`mt-3 w-full rounded-2xl border py-3 text-[9px] font-black uppercase tracking-[.18em] active:scale-[.98] disabled:opacity-40 ${(me?.ready ?? lobby.ready) ? 'border-emerald-200/22 bg-emerald-300/10 text-emerald-50' : 'border-violet-200/22 bg-violet-300/10 text-violet-50'}`}>{(me?.ready ?? lobby.ready) ? (de ? 'NICHT BEREIT' : 'NOT READY') : (de ? 'ICH BIN BEREIT' : 'I AM READY')}</button>

      <div className="mt-3 rounded-2xl border border-sky-200/10 bg-sky-300/[.035] p-3 text-[8px] leading-relaxed text-sky-50/48">
        <div className="font-black uppercase tracking-[.14em] text-sky-100/68">{bothReady ? (de ? 'LOBBY BEREIT' : 'LOBBY READY') : (de ? 'VORBEREITUNG' : 'PREPARATION')}</div>
        <p className="mt-1">{bothReady ? (lobby.role === 'host' ? (de ? 'Beide Spieler sind bereit. Starte den gemeinsamen Run für euch beide.' : 'Both players are ready. Start the shared run for both players.') : (de ? 'Beide Spieler sind bereit. Warte, bis der Host den Run startet.' : 'Both players are ready. Wait for the host to start the run.')) : (de ? 'Beide Spieler müssen anwesend und bereit sein. Die Solo-Balance bleibt dabei vollständig getrennt.' : 'Both players must be present and ready. Solo balance remains completely separate.')}</p>
      </div>

      {lobby.role === 'host' && <button data-testid="coop-start-run" type="button" disabled={busy || !bothReady} onPointerDown={event => { event.preventDefault(); void runAction(startCoopLobby); }} className="mt-3 w-full rounded-2xl border border-cyan-100/28 bg-[linear-gradient(135deg,#26556b,#173348)] py-3 text-[9px] font-black uppercase tracking-[.18em] text-cyan-50 shadow-[0_12px_26px_rgba(10,80,105,.22)] active:scale-[.98] disabled:opacity-30">{busy ? (de ? 'RUN STARTET…' : 'STARTING RUN…') : (de ? 'GEMEINSAMEN RUN STARTEN' : 'START SHARED RUN')}</button>}

      <button data-testid="coop-leave-lobby" type="button" disabled={busy} onPointerDown={event => { event.preventDefault(); void runAction(leaveCoopLobby); }} className="mt-3 w-full rounded-2xl border border-red-300/14 bg-red-400/5 py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-red-100/62 active:scale-[.98] disabled:opacity-40">{lobby.role === 'host' ? (de ? 'LOBBY SCHLIESSEN' : 'CLOSE LOBBY') : (de ? 'LOBBY VERLASSEN' : 'LEAVE LOBBY')}</button>
    </>}

    {error && <div role="alert" className="mt-3 rounded-xl border border-red-300/16 bg-red-400/8 px-3 py-2 text-[8px] leading-relaxed text-red-100/76">{error}</div>}
    {notice && <div className="mt-3 rounded-xl border border-emerald-300/14 bg-emerald-400/6 px-3 py-2 text-[8px] leading-relaxed text-emerald-100/70">{notice}</div>}
  </section>;
}
