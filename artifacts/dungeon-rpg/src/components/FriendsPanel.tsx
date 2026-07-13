import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  currentOnlineSession,
  getMyGuildMembership,
  inviteGuildMember,
  onlineSessionEventName,
  type OnlineGuildMembership,
} from '../game/supabaseOnline';
import {
  acceptFriendRequestOnline,
  cancelFriendRequestOnline,
  declineFriendRequestOnline,
  FRIENDS_EVENT,
  listFriendRequestsOnline,
  listFriendsOnline,
  removeFriendOnline,
  sendFriendRequestOnline,
  type OnlineFriend,
  type OnlineFriendRequest,
} from '../game/friendOnline';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en' };
type Tab = 'friends' | 'requests' | 'add';

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function formatSince(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(date);
}

export function FriendsPanel({ language }: Props) {
  const de = language === 'de';
  const [signedIn, setSignedIn] = useState(() => Boolean(currentOnlineSession()));
  const [friends, setFriends] = useState<OnlineFriend[]>([]);
  const [requests, setRequests] = useState<OnlineFriendRequest[]>([]);
  const [myProfile, setMyProfile] = useState<SocialProfile | null>(null);
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [tab, setTab] = useState<Tab>('friends');
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const active = Boolean(currentOnlineSession());
    setSignedIn(active);
    setLoading(true);
    setError('');
    if (!active) {
      setFriends([]);
      setRequests([]);
      setMyProfile(null);
      setMembership(null);
      setLoading(false);
      return;
    }
    try {
      const [nextFriends, nextRequests, profile, guild] = await Promise.all([
        listFriendsOnline(),
        listFriendRequestsOnline(),
        getMySocialProfile(),
        getMyGuildMembership(),
      ]);
      setFriends(nextFriends);
      setRequests(nextRequests);
      setMyProfile(profile);
      setMembership(guild);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleChange = () => { void refresh(); };
    window.addEventListener(FRIENDS_EVENT, handleChange);
    window.addEventListener(onlineSessionEventName(), handleChange);
    void refresh();
    return () => {
      window.removeEventListener(FRIENDS_EVENT, handleChange);
      window.removeEventListener(onlineSessionEventName(), handleChange);
    };
  }, [refresh]);

  const incoming = useMemo(() => requests.filter(request => request.direction === 'incoming'), [requests]);
  const outgoing = useMemo(() => requests.filter(request => request.direction === 'outgoing'), [requests]);
  const canInviteToGuild = membership?.role === 'owner' || membership?.role === 'officer';

  const run = async (id: string, task: () => Promise<void>, success: string) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      await task();
      setMessage(success);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const sendRequest = async () => {
    setBusyId('send');
    setError('');
    setMessage('');
    try {
      const result = await sendFriendRequestOnline(searchName);
      setSearchName('');
      setTab('requests');
      setMessage(de ? `Anfrage an ${result.display_name} gesendet.` : `Request sent to ${result.display_name}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const copyFriendCode = async () => {
    if (!myProfile?.friend_code) return;
    await navigator.clipboard?.writeText(myProfile.friend_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const removeFriend = (friend: OnlineFriend) => {
    const confirmed = window.confirm(de
      ? `${friend.display_name} wirklich aus deiner Freundesliste entfernen?`
      : `Remove ${friend.display_name} from your friends list?`);
    if (!confirmed) return;
    void run(friend.user_id, () => removeFriendOnline(friend.user_id), de ? 'Freund entfernt.' : 'Friend removed.');
  };

  const inviteFriendToGuild = (friend: OnlineFriend) => {
    if (!membership || !canInviteToGuild) return;
    void run(`guild-${friend.user_id}`, () => inviteGuildMember(membership.guild.id, friend.user_id), de
      ? `Gildeneinladung an ${friend.display_name} gesendet.`
      : `Guild invitation sent to ${friend.display_name}.`);
  };

  const tabButton = (key: Tab, label: string, badge = 0) => <button
    type="button"
    onClick={() => setTab(key)}
    className={`relative min-h-10 rounded-xl border px-3 text-[8px] font-black uppercase tracking-[.14em] active:scale-[.98] ${tab === key ? 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100' : 'border-white/8 bg-black/25 text-white/38'}`}
  >
    {label}
    {badge > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-cyan-300 px-1 py-0.5 text-[7px] text-black">{Math.min(99, badge)}</span>}
  </button>;

  return <>
    <div data-testid="friends-panel" className="max-h-[76vh] overflow-y-auto rounded-3xl border border-cyan-300/18 bg-[#081014]/96 p-4 text-white shadow-2xl">
      <div>
        <div className="text-[8px] font-black uppercase tracking-[.3em] text-cyan-200/48">{de ? 'FREUNDE' : 'FRIENDS'}</div>
        <div className="mt-1 text-lg font-black text-cyan-100">{de ? 'Gefährten im Schleier' : 'Companions in the Veil'}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Finde Spieler über Profilnamen oder Freundescode und öffne ihre Profilkarte.' : 'Find players by profile name or friend code and open their profile card.'}</div>
      </div>

      {(message || error) && <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

      {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
        <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
        <div className="mt-1">{de ? 'Melde dich unter Online & Cloud an, um Freunde zu suchen und Anfragen zu beantworten.' : 'Sign in under Online & Cloud to find friends and answer requests.'}</div>
      </div>}

      {signedIn && <>
        {myProfile && <section className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-300/14 bg-cyan-400/[.045] p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/18 bg-black/20 text-[10px] font-black text-cyan-100">{initials(myProfile.display_name)}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">{de ? 'DEIN FREUNDESCODE' : 'YOUR FRIEND CODE'}</div>
            <div className="mt-1 text-[13px] font-black tracking-[.16em] text-cyan-50">{myProfile.friend_code}</div>
          </div>
          <button type="button" onClick={() => void copyFriendCode()} className="rounded-xl border border-cyan-300/18 bg-cyan-400/[.06] px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{copied ? (de ? 'Kopiert' : 'Copied') : (de ? 'Kopieren' : 'Copy')}</button>
        </section>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {tabButton('friends', de ? 'Freunde' : 'Friends')}
          {tabButton('requests', de ? 'Anfragen' : 'Requests', incoming.length)}
          {tabButton('add', de ? 'Hinzufügen' : 'Add')}
        </div>

        {loading && <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-center text-[9px] uppercase tracking-[.18em] text-white/34">{de ? 'Freunde werden geladen …' : 'Loading friends …'}</div>}

        {!loading && tab === 'friends' && <section className="mt-3 space-y-2">
          {friends.map(friend => <article key={friend.user_id} className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/18 bg-cyan-400/8 text-[11px] font-black text-cyan-100">{initials(friend.display_name)}</div>
              <button type="button" onClick={() => setSelectedProfileId(friend.user_id)} className="min-w-0 flex-1 text-left active:opacity-70">
                <div className="truncate text-[12px] font-black text-white/86">{friend.display_name}</div>
                <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-white/28">{friend.friend_code} · {de ? 'Rang' : 'Rank'} {friend.current_rank} · {de ? 'Kapitel' : 'Chapter'} {friend.current_chapter}</div>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelectedProfileId(friend.user_id)} className="min-h-9 rounded-xl border border-cyan-300/14 bg-cyan-400/[.045] text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{de ? 'Profil' : 'Profile'}</button>
              {canInviteToGuild ? <button type="button" disabled={Boolean(busyId)} onClick={() => inviteFriendToGuild(friend)} className="min-h-9 rounded-xl border border-amber-300/18 bg-amber-400/[.05] text-[8px] font-black uppercase tracking-[.12em] text-amber-100 active:scale-[.98] disabled:opacity-35">{busyId === `guild-${friend.user_id}` ? '…' : (de ? 'In Gilde einladen' : 'Invite to guild')}</button> : <button type="button" disabled={Boolean(busyId)} onClick={() => removeFriend(friend)} className="min-h-9 rounded-xl border border-red-400/14 bg-red-500/[.045] text-[8px] font-black uppercase tracking-[.12em] text-red-200/70 active:scale-[.98] disabled:opacity-35">{de ? 'Entfernen' : 'Remove'}</button>}
            </div>
            {canInviteToGuild && <button type="button" disabled={Boolean(busyId)} onClick={() => removeFriend(friend)} className="mt-2 w-full rounded-lg py-1.5 text-[7px] font-black uppercase tracking-[.12em] text-red-200/34 active:text-red-200">{de ? 'Freund entfernen' : 'Remove friend'}</button>}
            <div className="mt-1 text-center text-[7px] uppercase tracking-[.12em] text-white/20">{de ? 'Freunde seit' : 'Friends since'} {formatSince(friend.friends_since, language)}</div>
          </article>)}
          {!friends.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center text-[10px] text-white/38">{de ? 'Noch keine Freunde. Suche im Tab „Hinzufügen“ nach einem Namen oder Code.' : 'No friends yet. Search by name or code in the Add tab.'}</div>}
        </section>}

        {!loading && tab === 'requests' && <section className="mt-3 space-y-3">
          <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'EINGEHEND' : 'INCOMING'}</div>
          {incoming.map(request => <article key={request.request_id} className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[.03] p-3">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emerald-300/16 bg-emerald-400/8 text-[10px] font-black text-emerald-100">{initials(request.display_name)}</div><div className="min-w-0 flex-1 truncate text-[11px] font-black text-white/84">{request.display_name}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={Boolean(busyId)} onClick={() => void run(request.request_id, () => declineFriendRequestOnline(request.request_id), de ? 'Anfrage abgelehnt.' : 'Request declined.')} className="min-h-10 rounded-xl border border-white/10 bg-black/30 text-[8px] font-black uppercase tracking-[.14em] text-white/48 active:scale-[.98] disabled:opacity-35">{de ? 'Ablehnen' : 'Decline'}</button>
              <button type="button" disabled={Boolean(busyId)} onClick={() => void run(request.request_id, async () => { await acceptFriendRequestOnline(request.request_id); }, de ? 'Freund hinzugefügt.' : 'Friend added.')} className="min-h-10 rounded-xl border border-emerald-300/25 bg-emerald-500/12 text-[8px] font-black uppercase tracking-[.14em] text-emerald-100 active:scale-[.98] disabled:opacity-35">{busyId === request.request_id ? '…' : (de ? 'Annehmen' : 'Accept')}</button>
            </div>
          </article>)}
          {!incoming.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[9px] text-white/34">{de ? 'Keine offenen eingehenden Anfragen.' : 'No pending incoming requests.'}</div>}

          <div className="pt-1 text-[8px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'GESENDET' : 'SENT'}</div>
          {outgoing.map(request => <article key={request.request_id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/25 text-[10px] font-black text-white/58">{initials(request.display_name)}</div><div className="min-w-0 flex-1 truncate text-[11px] font-black text-white/70">{request.display_name}</div><button type="button" disabled={Boolean(busyId)} onClick={() => void run(request.request_id, () => cancelFriendRequestOnline(request.request_id), de ? 'Anfrage zurückgezogen.' : 'Request cancelled.')} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-white/42 active:scale-[.98] disabled:opacity-35">{de ? 'Zurückziehen' : 'Cancel'}</button></article>)}
          {!outgoing.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-[9px] text-white/34">{de ? 'Keine offenen gesendeten Anfragen.' : 'No pending sent requests.'}</div>}
        </section>}

        {!loading && tab === 'add' && <section className="mt-3 space-y-3 rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3">
          <div><div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'SPIELER SUCHEN' : 'FIND PLAYER'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/34">{de ? 'Gib den exakten Profilnamen oder einen Code wie DV-A1B2C3 ein.' : 'Enter the exact profile name or a code such as DV-A1B2C3.'}</div></div>
          <input value={searchName} maxLength={24} onChange={event => setSearchName(event.target.value)} placeholder={de ? 'Spielername oder Freundescode' : 'Player name or friend code'} className="w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/24 focus:border-cyan-300/35" />
          <button type="button" disabled={busyId === 'send' || searchName.trim().length < 2} onClick={() => void sendRequest()} className="w-full rounded-xl border border-cyan-300/24 bg-cyan-400/10 py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-cyan-100 active:scale-[.98] disabled:opacity-35">{busyId === 'send' ? (de ? 'WIRD GESENDET …' : 'SENDING …') : (de ? 'ANFRAGE SENDEN' : 'SEND REQUEST')}</button>
        </section>}

        <button type="button" disabled={loading} onClick={() => void refresh()} className="mt-3 w-full rounded-xl border border-white/9 bg-white/[.03] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/42 active:scale-[.98] disabled:opacity-35">{de ? 'Aktualisieren' : 'Refresh'}</button>
      </>}
    </div>
    {selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </>;
}
