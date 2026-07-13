import React, { useEffect, useState } from 'react';
import { currentOnlineSession, getMyGuildMembership, onlineSessionEventName, type OnlineGuildMembership } from '../game/supabaseOnline';
import { createGuildInviteLinkOnline, makeGuildInviteUrl } from '../game/guildMailboxOnline';

type Props = { language: 'de' | 'en' };

export function GuildInviteLinkCard({ language }: Props) {
  const de = language === 'de';
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      if (!currentOnlineSession()) {
        if (!disposed) setMembership(null);
        return;
      }
      try {
        const next = await getMyGuildMembership();
        if (!disposed) setMembership(next);
      } catch {
        if (!disposed) setMembership(null);
      }
    };
    const handleSession = () => { void refresh(); };
    window.addEventListener(onlineSessionEventName(), handleSession);
    void refresh();
    return () => {
      disposed = true;
      window.removeEventListener(onlineSessionEventName(), handleSession);
    };
  }, []);

  const canInvite = membership?.role === 'owner' || membership?.role === 'officer';
  if (!canInvite || !membership) return null;

  const createAndShare = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await createGuildInviteLinkOnline(membership.guild.id);
      const url = makeGuildInviteUrl(result.token);
      const shareData = {
        title: `[${membership.guild.tag}] ${membership.guild.name}`,
        text: de ? `Tritt meiner Gilde ${membership.guild.name} in Dungeon Veil bei.` : `Join my guild ${membership.guild.name} in Dungeon Veil.`,
        url,
      };
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage(de ? 'Einladungslink geteilt. Er ist 7 Tage gültig.' : 'Invitation link shared. It is valid for 7 days.');
      } else {
        await navigator.clipboard.writeText(url);
        setMessage(de ? 'Einladungslink kopiert. Er ist 7 Tage gültig.' : 'Invitation link copied. It is valid for 7 days.');
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return <section data-testid="guild-invite-link-card" className="rounded-2xl border border-sky-300/18 bg-[linear-gradient(135deg,rgba(20,48,65,.88),rgba(9,16,24,.94))] p-3 text-white shadow-xl">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/18 bg-sky-400/8 text-lg text-sky-100">↗</div>
      <div className="min-w-0 flex-1">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-sky-200/52">{de ? 'EINLADUNG PER LINK' : 'INVITE BY LINK'}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/42">{de ? 'Teile einen sicheren Link. Nach der Anmeldung landet die Einladung automatisch im Postfach.' : 'Share a secure link. After sign-in, the invitation automatically arrives in the mailbox.'}</div>
      </div>
    </div>
    {(message || error) && <div className={`mt-2 rounded-xl border px-3 py-2 text-[9px] ${error ? 'border-red-400/20 bg-red-500/10 text-red-200' : 'border-emerald-400/18 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}
    <button type="button" disabled={busy} onClick={() => void createAndShare()} className="mt-3 w-full rounded-xl border border-sky-300/24 bg-sky-400/10 py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-sky-100 active:scale-[.98] disabled:opacity-35">{busy ? (de ? 'WIRD ERSTELLT …' : 'CREATING …') : (de ? 'LINK TEILEN' : 'SHARE LINK')}</button>
  </section>;
}
