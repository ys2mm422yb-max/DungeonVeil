import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelGuildJoinRequestOnline,
  listGuildJoinRequestsOnline,
  requestOrJoinGuildOnline,
  reviewGuildJoinRequestOnline,
  searchGuildsOnline,
  setGuildJoinPolicyOnline,
  type GuildJoinPolicy,
  type GuildJoinRequest,
  type GuildSearchResult,
} from '../game/guildSearchOnline';
import {
  currentOnlineSession,
  getMyGuildMembership,
  onlineSessionEventName,
  type OnlineGuildMembership,
} from '../game/supabaseOnline';
import { SocialIdentityCard } from './SocialIdentityCard';

type Props = {
  language: 'de' | 'en';
};

function policyLabel(policy: GuildJoinPolicy, de: boolean) {
  if (policy === 'open') return de ? 'Offen' : 'Open';
  if (policy === 'request') return de ? 'Anfrage' : 'Request';
  return de ? 'Geschlossen' : 'Closed';
}

function formatDate(value: string, language: 'de' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function GuildAccessOverlay({ language }: Props) {
  const de = language === 'de';
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GuildSearchResult[]>([]);
  const [requests, setRequests] = useState<GuildJoinRequest[]>([]);
  const [joinPolicy, setJoinPolicy] = useState<GuildJoinPolicy>('request');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const signedIn = Boolean(currentOnlineSession());
  const canReview = membership?.role === 'owner' || membership?.role === 'officer';

  const refreshIdentity = useCallback(async () => {
    if (!currentOnlineSession()) {
      setMembership(null);
      setResults([]);
      setRequests([]);
      return;
    }
    const next = await getMyGuildMembership();
    setMembership(next);
    if (next && (next.role === 'owner' || next.role === 'officer')) {
      const incoming = await listGuildJoinRequestsOnline(next.guild.id).catch(() => []);
      setRequests(incoming);
    } else {
      setRequests([]);
    }
  }, []);

  const runSearch = useCallback(async (nextQuery = query) => {
    if (!currentOnlineSession()) return;
    setLoading(true);
    setError('');
    try {
      setResults(await searchGuildsOnline(nextQuery));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const refresh = () => { void refreshIdentity(); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void refreshIdentity();
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, [refreshIdentity]);

  useEffect(() => {
    if (!open || membership || !signedIn) return;
    const timer = window.setTimeout(() => void runSearch(query), 280);
    return () => window.clearTimeout(timer);
  }, [membership, open, query, runSearch, signedIn]);

  const pendingCount = requests.filter(request => request.status === 'pending').length;
  const triggerLabel = membership
    ? de ? `BEITRITTSANFRAGEN${pendingCount ? ` · ${pendingCount}` : ''}` : `JOIN REQUESTS${pendingCount ? ` · ${pendingCount}` : ''}`
    : de ? 'GILDEN SUCHEN' : 'SEARCH GUILDS';

  const updateResult = (guildId: string, patch: Partial<GuildSearchResult>) => {
    setResults(current => current.map(result => result.guild_id === guildId ? { ...result, ...patch } : result));
  };

  const joinOrRequest = async (guild: GuildSearchResult) => {
    setBusyId(guild.guild_id);
    setError('');
    setMessage('');
    try {
      const result = await requestOrJoinGuildOnline(guild.guild_id);
      if (result.action === 'joined') {
        setMessage(de ? `Du bist [${guild.tag}] ${guild.name} beigetreten.` : `You joined [${guild.tag}] ${guild.name}.`);
        await refreshIdentity();
        window.dispatchEvent(new Event(onlineSessionEventName()));
        window.setTimeout(() => setOpen(false), 650);
      } else {
        updateResult(guild.guild_id, { request_status: 'pending' });
        setMessage(de ? `Beitrittsanfrage an [${guild.tag}] ${guild.name} gesendet.` : `Join request sent to [${guild.tag}] ${guild.name}.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const cancelRequest = async (guild: GuildSearchResult) => {
    setBusyId(guild.guild_id);
    setError('');
    try {
      await cancelGuildJoinRequestOnline(guild.guild_id);
      updateResult(guild.guild_id, { request_status: 'withdrawn' });
      setMessage(de ? 'Beitrittsanfrage zurückgezogen.' : 'Join request withdrawn.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const reviewRequest = async (request: GuildJoinRequest, accept: boolean) => {
    if (!membership) return;
    setBusyId(request.request_id);
    setError('');
    try {
      await reviewGuildJoinRequestOnline(request.request_id, accept);
      setRequests(await listGuildJoinRequestsOnline(membership.guild.id));
      setMessage(accept
        ? de ? `${request.display_name} wurde aufgenommen.` : `${request.display_name} joined the guild.`
        : de ? `Anfrage von ${request.display_name} abgelehnt.` : `Request from ${request.display_name} declined.`);
      window.dispatchEvent(new Event(onlineSessionEventName()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const savePolicy = async (policy: GuildJoinPolicy) => {
    if (!membership) return;
    setBusyId('policy');
    setError('');
    try {
      const saved = await setGuildJoinPolicyOnline(membership.guild.id, policy);
      setJoinPolicy(saved);
      setMessage(de ? `Beitritt steht jetzt auf „${policyLabel(saved, true)}“.` : `Joining is now set to “${policyLabel(saved, false)}”.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId('');
    }
  };

  const visibleResults = useMemo(() => results.filter(result => result.member_count <= result.max_members), [results]);
  if (!signedIn || (membership && !canReview)) return null;

  return <>
    <button
      data-testid={membership ? 'guild-join-requests-open' : 'guild-search-open'}
      type="button"
      onClick={() => { setOpen(true); setMessage(''); setError(''); }}
      className="absolute bottom-3 right-3 z-40 min-h-9 rounded-xl border border-amber-300/30 bg-[#171006]/95 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-amber-100 shadow-xl active:scale-[.97]"
    >{triggerLabel}</button>

    {open && <div data-testid="guild-access-overlay" className="absolute inset-0 z-[80] flex flex-col overflow-hidden rounded-3xl border border-amber-300/24 bg-[#0c0a08]/[.985] p-3 text-white shadow-2xl">
      <header className="relative shrink-0 border-b border-white/8 pb-3 pr-12">
        <button type="button" aria-label={de ? 'Schließen' : 'Close'} onClick={() => setOpen(false)} className="absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/45 text-lg text-white/70">×</button>
        <div className="text-[7px] font-black uppercase tracking-[.26em] text-amber-200/48">{membership ? (de ? 'BEITRITTSANFRAGEN' : 'JOIN REQUESTS') : (de ? 'GILDENSUCHE' : 'GUILD SEARCH')}</div>
        <div className="mt-1 text-[15px] font-black text-amber-100">{membership ? `[${membership.guild.tag}] ${membership.guild.name}` : (de ? 'Finde deine Gilde' : 'Find your guild')}</div>
      </header>

      {(message || error) && <div className={`mt-2 shrink-0 rounded-xl border px-3 py-2 text-[9px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

      {!membership ? <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-3">
        <div className="sticky top-0 z-10 flex gap-2 bg-[#0c0a08] pb-3">
          <input data-testid="guild-search-input" value={query} maxLength={40} onChange={event => setQuery(event.target.value)} placeholder={de ? 'Name oder Kürzel suchen' : 'Search name or tag'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/55 px-3 py-2.5 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-amber-300/35" />
          <button type="button" onClick={() => void runSearch(query)} disabled={loading} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-3 text-[8px] font-black text-amber-100 disabled:opacity-35">{de ? 'SUCHEN' : 'SEARCH'}</button>
        </div>

        <div className="space-y-2">
          {visibleResults.map(guild => {
            const full = guild.member_count >= guild.max_members;
            const pending = guild.request_status === 'pending';
            const closed = guild.join_policy === 'closed';
            return <article key={guild.guild_id} data-testid="guild-search-result" className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-black text-white/85">[{guild.tag}] {guild.name}</div>
                  <div className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-amber-100/45">{guild.member_count}/{guild.max_members} {de ? 'Mitglieder' : 'members'} · {policyLabel(guild.join_policy, de)}</div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[6px] font-black uppercase ${guild.join_policy === 'open' ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : guild.join_policy === 'request' ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border-white/10 bg-white/[.04] text-white/35'}`}>{policyLabel(guild.join_policy, de)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-[9px] leading-relaxed text-white/40">{guild.description || (de ? 'Keine Beschreibung vorhanden.' : 'No description available.')}</p>
              <div className="mt-3">
                {pending ? <button type="button" onClick={() => void cancelRequest(guild)} disabled={busyId === guild.guild_id} className="w-full rounded-xl border border-red-300/18 bg-red-500/[.07] px-3 py-2.5 text-[8px] font-black uppercase text-red-100 disabled:opacity-35">{de ? 'ANFRAGE ZURÜCKZIEHEN' : 'WITHDRAW REQUEST'}</button>
                  : <button type="button" onClick={() => void joinOrRequest(guild)} disabled={closed || full || Boolean(busyId)} className="w-full rounded-xl border border-amber-300/25 bg-amber-500/12 px-3 py-2.5 text-[8px] font-black uppercase text-amber-100 disabled:opacity-30">{full ? (de ? 'GILDE VOLL' : 'GUILD FULL') : closed ? (de ? 'BEITRITT GESCHLOSSEN' : 'JOINING CLOSED') : guild.join_policy === 'open' ? (de ? 'DIREKT BEITRETEN' : 'JOIN NOW') : (de ? 'BEITRITT ANFRAGEN' : 'REQUEST TO JOIN')}</button>}
              </div>
            </article>;
          })}
          {!loading && !visibleResults.length && <div data-testid="guild-search-empty" className="rounded-2xl border border-white/8 bg-white/[.025] px-4 py-8 text-center text-[9px] leading-relaxed text-white/35">{de ? 'Keine passende Gilde gefunden. Ändere den Suchbegriff oder gründe deine eigene Gilde.' : 'No matching guild found. Change the search or create your own guild.'}</div>}
          {loading && <div className="py-8 text-center text-[8px] font-black uppercase tracking-[.16em] text-white/30">{de ? 'GILDEN WERDEN GELADEN …' : 'LOADING GUILDS …'}</div>}
        </div>
      </div> : <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-3">
        <section data-testid="guild-join-policy" className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
          <div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'BEITRITTSREGEL' : 'JOIN POLICY'}</div>
          <div className="mt-2 grid grid-cols-3 gap-2">{(['open', 'request', 'closed'] as GuildJoinPolicy[]).map(policy => <button key={policy} type="button" onClick={() => void savePolicy(policy)} disabled={busyId === 'policy'} className={`rounded-xl border px-2 py-2.5 text-[7px] font-black uppercase ${joinPolicy === policy ? 'border-amber-300/35 bg-amber-500/15 text-amber-100' : 'border-white/8 bg-black/30 text-white/42'}`}>{policyLabel(policy, de)}</button>)}</div>
          <p className="mt-2 text-[8px] leading-relaxed text-white/32">{de ? 'Offen nimmt Spieler sofort auf. Anfrage benötigt eine Bestätigung. Geschlossen verhindert neue Beitritte.' : 'Open joins immediately. Request needs approval. Closed blocks new joins.'}</p>
        </section>

        <section className="mt-3 space-y-2">
          <div className="px-1 text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? `${requests.length} OFFENE ANFRAGEN` : `${requests.length} OPEN REQUESTS`}</div>
          {requests.map(request => <article key={request.request_id} data-testid="guild-join-request" className="rounded-2xl border border-white/8 bg-white/[.025] p-2.5">
            <SocialIdentityCard displayName={request.display_name} avatarKey={request.avatar_key} language={language} detail={`${de ? 'Angefragt' : 'Requested'} · ${formatDate(request.created_at, language)}`} compact />
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/7 pt-2">
              <button type="button" onClick={() => void reviewRequest(request, false)} disabled={Boolean(busyId)} className="rounded-xl border border-red-300/18 bg-red-500/[.07] px-2 py-2 text-[7px] font-black uppercase text-red-100 disabled:opacity-35">{de ? 'ABLEHNEN' : 'DECLINE'}</button>
              <button type="button" onClick={() => void reviewRequest(request, true)} disabled={Boolean(busyId)} className="rounded-xl border border-emerald-300/20 bg-emerald-500/[.09] px-2 py-2 text-[7px] font-black uppercase text-emerald-100 disabled:opacity-35">{de ? 'AUFNEHMEN' : 'ACCEPT'}</button>
            </div>
          </article>)}
          {!requests.length && <div className="rounded-2xl border border-white/8 bg-white/[.025] px-4 py-8 text-center text-[9px] text-white/35">{de ? 'Keine offenen Beitrittsanfragen.' : 'No open join requests.'}</div>}
        </section>
      </div>}
    </div>}
  </>;
}
