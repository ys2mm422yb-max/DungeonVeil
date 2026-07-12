import React, { useCallback, useEffect, useState } from 'react';
import {
  acceptGuildInvite,
  currentOnlineSession,
  declineGuildInvite,
  getMyGuildMembership,
  listMyGuildInvites,
  onlineSessionEventName,
  type OnlineGuildInvite,
  type OnlineGuildMembership,
  type OnlineSession,
} from '../game/supabaseOnline';

type Props = {
  language: 'de' | 'en';
};

function ActionButton({ label, onClick, disabled = false, primary = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`min-h-10 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${primary ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/[.04] text-white/62'} ${disabled ? 'pointer-events-none opacity-35' : ''}`}
  >{label}</button>;
}

export function GuildPanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [invites, setInvites] = useState<OnlineGuildInvite[]>([]);
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
      setInvites([]);
      return;
    }
    const [nextMembership, nextInvites] = await Promise.all([
      getMyGuildMembership(),
      listMyGuildInvites(),
    ]);
    setMembership(nextMembership);
    setInvites(nextInvites);
  }, []);

  useEffect(() => {
    const refresh = () => { void run(refreshGuildData); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void run(refreshGuildData);
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, [refreshGuildData, run]);

  const answerInvite = (inviteId: string, accept: boolean) => run(async () => {
    if (accept) await acceptGuildInvite(inviteId);
    else await declineGuildInvite(inviteId);
    await refreshGuildData();
    setMessage(accept ? (de ? 'Einladung angenommen.' : 'Invite accepted.') : (de ? 'Einladung abgelehnt.' : 'Invite declined.'));
  });

  return <div className="max-h-[72vh] overflow-y-auto rounded-3xl border border-amber-300/18 bg-[#0d0b08]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.3em] text-amber-200/48">{de ? 'GILDE' : 'GUILD'}</div>
      <div className="mt-1 text-lg font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Noch gesperrt' : 'Locked')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Gilden werden später im Spiel gegen Gold freigeschaltet.' : 'Guilds unlock later in the game for gold.'}</div>
    </div>

    {(message || error) && <div className={`mb-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session && <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42">{de ? 'Melde dich zuerst unter Online & Cloud an. Bestehende Mitgliedschaften und Einladungen werden danach hier geladen.' : 'Sign in through Online & Cloud first. Existing memberships and invitations will then load here.'}</div>}

    {session && <div className="space-y-3">
      {membership ? <section className="rounded-2xl border border-amber-300/18 bg-amber-400/[.06] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/34">{de ? 'MITGLIEDSCHAFT' : 'MEMBERSHIP'}</div>
        <div className="mt-2 text-sm font-black text-amber-100">[{membership.guild.tag}] {membership.guild.name}</div>
        <div className="mt-1 text-[9px] uppercase tracking-[.14em] text-white/38">{membership.role}</div>
        {membership.guild.description && <div className="mt-2 text-[10px] leading-relaxed text-white/42">{membership.guild.description}</div>}
      </section> : <section className="rounded-2xl border border-amber-300/14 bg-amber-400/[.04] p-3">
        <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/75">{de ? 'Noch gesperrt' : 'Locked'}</div>
        <div className="mt-1 text-[10px] leading-relaxed text-white/40">{de ? 'Hier kann keine kostenlose Gilde gegründet werden. Die Freischaltung erfolgt später gegen Gold.' : 'A free guild cannot be created here. Guild access will unlock later for gold.'}</div>
      </section>}

      {invites.length > 0 && <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'EINLADUNGEN' : 'INVITATIONS'}</div>
        {invites.map(invite => <div key={invite.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 p-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold">[{invite.guild.tag}] {invite.guild.name}</div>
            <div className="text-[8px] text-white/30">{de ? 'Gildeneinladung' : 'Guild invitation'}</div>
          </div>
          <ActionButton label="✓" onClick={() => answerInvite(invite.id, true)} disabled={busy} primary />
          <ActionButton label="×" onClick={() => answerInvite(invite.id, false)} disabled={busy} />
        </div>)}
      </section>}

      <ActionButton label={busy ? (de ? 'Lädt …' : 'Loading …') : (de ? 'Aktualisieren' : 'Refresh')} onClick={() => run(refreshGuildData)} disabled={busy} />
    </div>}
  </div>;
}
