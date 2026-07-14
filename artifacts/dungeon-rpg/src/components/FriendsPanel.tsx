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

type Props = { language: 'de' | 'en'; onOpenOnline: () => void };
type Tab = 'friends' | 'requests' | 'add';

const FAVORITES_KEY = 'dungeon-veil-favorite-friends-v1';
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

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

function isOnline(value: string): boolean {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time <= ONLINE_WINDOW_MS;
}

function formatLastSeen(value: string, de: boolean): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return de ? 'zuletzt unbekannt' : 'last seen unknown';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 5) return de ? 'jetzt online' : 'online now';
  if (minutes < 60) return de ? `vor ${minutes} Min.` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return de ? `vor ${hours} Std.` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return de ? `vor ${days} Tag${days === 1 ? '' : 'en'}` : `${days}d ago`;
}

function loadFavorites(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

export function FriendsPanel({ language, onOpenOnline }: Props) {
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
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

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
  const sortedFriends = useMemo(() => [...friends].sort((left, right) => {
    const favoriteDelta = Number(favorites.has(right.user_id)) - Number(favorites.has(left.user_id));
    if (favoriteDelta) return favoriteDelta;
    const onlineDelta = Number(isOnline(right.last_active_at)) - Number(isOnline(left.last_active_at));
    if (onlineDelta) return onlineDelta;
    return left.display_name.localeCompare(right.display_name);
  }), [favorites, friends]);
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

  const toggleFavorite = (friendId: string) => {
    setFavorites(current => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
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
        <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Finde Spieler über Profilnamen oder Freundescode, sehe ihren Status und markiere wichtige Gefährten als Favoriten.' : 'Find players by profile name or friend code, see their status and favorite important companions.'}</div>
      </div>

      {(message || error) && <div className={`mt-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

      {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
        <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
        <div className="mt-1">{de ? 'Melde dich an, um Freunde zu suchen und Anfragen zu beantworten.' : 'Sign in to find friends and answer requests.'}</div>
        <button type="button" onClick={onOpenOnline} className="mt-3 w-full rounded-xl border border-violet-300/25 bg-violet-500/12 py-2.5 text-[8px] font-black uppercase tracking-[.15em] text-violet-100 active:scale-[.98]">{de ? 'ZU ONLINE & CLOUD' : 'OPEN ONLINE & CLOUD'}</button>
      </div>}

      {signedIn && <>
        {myProfile && <section className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-300/14 bg-cyan-400/[.045] p-3">
          <button type="button" onClick={() => setSelectedProfileId(myProfile.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/18 bg-black/20 text-[10px] font-black text-cyan-100 active:scale-[.96]">{initials(myProfile.display_name)}</button>
          <button type="button" onClick={() => setSelectedProfileId(myProfile.id)} className="min-w-0 flex-1 text-left active:opacity-70">
            <div className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">{de ? 'DEIN PROFIL & FREUNDESCODE' : 'YOUR PROFILE & FRIEND CODE'}</div>
            <div className="mt-1 text-[13px] font-black tracking-[.16em] text-cyan-50">{myProfile.friend_code}</div>
          </button>
          <button type="button" onClick={() => void copyFriendCode()} className="rounded-xl border border-cyan-300/18 bg-cyan-400/[.06] px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{copied ? (de ? 'Kopiert' : 'Copied') : (de ? 'Kopieren' : 'Copy')}</button>
        </section>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {tabButton('friends', de ? 'Freunde' : 'Friends')}
          {tabButton('requests', de ? 'Anfragen' : 'Requests', incoming.length)}
          {tabButton('add', de ? 'Hinzufügen' : 'Add')}
        </div>

        {loading && <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-center text-[9px] uppercase tracking-[.18em] text-white/34">{de ? 'Freunde werden geladen …' : 'Loading friends …'}</div>}

        {!loading && tab === 'friends' && <section className="mt-3 space-y-2">
          {sortedFriends.map(friend => {
            const online = isOnline(friend.last_active_at);
            const favorite = favorites.has(friend.user_id);
            return <article key={friend.user_id} className={`rounded-2xl border p-3 ${favorite ? 'border-amber-300/16 bg-amber-400/[.035]' : 'border-cyan-300/10 bg-cyan-400/[.025]'}`}>
              <div className="flex items-center gap-3">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/18 bg-cyan-400/8 text-[11px] font-black text-cyan-100">{initials(friend.display_name)}<span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#081014] ${online ? 'bg-emerald-400' : 'bg-white/25'}`} /></div>
                <button type="button" onClick={() => setSelectedProfileId(friend.user_id)} className="min-w-0 flex-1 text-left active:opacity-70">
                  <div className="flex items-center gap-2"><div className="truncate text-[12px] font-black text-white/86">{friend.display_name}</div><span className={`text-[7px] font-black uppercase ${online ? 'text-emerald-200/72' : 'text-white/28'}`}>{formatLastSeen(friend.last_active_at, de)}</span></div>
                  <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-white/28">{friend.friend_code} · {de ? 'Rang' : 'Rank'} {friend.current_rank} · {de ? 'Kapitel' : 'Chapter'} {friend.current_chapter}</div>
                </button>
                <button type="button" aria-label={de ? 'Favorit umschalten' : 'Toggle favorite'} onClick={() => toggleFavorite(friend.user_id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm active:scale-[.94] ${favorite ? 'border-amber-300/25 bg-amber-400/10 text-amber-200' : 'border-white/8 bg-black/20 text-white/24'}`}>{favorite ? '★' : '☆'}</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSelectedProfileId(friend.user_id)} className="min-h-9 rounded-xl border border-cyan-300/14 bg-cyan-400/[.045] text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{de ? 'Profil' : 'Profile'}</button>
                {canInviteToGuild ? <button type="button" disabled={Boolean(busyId)} onClick={() => inviteFriendToGuild(friend)} className="min-h-9 rounded-xl border border-amber-300/18 bg-amber-400/[.05] text-[8px] font-black uppercase tracking-[.12em] text-amber-100 active:scale-[.98] disabled:opacity-35">{busyId === `guild-${friend.user_id}` ? '…' : (de ? 'In Gilde einladen' : 'Invite to guild')}</button> : <button type="button" disabled={Boolean(busyId)} onClick={() => removeFriend(friend)} className="min-h-9 rounded-xl border border-red-400/14 bg-red-500/[.045] text-[8px] font-black uppercase tracking-[.12em] text-red-200/70 active:scale-[.98] disabled:opacity-35">{de ? 'Entfernen' : 'Remove'}</button>}
              </div>
              {canInviteToGuild && <button type="button" disabled={Boolean(busyId)} onClick={() => removeFriend(friend)} className="mt-2 w-full rounded-lg py-1.5 text-[7px] font-black uppercase tracking-[.12em] text-red-200/34 active:text-red-200">{de ? 'Freund entfernen' : 'Remove friend'}</button>}
              <div className="mt-1 text-center text-[7px] uppercase tracking-[.12em] text-white/20">{de ? 'Freunde seit' : 'Friends since'} {formatSince(friend.friends_since, language)}</div>
            </article>;
          })}
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
