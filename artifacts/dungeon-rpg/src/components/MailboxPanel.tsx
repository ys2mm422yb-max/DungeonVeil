import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptGuildInvite,
  currentOnlineSession,
  declineGuildInvite,
  onlineSessionEventName,
} from '../game/supabaseOnline';
import {
  claimPendingGuildInviteLink,
  hasPendingGuildInviteToken,
  listMailboxMessages,
  MAILBOX_EVENT,
  markMailboxActioned,
  markMailboxRead,
  type MailboxMessage,
} from '../game/guildMailboxOnline';

type Props = {
  language: 'de' | 'en';
  onUnreadChange?: (count: number) => void;
};

function formatDate(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function messageIcon(kind: MailboxMessage['kind']): string {
  if (kind === 'guild_invite') return '♜';
  if (kind === 'reward') return '✦';
  if (kind === 'notice') return '!';
  return '✉';
}

export function MailboxPanel({ language, onUnreadChange }: Props) {
  const de = language === 'de';
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [signedIn, setSignedIn] = useState(() => Boolean(currentOnlineSession()));
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const active = Boolean(currentOnlineSession());
    setSignedIn(active);
    if (!active) {
      setMessages([]);
      onUnreadChange?.(hasPendingGuildInviteToken() ? 1 : 0);
      setLoading(false);
      return;
    }

    try {
      const claimed = await claimPendingGuildInviteLink();
      if (claimed) setNotice(de ? `Einladung von [${claimed.guild_tag}] ${claimed.guild_name} liegt jetzt im Postfach.` : `Invitation from [${claimed.guild_tag}] ${claimed.guild_name} is now in your mailbox.`);
      const next = await listMailboxMessages();
      setMessages(next);
      const unreadIds = next.filter(message => !message.read_at).map(message => message.id);
      if (unreadIds.length) await markMailboxRead(unreadIds);
      onUnreadChange?.(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [de, onUnreadChange]);

  useEffect(() => {
    const handleChange = () => { void refresh(); };
    window.addEventListener(MAILBOX_EVENT, handleChange);
    window.addEventListener(onlineSessionEventName(), handleChange);
    void refresh();
    return () => {
      window.removeEventListener(MAILBOX_EVENT, handleChange);
      window.removeEventListener(onlineSessionEventName(), handleChange);
    };
  }, [refresh]);

  const pendingInvites = useMemo(() => messages.filter(message => message.kind === 'guild_invite' && !message.actioned_at), [messages]);

  const answerInvite = async (message: MailboxMessage, accept: boolean) => {
    const inviteId = typeof message.payload.invite_id === 'string' ? message.payload.invite_id : '';
    if (!inviteId) return;
    setBusyId(message.id);
    setError('');
    try {
      if (accept) await acceptGuildInvite(inviteId);
      else await declineGuildInvite(inviteId);
      await markMailboxActioned(message.id);
      setNotice(accept ? (de ? 'Gildeneinladung angenommen.' : 'Guild invitation accepted.') : (de ? 'Gildeneinladung abgelehnt.' : 'Guild invitation declined.'));
      window.dispatchEvent(new Event(onlineSessionEventName()));
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  return <div data-testid="mailbox-panel" className="max-h-[76vh] overflow-y-auto rounded-3xl border border-sky-300/18 bg-[#090d12]/96 p-4 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[8px] font-black uppercase tracking-[.3em] text-sky-200/48">{de ? 'POSTFACH' : 'MAILBOX'}</div>
        <div className="mt-1 text-lg font-black text-sky-100">{de ? 'Nachrichten aus dem Schleier' : 'Messages from the Veil'}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Gildeneinladungen, Belohnungen und wichtige Spielinformationen landen hier.' : 'Guild invitations, rewards and important game information arrive here.'}</div>
      </div>
      {pendingInvites.length > 0 && <div className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[8px] font-black text-sky-100">{pendingInvites.length}</div>}
    </div>

    {(notice || error) && <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || notice}</div>}

    {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
      <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
      <div className="mt-1">{hasPendingGuildInviteToken()
        ? (de ? 'Der Einladungslink wurde gespeichert. Melde dich unter Online & Cloud an und öffne danach das Postfach erneut.' : 'The invitation link was saved. Sign in under Online & Cloud, then open the mailbox again.')
        : (de ? 'Melde dich unter Online & Cloud an, um persönliche Nachrichten zu laden.' : 'Sign in under Online & Cloud to load personal messages.')}</div>
    </div>}

    {signedIn && <div className="mt-4 space-y-2.5">
      {loading && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-center text-[9px] uppercase tracking-[.18em] text-white/34">{de ? 'Postfach wird geladen …' : 'Loading mailbox …'}</div>}
      {!loading && messages.map(message => {
        const actionable = message.kind === 'guild_invite' && !message.actioned_at && typeof message.payload.invite_id === 'string';
        return <article key={message.id} className={`rounded-2xl border p-3 ${message.actioned_at ? 'border-white/7 bg-white/[.018] opacity-62' : 'border-sky-300/13 bg-sky-400/[.035]'}`}>
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-300/14 bg-black/30 text-sm text-sky-100">{messageIcon(message.kind)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-black text-white/86">{message.title}</div>
                <div className="shrink-0 text-[7px] text-white/24">{formatDate(message.created_at, language)}</div>
              </div>
              <div className="mt-1 text-[9px] leading-relaxed text-white/42">{message.body}</div>
              {message.actioned_at && <div className="mt-2 text-[7px] font-black uppercase tracking-[.16em] text-emerald-200/50">{de ? 'ERLEDIGT' : 'COMPLETED'}</div>}
            </div>
          </div>
          {actionable && <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={Boolean(busyId)} onClick={() => void answerInvite(message, false)} className="min-h-10 rounded-xl border border-white/10 bg-black/30 text-[8px] font-black uppercase tracking-[.14em] text-white/48 active:scale-[.98] disabled:opacity-35">{de ? 'Ablehnen' : 'Decline'}</button>
            <button type="button" disabled={Boolean(busyId)} onClick={() => void answerInvite(message, true)} className="min-h-10 rounded-xl border border-emerald-300/25 bg-emerald-500/12 text-[8px] font-black uppercase tracking-[.14em] text-emerald-100 active:scale-[.98] disabled:opacity-35">{busyId === message.id ? '…' : (de ? 'Annehmen' : 'Accept')}</button>
          </div>}
        </article>;
      })}
      {!loading && !messages.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center text-[10px] text-white/38">{de ? 'Dein Postfach ist leer.' : 'Your mailbox is empty.'}</div>}
      <button type="button" disabled={loading} onClick={() => void refresh()} className="w-full rounded-xl border border-white/9 bg-white/[.03] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/42 active:scale-[.98] disabled:opacity-35">{de ? 'Aktualisieren' : 'Refresh'}</button>
    </div>}
  </div>;
}
