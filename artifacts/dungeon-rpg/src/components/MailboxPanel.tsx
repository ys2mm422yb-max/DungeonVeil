import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptGuildInvite,
  currentOnlineSession,
  declineGuildInvite,
  onlineSessionEventName,
} from '../game/supabaseOnline';
import {
  acceptFriendRequestOnline,
  declineFriendRequestOnline,
} from '../game/friendOnline';
import {
  acceptFriendRequestOnline as _unusedFriendRequestTypeAnchor,
} from '../game/friendOnline';
import {
  claimPendingGuildInviteLink,
  deleteMailboxMessages,
  hasPendingGuildInviteToken,
  listMailboxMessages,
  MAILBOX_EVENT,
  markMailboxActioned,
  markMailboxRead,
  type MailboxMessage,
} from '../game/guildMailboxOnline';
import { joinCoopLobby, openCoopLobbyPanel } from '../game/coopLobbyOnline';
import { claimWorldBossReward, prepareRecentWorldBossRewards } from '../game/socialProgressOnline';
import { applyWorldBossRewardLocally } from '../game/worldBossRewardLocal';

void _unusedFriendRequestTypeAnchor;

type Props = { language: 'de' | 'en'; onUnreadChange?: (count: number) => void; onOpenOnline?: () => void };
type MailFilter = 'all' | 'requests' | 'rewards' | 'system';

function formatDate(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function isCoopInvite(message: MailboxMessage): boolean {
  return message.kind === 'notice'
    && message.payload.kind === 'coop_invite'
    && typeof message.payload.invite_code === 'string';
}

function messageIcon(message: MailboxMessage): string {
  if (isCoopInvite(message)) return '⚔';
  if (message.kind === 'guild_invite') return '♜';
  if (message.kind === 'friend_request') return '♡';
  if (message.kind === 'reward') return '✦';
  if (message.kind === 'notice') return '!';
  return '✉';
}

function matchesFilter(message: MailboxMessage, filter: MailFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'requests') return message.kind === 'guild_invite' || message.kind === 'friend_request' || isCoopInvite(message);
  if (filter === 'rewards') return message.kind === 'reward';
  return (message.kind === 'system' || message.kind === 'notice') && !isCoopInvite(message);
}

function messageCanBeDeleted(message: MailboxMessage): boolean {
  if (message.actioned_at) return true;
  return Boolean(message.read_at && (message.kind === 'system' || message.kind === 'notice') && !isCoopInvite(message));
}

export function MailboxPanel({ language, onUnreadChange, onOpenOnline }: Props) {
  const de = language === 'de';
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [signedIn, setSignedIn] = useState(() => Boolean(currentOnlineSession()));
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<MailFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

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
      await prepareRecentWorldBossRewards();
      const next = await listMailboxMessages();
      setMessages(next);
      onUnreadChange?.(next.filter(message => !message.read_at).length);
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

  const pendingActions = useMemo(() => messages.filter(message => (message.kind === 'guild_invite' || message.kind === 'friend_request' || message.kind === 'reward' || isCoopInvite(message)) && !message.actioned_at), [messages]);
  const unreadMessages = useMemo(() => messages.filter(message => !message.read_at), [messages]);
  const rewardMessages = useMemo(() => messages.filter(message => message.kind === 'reward' && !message.actioned_at && typeof message.payload.event_id === 'string'), [messages]);
  const deletableMessages = useMemo(() => messages.filter(messageCanBeDeleted), [messages]);
  const filteredMessages = useMemo(() => messages.filter(message => matchesFilter(message, filter)), [filter, messages]);

  const updateUnread = (next: MailboxMessage[]) => onUnreadChange?.(next.filter(message => !message.read_at).length);

  const markAllRead = async () => {
    if (!unreadMessages.length) return;
    setBusyId('read-all');
    setError('');
    try {
      await markMailboxRead(unreadMessages.map(message => message.id));
      const next = messages.map(message => ({ ...message, read_at: message.read_at ?? new Date().toISOString() }));
      setMessages(next);
      updateUnread(next);
      setNotice(de ? 'Alle Nachrichten wurden als gelesen markiert.' : 'All messages were marked as read.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const removeMessages = async (ids: string[], bulk = false) => {
    if (!ids.length) return;
    const operationId = bulk ? 'delete-completed' : `delete-${ids[0]}`;
    setBusyId(operationId);
    setError('');
    try {
      const deleted = await deleteMailboxMessages(ids);
      if (deleted < 1) throw new Error(de ? 'Diese Nachricht kann erst nach Abschluss der Aktion gelöscht werden.' : 'This message can only be deleted after its action is completed.');
      const removed = new Set(ids);
      const next = messages.filter(message => !removed.has(message.id));
      setMessages(next);
      updateUnread(next);
      setConfirmDeleteId('');
      setNotice(bulk
        ? (de ? `${deleted} erledigte Nachrichten gelöscht.` : `${deleted} completed messages deleted.`)
        : (de ? 'Nachricht gelöscht.' : 'Message deleted.'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const answerGuildInvite = async (message: MailboxMessage, accept: boolean) => {
    const inviteId = typeof message.payload.invite_id === 'string' ? message.payload.invite_id : '';
    if (!inviteId) return;
    setBusyId(message.id);
    setError('');
    try {
      if (accept) await acceptGuildInvite(inviteId);
      else await declineGuildInvite(inviteId);
      await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
      setNotice(accept ? (de ? 'Gildeneinladung angenommen.' : 'Guild invitation accepted.') : (de ? 'Gildeneinladung abgelehnt.' : 'Guild invitation declined.'));
      window.dispatchEvent(new Event(onlineSessionEventName()));
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const answerFriendRequest = async (message: MailboxMessage, accept: boolean) => {
    const requestId = typeof message.payload.request_id === 'string' ? message.payload.request_id : '';
    if (!requestId) return;
    setBusyId(message.id);
    setError('');
    try {
      if (accept) await acceptFriendRequestOnline(requestId);
      else await declineFriendRequestOnline(requestId);
      await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
      setNotice(accept ? (de ? 'Freundschaftsanfrage angenommen.' : 'Friend request accepted.') : (de ? 'Freundschaftsanfrage abgelehnt.' : 'Friend request declined.'));
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const answerCoopInvite = async (message: MailboxMessage, accept: boolean) => {
    const inviteCode = typeof message.payload.invite_code === 'string' ? message.payload.invite_code : '';
    if (!inviteCode) return;
    setBusyId(message.id);
    setError('');
    try {
      if (accept) await joinCoopLobby(inviteCode);
      await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
      if (accept) {
        await refresh();
        openCoopLobbyPanel();
      } else {
        setNotice(de ? 'Duo-Einladung abgelehnt.' : 'Duo invitation declined.');
        await refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const claimRewardMessage = async (message: MailboxMessage) => {
    const eventId = typeof message.payload.event_id === 'string' ? message.payload.event_id : '';
    if (!eventId) throw new Error(de ? 'Die Belohnungsnachricht enthält kein gültiges Event.' : 'The reward message has no valid event.');
    const reward = await claimWorldBossReward(eventId);
    const applied = applyWorldBossRewardLocally(eventId, reward);
    await Promise.all([markMailboxActioned(message.id).catch(() => {}), markMailboxRead([message.id]).catch(() => {})]);
    return applied;
  };

  const claimReward = async (message: MailboxMessage) => {
    setBusyId(message.id);
    setError('');
    try {
      const applied = await claimRewardMessage(message);
      const relicText = applied.relicUnlocked ? (de ? ' · Neues Relikt: Weltenkern!' : ' · New relic: World Core!') : '';
      setNotice(applied.applied
        ? de
          ? `Belohnung abgeholt: ${applied.xp} Rang-XP, ${applied.dust} Schleierstaub und ${applied.gold} Gold${applied.rankAfter > applied.rankBefore ? ` · Rang ${applied.rankAfter}!` : ''}${relicText}`
          : `Reward claimed: ${applied.xp} rank XP, ${applied.dust} Veil Dust and ${applied.gold} gold${applied.rankAfter > applied.rankBefore ? ` · Rank ${applied.rankAfter}!` : ''}${relicText}`
        : de ? 'Diese Belohnung wurde bereits deinem Spielstand gutgeschrieben.' : 'This reward was already added to your save.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const claimAllRewards = async () => {
    if (!rewardMessages.length) return;
    setBusyId('claim-all');
    setError('');
    let xp = 0;
    let dust = 0;
    let gold = 0;
    let appliedCount = 0;
    let relicUnlocked = false;
    try {
      for (const message of rewardMessages) {
        const applied = await claimRewardMessage(message);
        if (applied.applied) {
          appliedCount += 1;
          xp += applied.xp;
          dust += applied.dust;
          gold += applied.gold;
          relicUnlocked = relicUnlocked || applied.relicUnlocked;
        }
      }
      setNotice(de
        ? `${appliedCount} Belohnungen eingesammelt: ${xp} Rang-XP · ${dust} Schleierstaub · ${gold} Gold.${relicUnlocked ? ' · Neues Relikt: Weltenkern!' : ''}`
        : `${appliedCount} rewards claimed: ${xp} rank XP · ${dust} Veil Dust · ${gold} gold.${relicUnlocked ? ' · New relic: World Core!' : ''}`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const filterButton = (key: MailFilter, label: string) => <button type="button" onClick={() => setFilter(key)} className={`min-h-9 rounded-xl border px-2 text-[7px] font-black uppercase tracking-[.1em] active:scale-[.98] ${filter === key ? 'border-sky-300/28 bg-sky-400/10 text-sky-100' : 'border-white/7 bg-black/20 text-white/30'}`}>{label}</button>;

  return <div data-testid="mailbox-panel" className="max-h-[76vh] overflow-y-auto rounded-3xl border border-sky-300/18 bg-[#090d12]/96 p-4 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.3em] text-sky-200/48">{de ? 'POSTFACH' : 'MAILBOX'}</div><div className="mt-1 text-lg font-black text-sky-100">{de ? 'Nachrichten aus dem Schleier' : 'Messages from the Veil'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Anfragen, Duo-Einladungen, Wochenbelohnungen und wichtige Spielinformationen landen hier.' : 'Requests, Duo invitations, weekly rewards and important game information arrive here.'}</div></div>{pendingActions.length > 0 && <div className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[8px] font-black text-sky-100">{pendingActions.length}</div>}</div>

    {(notice || error) && <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || notice}</div>}

    {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46"><div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div><div className="mt-1">{hasPendingGuildInviteToken() ? (de ? 'Der Einladungslink wurde gespeichert. Melde dich unter Online & Cloud an und öffne danach das Postfach erneut.' : 'The invitation link was saved. Sign in under Online & Cloud, then open the mailbox again.') : (de ? 'Melde dich unter Online & Cloud an, um persönliche Nachrichten zu laden.' : 'Sign in under Online & Cloud to load personal messages.')}</div>{onOpenOnline && <button type="button" onClick={onOpenOnline} className="mt-3 w-full rounded-xl border border-violet-300/22 bg-violet-500/10 py-2.5 text-[8px] font-black uppercase tracking-[.14em] text-violet-100 active:scale-[.99]">{de ? 'ONLINE & CLOUD ÖFFNEN' : 'OPEN ONLINE & CLOUD'}</button>}</div>}

    {signedIn && <div className="mt-4 space-y-2.5">
      <div className="grid grid-cols-4 gap-1.5">{filterButton('all', de ? 'Alle' : 'All')}{filterButton('requests', de ? 'Anfragen' : 'Requests')}{filterButton('rewards', de ? 'Beute' : 'Rewards')}{filterButton('system', de ? 'Info' : 'Info')}</div>
      {(rewardMessages.length > 0 || unreadMessages.length > 0) && <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!rewardMessages.length || Boolean(busyId)} onClick={() => void claimAllRewards()} className="min-h-10 rounded-xl border border-amber-300/20 bg-amber-500/8 px-2 text-[7px] font-black uppercase tracking-[.11em] text-amber-100 active:scale-[.98] disabled:opacity-30">{busyId === 'claim-all' ? '…' : (de ? `Alles einsammeln (${rewardMessages.length})` : `Claim all (${rewardMessages.length})`)}</button>
        <button type="button" disabled={!unreadMessages.length || Boolean(busyId)} onClick={() => void markAllRead()} className="min-h-10 rounded-xl border border-sky-300/16 bg-sky-400/[.045] px-2 text-[7px] font-black uppercase tracking-[.11em] text-sky-100 active:scale-[.98] disabled:opacity-30">{busyId === 'read-all' ? '…' : (de ? `Alles gelesen (${unreadMessages.length})` : `Mark read (${unreadMessages.length})`)}</button>
      </div>}
      {deletableMessages.length > 0 && (confirmDeleteId === 'cleanup' ? <div className="grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(busyId)} onClick={() => setConfirmDeleteId('')} className="min-h-10 rounded-xl border border-white/10 bg-black/25 text-[7px] font-black uppercase tracking-[.12em] text-white/45">{de ? 'ABBRECHEN' : 'CANCEL'}</button><button data-testid="mailbox-delete-completed-confirm" type="button" disabled={Boolean(busyId)} onClick={() => void removeMessages(deletableMessages.map(message => message.id), true)} className="min-h-10 rounded-xl border border-red-300/22 bg-red-500/10 text-[7px] font-black uppercase tracking-[.12em] text-red-100">{busyId === 'delete-completed' ? '…' : (de ? `${deletableMessages.length} ENDGÜLTIG LÖSCHEN` : `DELETE ${deletableMessages.length}`)}</button></div> : <button data-testid="mailbox-delete-completed" type="button" disabled={Boolean(busyId)} onClick={() => setConfirmDeleteId('cleanup')} className="min-h-10 w-full rounded-xl border border-red-300/14 bg-red-500/[.045] text-[7px] font-black uppercase tracking-[.13em] text-red-100/68 active:scale-[.99]">{de ? `ERLEDIGTE NACHRICHTEN LÖSCHEN (${deletableMessages.length})` : `DELETE COMPLETED (${deletableMessages.length})`}</button>)}

      {loading && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-center text-[9px] uppercase tracking-[.18em] text-white/34">{de ? 'Postfach wird geladen …' : 'Loading mailbox …'}</div>}
      {!loading && filteredMessages.map(message => {
        const coopActionable = isCoopInvite(message) && !message.actioned_at;
        const guildActionable = message.kind === 'guild_invite' && !message.actioned_at && typeof message.payload.invite_id === 'string';
        const friendActionable = message.kind === 'friend_request' && !message.actioned_at && typeof message.payload.request_id === 'string';
        const rewardActionable = message.kind === 'reward' && !message.actioned_at && typeof message.payload.event_id === 'string';
        const requestActionable = coopActionable || guildActionable || friendActionable;
        const deletable = messageCanBeDeleted(message);
        const confirmingDelete = confirmDeleteId === message.id;
        return <article key={message.id} className={`rounded-2xl border p-3 ${message.actioned_at ? 'border-white/7 bg-white/[.018] opacity-62' : coopActionable ? 'border-violet-300/20 bg-violet-400/[.055]' : message.kind === 'reward' ? 'border-amber-300/16 bg-amber-400/[.045]' : !message.read_at ? 'border-sky-200/22 bg-sky-400/[.06]' : 'border-sky-300/13 bg-sky-400/[.035]'}`}>
          <div className="flex items-start gap-3"><div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-300/14 bg-black/30 text-sm text-sky-100">{messageIcon(message)}{!message.read_at && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-300" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="text-[11px] font-black text-white/86">{message.title}</div><div className="shrink-0 text-[7px] text-white/24">{formatDate(message.created_at, language)}</div></div><div className="mt-1 text-[9px] leading-relaxed text-white/42">{message.body}</div>{coopActionable && <div className="mt-2 font-mono text-[10px] font-black tracking-[.18em] text-violet-100">{String(message.payload.invite_code)}</div>}{message.kind === 'reward' && <div className="mt-2 text-[8px] font-black text-amber-100/66">{Number(message.payload.xp ?? 0)} XP · {Number(message.payload.dust ?? 0)} {de ? 'Staub' : 'dust'} · {Number(message.payload.gold ?? 0)} Gold</div>}{message.actioned_at && <div className="mt-2 text-[7px] font-black uppercase tracking-[.16em] text-emerald-200/50">{de ? 'ERLEDIGT' : 'COMPLETED'}</div>}</div></div>
          {requestActionable && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(busyId)} onClick={() => void (coopActionable ? answerCoopInvite(message, false) : guildActionable ? answerGuildInvite(message, false) : answerFriendRequest(message, false))} className="min-h-10 rounded-xl border border-white/10 bg-black/30 text-[8px] font-black uppercase tracking-[.14em] text-white/48 active:scale-[.98] disabled:opacity-35">{de ? 'Ablehnen' : 'Decline'}</button><button type="button" disabled={Boolean(busyId)} onClick={() => void (coopActionable ? answerCoopInvite(message, true) : guildActionable ? answerGuildInvite(message, true) : answerFriendRequest(message, true))} className="min-h-10 rounded-xl border border-emerald-300/25 bg-emerald-500/12 text-[8px] font-black uppercase tracking-[.14em] text-emerald-100 active:scale-[.98] disabled:opacity-35">{busyId === message.id ? '…' : coopActionable ? (de ? 'Beitreten' : 'Join') : (de ? 'Annehmen' : 'Accept')}</button></div>}
          {rewardActionable && <button type="button" disabled={Boolean(busyId)} onClick={() => void claimReward(message)} className="mt-3 min-h-10 w-full rounded-xl border border-amber-300/28 bg-amber-500/12 text-[8px] font-black uppercase tracking-[.16em] text-amber-100 active:scale-[.98] disabled:opacity-35">{busyId === message.id ? (de ? 'WIRD GUTGESCHRIEBEN …' : 'APPLYING …') : (de ? 'BELOHNUNG ABHOLEN' : 'CLAIM REWARD')}</button>}
          {deletable && (confirmingDelete ? <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={Boolean(busyId)} onClick={() => setConfirmDeleteId('')} className="min-h-9 rounded-xl border border-white/9 bg-black/24 text-[7px] font-black uppercase tracking-[.12em] text-white/42">{de ? 'ABBRECHEN' : 'CANCEL'}</button><button data-testid="mailbox-delete-message-confirm" type="button" disabled={Boolean(busyId)} onClick={() => void removeMessages([message.id])} className="min-h-9 rounded-xl border border-red-300/22 bg-red-500/10 text-[7px] font-black uppercase tracking-[.12em] text-red-100">{busyId === `delete-${message.id}` ? '…' : (de ? 'ENDGÜLTIG LÖSCHEN' : 'DELETE')}</button></div> : <button data-testid="mailbox-delete-message" type="button" disabled={Boolean(busyId)} onClick={() => setConfirmDeleteId(message.id)} className="mt-3 min-h-9 w-full rounded-xl border border-red-300/12 bg-red-500/[.035] text-[7px] font-black uppercase tracking-[.13em] text-red-100/58 active:scale-[.99]">{de ? 'NACHRICHT LÖSCHEN' : 'DELETE MESSAGE'}</button>)}
        </article>;
      })}
      {!loading && !filteredMessages.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center text-[10px] text-white/38">{de ? 'In diesem Bereich liegen keine Nachrichten.' : 'There are no messages in this section.'}</div>}
      <button type="button" disabled={loading} onClick={() => void refresh()} className="w-full rounded-xl border border-white/9 bg-white/[.03] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/42 active:scale-[.98] disabled:opacity-35">{de ? 'Aktualisieren' : 'Refresh'}</button>
    </div>}
  </div>;
}
