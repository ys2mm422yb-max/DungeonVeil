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

type MailboxQaState = {
  signedIn: boolean;
  messages: MailboxMessage[];
};

type Props = {
  language: 'de' | 'en';
  onUnreadChange?: (count: number) => void;
  qaState?: MailboxQaState;
};
type MailFilter = 'all' | 'requests' | 'rewards' | 'system';

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

function isCoopInvite(message: MailboxMessage): boolean {
  return message.kind === 'notice'
    && message.payload.kind === 'coop_invite'
    && typeof message.payload.invite_code === 'string';
}

function isPendingAction(message: MailboxMessage): boolean {
  if (message.actioned_at) return false;
  return message.kind === 'guild_invite'
    || message.kind === 'friend_request'
    || message.kind === 'reward'
    || isCoopInvite(message);
}

function canDeleteMessage(message: MailboxMessage): boolean {
  return !isPendingAction(message);
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

export function MailboxPanel({ language, onUnreadChange, qaState }: Props) {
  const de = language === 'de';
  const [messages, setMessages] = useState<MailboxMessage[]>(() => qaState?.messages ?? []);
  const [signedIn, setSignedIn] = useState(() => qaState?.signedIn ?? Boolean(currentOnlineSession()));
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(!qaState);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<MailFilter>('all');

  const updateUnread = useCallback((next: MailboxMessage[]) => {
    onUnreadChange?.(next.filter(message => !message.read_at).length);
  }, [onUnreadChange]);

  const refresh = useCallback(async () => {
    if (qaState) {
      const next = qaState.messages.map(message => ({ ...message, payload: { ...message.payload } }));
      setSignedIn(qaState.signedIn);
      setMessages(next);
      updateUnread(next);
      setLoading(false);
      return;
    }

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
      if (claimed) {
        setNotice(de
          ? `Einladung von [${claimed.guild_tag}] ${claimed.guild_name} liegt jetzt im Postfach.`
          : `Invitation from [${claimed.guild_tag}] ${claimed.guild_name} is now in your mailbox.`);
      }
      await prepareRecentWorldBossRewards();
      const next = await listMailboxMessages();
      setMessages(next);
      updateUnread(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [de, onUnreadChange, qaState, updateUnread]);

  useEffect(() => {
    if (qaState) {
      void refresh();
      return;
    }
    const handleChange = () => { void refresh(); };
    window.addEventListener(MAILBOX_EVENT, handleChange);
    window.addEventListener(onlineSessionEventName(), handleChange);
    void refresh();
    return () => {
      window.removeEventListener(MAILBOX_EVENT, handleChange);
      window.removeEventListener(onlineSessionEventName(), handleChange);
    };
  }, [qaState, refresh]);

  const pendingActions = useMemo(() => messages.filter(isPendingAction), [messages]);
  const unreadMessages = useMemo(() => messages.filter(message => !message.read_at), [messages]);
  const rewardMessages = useMemo(() => messages.filter(message => message.kind === 'reward' && !message.actioned_at && typeof message.payload.event_id === 'string'), [messages]);
  const deletableMessages = useMemo(() => messages.filter(canDeleteMessage), [messages]);
  const filteredMessages = useMemo(() => messages.filter(message => matchesFilter(message, filter)), [filter, messages]);

  const markAllRead = async () => {
    if (!unreadMessages.length) return;
    setBusyId('read-all');
    setError('');
    try {
      if (!qaState) await markMailboxRead(unreadMessages.map(message => message.id));
      const now = new Date().toISOString();
      const next = messages.map(message => ({ ...message, read_at: message.read_at ?? now }));
      setMessages(next);
      updateUnread(next);
      setNotice(de ? 'Alle Nachrichten wurden als gelesen markiert.' : 'All messages were marked as read.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const deleteMessages = async (ids: string[], bulk = false) => {
    const deletableIds = messages.filter(message => ids.includes(message.id) && canDeleteMessage(message)).map(message => message.id);
    if (!deletableIds.length) return;
    if (!qaState && !window.confirm(bulk
      ? (de ? `${deletableIds.length} erledigte Nachrichten wirklich löschen?` : `Delete ${deletableIds.length} completed messages?`)
      : (de ? 'Diese Nachricht wirklich löschen?' : 'Delete this message?'))) return;

    setBusyId(bulk ? 'delete-all' : `delete-${deletableIds[0]}`);
    setError('');
    try {
      const deleted = qaState ? deletableIds.length : await deleteMailboxMessages(deletableIds);
      if (deleted <= 0) throw new Error(de ? 'Die Nachricht konnte nicht gelöscht werden.' : 'The message could not be deleted.');
      const deletedSet = new Set(deletableIds);
      const next = messages.filter(message => !deletedSet.has(message.id));
      setMessages(next);
      updateUnread(next);
      setNotice(de
        ? `${deleted} ${deleted === 1 ? 'Nachricht wurde' : 'Nachrichten wurden'} gelöscht.`
        : `${deleted} ${deleted === 1 ? 'message was' : 'messages were'} deleted.`);
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
      if (!qaState) {
        if (accept) await acceptGuildInvite(inviteId);
        else await declineGuildInvite(inviteId);
        await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
        window.dispatchEvent(new Event(onlineSessionEventName()));
        await refresh();
      } else {
        const now = new Date().toISOString();
        setMessages(current => current.map(entry => entry.id === message.id ? { ...entry, actioned_at: now, read_at: now } : entry));
      }
      setNotice(accept ? (de ? 'Gildeneinladung angenommen.' : 'Guild invitation accepted.') : (de ? 'Gildeneinladung abgelehnt.' : 'Guild invitation declined.'));
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
      if (!qaState) {
        if (accept) await acceptFriendRequestOnline(requestId);
        else await declineFriendRequestOnline(requestId);
        await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
        await refresh();
      } else {
        const now = new Date().toISOString();
        setMessages(current => current.map(entry => entry.id === message.id ? { ...entry, actioned_at: now, read_at: now } : entry));
      }
      setNotice(accept ? (de ? 'Freundschaftsanfrage angenommen.' : 'Friend request accepted.') : (de ? 'Freundschaftsanfrage abgelehnt.' : 'Friend request declined.'));
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
      if (!qaState) {
        if (accept) await joinCoopLobby(inviteCode);
        await Promise.all([markMailboxActioned(message.id), markMailboxRead([message.id])]);
        await refresh();
        if (accept) openCoopLobbyPanel();
      } else {
        const now = new Date().toISOString();
        setMessages(current => current.map(entry => entry.id === message.id ? { ...entry, actioned_at: now, read_at: now } : entry));
      }
      if (!accept) setNotice(de ? 'Duo-Einladung abgelehnt.' : 'Duo invitation declined.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const claimRewardMessage = async (message: MailboxMessage) => {
    if (qaState) {
      return { applied: true, xp: Number(message.payload.xp ?? 0), dust: Number(message.payload.dust ?? 0), gold: Number(message.payload.gold ?? 0), rankBefore: 14, rankAfter: 14, relicUnlocked: false };
    }
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
      if (qaState) {
        const now = new Date().toISOString();
        setMessages(current => current.map(entry => entry.id === message.id ? { ...entry, actioned_at: now, read_at: now } : entry));
      } else await refresh();
      const relicText = applied.relicUnlocked ? (de ? ' · Neues Relikt: Weltenkern!' : ' · New relic: World Core!') : '';
      setNotice(applied.applied
        ? de
          ? `Belohnung abgeholt: ${applied.xp} Rang-XP, ${applied.dust} Schleierstaub und ${applied.gold} Gold${applied.rankAfter > applied.rankBefore ? ` · Rang ${applied.rankAfter}!` : ''}${relicText}`
          : `Reward claimed: ${applied.xp} rank XP, ${applied.dust} Veil Dust and ${applied.gold} gold${applied.rankAfter > applied.rankBefore ? ` · Rank ${applied.rankAfter}!` : ''}${relicText}`
        : de ? 'Diese Belohnung wurde bereits deinem Spielstand gutgeschrieben.' : 'This reward was already added to your save.');
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
      if (qaState) {
        const now = new Date().toISOString();
        const ids = new Set(rewardMessages.map(message => message.id));
        setMessages(current => current.map(entry => ids.has(entry.id) ? { ...entry, actioned_at: now, read_at: now } : entry));
      } else await refresh();
      setNotice(de
        ? `${appliedCount} Belohnungen eingesammelt: ${xp} Rang-XP · ${dust} Schleierstaub · ${gold} Gold.${relicUnlocked ? ' · Neues Relikt: Weltenkern!' : ''}`
        : `${appliedCount} rewards claimed: ${xp} rank XP · ${dust} Veil Dust · ${gold} gold.${relicUnlocked ? ' · New relic: World Core!' : ''}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const filterButton = (key: MailFilter, label: string) => <button
    type="button"
    onClick={() => setFilter(key)}
    className={`min-h-9 rounded-xl border px-2 text-[7px] font-black uppercase tracking-[.1em] active:scale-[.98] ${filter === key ? 'border-sky-300/28 bg-sky-400/10 text-sky-100' : 'border-white/7 bg-black/20 text-white/30'}`}
  >{label}</button>;

  return <div data-testid="mailbox-panel" className="max-h-[78dvh] overflow-y-auto rounded-3xl border border-sky-300/18 bg-[#090d12]/96 p-4 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[8px] font-black uppercase tracking-[.3em] text-sky-200/48">{de ? 'POSTFACH' : 'MAILBOX'}</div>
        <div className="mt-1 text-lg font-black text-sky-100">{de ? 'Nachrichten aus dem Schleier' : 'Messages from the Veil'}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Anfragen, Duo-Einladungen, Wochenbelohnungen und wichtige Spielinformationen landen hier.' : 'Requests, Duo invitations, weekly rewards and important game information arrive here.'}</div>
      </div>
      {pendingActions.length > 0 && <div className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[8px] font-black text-sky-100">{pendingActions.length}</div>}
    </div>

    {(notice || error) && <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || notice}</div>}

    {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
      <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
      <div className="mt-1">{hasPendingGuildInviteToken()
        ? (de ? 'Der Einladungslink wurde gespeichert. Melde dich unter Online & Cloud an und öffne danach das Postfach erneut.' : 'The invitation link was saved. Sign in under Online & Cloud, then open the mailbox again.')
        : (de ? 'Melde dich unter Online & Cloud an, um persönliche Nachrichten zu laden.' : 'Sign in under Online & Cloud to load personal messages.')}</div>
    </div>}

    {signedIn && <div className="mt-4 space-y-2.5">
      <div className="grid grid-cols-4 gap-1.5">{filterButton('all', de ? 'Alle' : 'All')}{filterButton('requests', de ? 'Anfragen' : 'Requests')}{filterButton('rewards', de ? 'Beute' : 'Rewards')}{filterButton('system', 'Info')}</div>
      {(rewardMessages.length > 0 || unreadMessages.length > 0 || deletableMessages.length > 0) && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" disabled={!rewardMessages.length || Boolean(busyId)} onClick={() => void claimAllRewards()} className="min-h-10 rounded-xl border border-amber-300/20 bg-amber-500/8 px-2 text-[7px] font-black uppercase tracking-[.11em] text-amber-100 active:scale-[.98] disabled:opacity-30">{busyId === 'claim-all' ? '…' : (de ? `Alles einsammeln (${rewardMessages.length})` : `Claim all (${rewardMessages.length})`)}</button>
        <button type="button" disabled={!unreadMessages.length || Boolean(busyId)} onClick={() => void markAllRead()} className="min-h-10 rounded-xl border border-sky-300/16 bg-sky-400/[.045] px-2 text-[7px] font-black uppercase tracking-[.11em] text-sky-100 active:scale-[.98] disabled:opacity-30">{busyId === 'read-all' ? '…' : (de ? `Alles gelesen (${unreadMessages.length})` : `Mark read (${unreadMessages.length})`)}</button>
        <button data-testid="mailbox-delete-completed" type="button" disabled={!deletableMessages.length || Boolean(busyId)} onClick={() => void deleteMessages(deletableMessages.map(message => message.id), true)} className="col-span-2 min-h-10 rounded-xl border border-red-300/16 bg-red-400/[.045] px-2 text-[7px] font-black uppercase tracking-[.11em] text-red-100 active:scale-[.98] disabled:opacity-30 sm:col-span-1">{busyId === 'delete-all' ? '…' : (de ? `Aufräumen (${deletableMessages.length})` : `Clean up (${deletableMessages.length})`)}</button>
      </div>}

      {loading && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4 text-center text-[9px] uppercase tracking-[.18em] text-white/34">{de ? 'Postfach wird geladen …' : 'Loading mailbox …'}</div>}
      {!loading && filteredMessages.map(message => {
        const coopActionable = isCoopInvite(message) && !message.actioned_at;
        const guildActionable = message.kind === 'guild_invite' && !message.actioned_at && typeof message.payload.invite_id === 'string';
        const friendActionable = message.kind === 'friend_request' && !message.actioned_at && typeof message.payload.request_id === 'string';
        const rewardActionable = message.kind === 'reward' && !message.actioned_at && typeof message.payload.event_id === 'string';
        const requestActionable = coopActionable || guildActionable || friendActionable;
        const deletable = canDeleteMessage(message);
        return <article key={message.id} data-testid="mailbox-message-card" className={`rounded-2xl border p-3 ${message.actioned_at ? 'border-white/7 bg-white/[.018] opacity-72' : coopActionable ? 'border-violet-300/20 bg-violet-400/[.055]' : message.kind === 'reward' ? 'border-amber-300/16 bg-amber-400/[.045]' : !message.read_at ? 'border-sky-200/22 bg-sky-400/[.06]' : 'border-sky-300/13 bg-sky-400/[.035]'}`}>
          <div className="flex items-start gap-3">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-300/14 bg-black/30 text-sm text-sky-100">{messageIcon(message)}{!message.read_at && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-300" />}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-black text-white/86">{message.title}</div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="text-[7px] text-white/24">{formatDate(message.created_at, language)}</div>
                  <button
                    data-testid={`mailbox-delete-${message.id}`}
                    type="button"
                    disabled={!deletable || Boolean(busyId)}
                    aria-label={deletable ? (de ? 'Nachricht löschen' : 'Delete message') : (de ? 'Zuerst bearbeiten' : 'Complete first')}
                    title={deletable ? (de ? 'Nachricht löschen' : 'Delete message') : (de ? 'Einladung beantworten oder Belohnung einsammeln' : 'Answer the invite or claim the reward')}
                    onClick={() => void deleteMessages([message.id])}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-red-300/12 bg-red-400/[.04] text-[12px] text-red-100/55 active:scale-90 disabled:border-white/6 disabled:bg-black/15 disabled:text-white/14"
                  >{busyId === `delete-${message.id}` ? '…' : '×'}</button>
                </div>
              </div>
              <div className="mt-1 text-[9px] leading-relaxed text-white/42">{message.body}</div>
              {coopActionable && <div className="mt-2 font-mono text-[10px] font-black tracking-[.18em] text-violet-100">{String(message.payload.invite_code)}</div>}
              {message.kind === 'reward' && <div className="mt-2 text-[8px] font-black text-amber-100/66">{Number(message.payload.xp ?? 0)} XP · {Number(message.payload.dust ?? 0)} {de ? 'Staub' : 'dust'} · {Number(message.payload.gold ?? 0)} Gold</div>}
              {message.actioned_at && <div className="mt-2 text-[7px] font-black uppercase tracking-[.16em] text-emerald-200/50">{de ? 'ERLEDIGT' : 'COMPLETED'}</div>}
              {!deletable && <div className="mt-2 text-[6px] font-black uppercase tracking-[.12em] text-white/22">{de ? 'Vor dem Löschen zuerst bearbeiten' : 'Complete before deleting'}</div>}
            </div>
          </div>
          {requestActionable && <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={Boolean(busyId)} onClick={() => void (coopActionable ? answerCoopInvite(message, false) : guildActionable ? answerGuildInvite(message, false) : answerFriendRequest(message, false))} className="min-h-10 rounded-xl border border-white/10 bg-black/30 text-[8px] font-black uppercase tracking-[.14em] text-white/48 active:scale-[.98] disabled:opacity-35">{de ? 'Ablehnen' : 'Decline'}</button>
            <button type="button" disabled={Boolean(busyId)} onClick={() => void (coopActionable ? answerCoopInvite(message, true) : guildActionable ? answerGuildInvite(message, true) : answerFriendRequest(message, true))} className="min-h-10 rounded-xl border border-emerald-300/25 bg-emerald-500/12 text-[8px] font-black uppercase tracking-[.14em] text-emerald-100 active:scale-[.98] disabled:opacity-35">{busyId === message.id ? '…' : coopActionable ? (de ? 'Beitreten' : 'Join') : (de ? 'Annehmen' : 'Accept')}</button>
          </div>}
          {rewardActionable && <button type="button" disabled={Boolean(busyId)} onClick={() => void claimReward(message)} className="mt-3 min-h-10 w-full rounded-xl border border-amber-300/28 bg-amber-500/12 text-[8px] font-black uppercase tracking-[.16em] text-amber-100 active:scale-[.98] disabled:opacity-35">{busyId === message.id ? (de ? 'WIRD GUTGESCHRIEBEN …' : 'APPLYING …') : (de ? 'BELOHNUNG ABHOLEN' : 'CLAIM REWARD')}</button>}
        </article>;
      })}
      {!loading && !filteredMessages.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center text-[10px] text-white/38">{de ? 'In diesem Bereich liegen keine Nachrichten.' : 'There are no messages in this section.'}</div>}
      <button type="button" disabled={loading} onClick={() => void refresh()} className="w-full rounded-xl border border-white/9 bg-white/[.03] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/42 active:scale-[.98] disabled:opacity-35">{de ? 'Aktualisieren' : 'Refresh'}</button>
    </div>}
  </div>;
}
