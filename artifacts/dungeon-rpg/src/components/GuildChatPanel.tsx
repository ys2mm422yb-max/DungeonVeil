import React, { useCallback, useEffect, useRef, useState } from 'react';
import { currentOnlineSession } from '../game/supabaseOnline';
import { listGuildChatMessages, sendGuildChatMessage, type OnlineGuildChatMessage } from '../game/guildChatOnline';

function formatTime(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function GuildChatPanel({ guildId, language }: { guildId: string; language: 'de' | 'en' }) {
  const de = language === 'de';
  const ownUserId = currentOnlineSession()?.user.id ?? '';
  const [messages, setMessages] = useState<OnlineGuildChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mountedRef = useRef(true);
  const stayAtBottomRef = useRef(true);
  const forceBottomRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const next = await listGuildChatMessages(guildId, 50);
      if (!mountedRef.current) return;
      setMessages(next);
      setError('');
    } catch {
      if (mountedRef.current) setError(de ? 'Der Gildenchat konnte nicht geladen werden.' : 'The guild chat could not be loaded.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [de, guildId]);

  useEffect(() => {
    setLoading(true);
    forceBottomRef.current = true;
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || (!stayAtBottomRef.current && !forceBottomRef.current)) return;
    const behavior: ScrollBehavior = forceBottomRef.current ? 'smooth' : 'auto';
    forceBottomRef.current = false;
    window.requestAnimationFrame(() => element.scrollTo({ top: element.scrollHeight, behavior }));
  }, [messages]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = '0px';
    input.style.height = `${Math.min(96, Math.max(42, input.scrollHeight))}px`;
  }, [draft]);

  const send = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    try {
      await sendGuildChatMessage(guildId, message);
      setDraft('');
      forceBottomRef.current = true;
      await refresh();
    } catch {
      setError(de ? 'Die Nachricht konnte nicht gesendet werden.' : 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return <section data-testid="guild-chat-tab" className="flex min-h-0 flex-1 flex-col pt-3">
    <style>{`[data-testid='guild-chat-tab'] ~ div[class~='shrink-0'] { display: none; }`}</style>

    <header data-testid="guild-chat-header" className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2">
      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase tracking-[.18em] text-amber-100/70">{de ? 'GILDENCHAT' : 'GUILD CHAT'}</div>
        <div className="mt-0.5 text-[7px] text-white/32">{de ? `${messages.length} der letzten 50 Nachrichten` : `${messages.length} of the latest 50 messages`}</div>
      </div>
      <button
        data-testid="guild-chat-refresh"
        type="button"
        aria-label={de ? 'Gildenchat aktualisieren' : 'Refresh guild chat'}
        title={de ? 'Aktualisieren' : 'Refresh'}
        onClick={() => void refresh(true)}
        disabled={refreshing}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/35 text-base font-black text-white/62 disabled:opacity-35 active:scale-90"
      >{refreshing ? '…' : '↻'}</button>
    </header>

    <div
      ref={scrollRef}
      data-testid="guild-chat-messages"
      role="log"
      aria-live="polite"
      aria-busy={loading}
      onScroll={event => {
        const element = event.currentTarget;
        stayAtBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 72;
      }}
      className="min-h-[150px] flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-white/8 bg-black/28 p-3 [-webkit-overflow-scrolling:touch]"
    >
      {loading && !messages.length && <div data-testid="guild-chat-loading" className="grid min-h-32 place-items-center text-center text-[9px] text-white/34">{de ? 'Nachrichten werden geladen …' : 'Loading messages …'}</div>}

      {!loading && messages.map(message => {
        const mine = message.user_id === ownUserId;
        const name = mine ? (de ? 'Du' : 'You') : (message.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer'));
        return <div key={message.id} className={`flex min-w-0 ${mine ? 'justify-end' : 'justify-start'}`}>
          <article data-testid={mine ? 'guild-chat-message-own' : 'guild-chat-message-other'} className={`min-w-0 max-w-[84%] rounded-2xl border px-3 py-2 shadow-sm ${mine ? 'border-amber-300/24 bg-amber-500/12' : 'border-cyan-200/10 bg-white/[.045]'}`}>
            <div className="flex min-w-0 items-center gap-2 text-[6px] font-black uppercase tracking-[.11em] text-white/36">
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <time className="shrink-0 text-white/24">{formatTime(message.created_at, language)}</time>
            </div>
            <div className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/82 [overflow-wrap:anywhere]">{message.body}</div>
          </article>
        </div>;
      })}

      {!loading && !messages.length && !error && <div data-testid="guild-chat-empty" className="grid min-h-32 place-items-center px-5 text-center text-[9px] leading-relaxed text-white/34">{de ? 'Noch keine Nachrichten. Schreib die erste Nachricht an deine Gilde.' : 'No messages yet. Send the first message to your guild.'}</div>}
    </div>

    {error && <div data-testid="guild-chat-error" role="alert" className="mt-2 shrink-0 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[8px] text-red-200">{error}</div>}

    <form data-testid="guild-chat-composer" className="mt-2 flex shrink-0 items-end gap-2" onSubmit={event => { event.preventDefault(); void send(); }}>
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={inputRef}
          data-testid="guild-chat-input"
          value={draft}
          maxLength={400}
          rows={1}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
          placeholder={de ? 'Nachricht an die Gilde …' : 'Message the guild …'}
          className="block min-h-[42px] max-h-24 w-full resize-none overflow-y-auto rounded-xl border border-white/10 bg-black/45 py-2 pl-3 pr-12 text-[10px] leading-relaxed text-white outline-none placeholder:text-white/28 focus:border-amber-300/35"
        />
        <span data-testid="guild-chat-character-count" className="pointer-events-none absolute bottom-1.5 right-2.5 text-[6px] tabular-nums text-white/26">{draft.length}/400</span>
      </div>
      <button
        data-testid="guild-chat-send"
        type="submit"
        aria-label={de ? 'Nachricht senden' : 'Send message'}
        disabled={sending || !draft.trim()}
        className="min-h-[42px] min-w-[58px] shrink-0 rounded-xl border border-amber-300/30 bg-amber-500/14 px-2 text-[7px] font-black uppercase tracking-[.1em] text-amber-100 disabled:opacity-30 active:scale-[.98]"
      >{sending ? '…' : (de ? 'Senden' : 'Send')}</button>
    </form>
  </section>;
}
