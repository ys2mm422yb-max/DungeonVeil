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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const next = await listGuildChatMessages(guildId, 50);
    setMessages(next);
  }, [guildId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await listGuildChatMessages(guildId, 50);
        if (active) setMessages(next);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [guildId]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setError('');
    try {
      await sendGuildChatMessage(guildId, message);
      setDraft('');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return <section data-testid="guild-chat-tab" className="flex min-h-0 flex-1 flex-col pt-3">
    <div ref={scrollRef} data-testid="guild-chat-messages" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-2xl border border-white/8 bg-black/28 p-3 [-webkit-overflow-scrolling:touch]">
      {messages.map(message => {
        const mine = message.user_id === ownUserId;
        const name = message.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
        return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[86%] rounded-2xl border px-3 py-2 ${mine ? 'border-amber-300/20 bg-amber-500/10' : 'border-white/8 bg-white/[.035]'}`}>
            <div className="flex items-center gap-2 text-[6px] font-black uppercase tracking-[.12em] text-white/28"><span className="truncate">{name}</span><span>{formatTime(message.created_at, language)}</span></div>
            <div className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/78">{message.body}</div>
          </div>
        </div>;
      })}
      {!messages.length && <div className="grid min-h-32 place-items-center text-center text-[9px] leading-relaxed text-white/30">{de ? 'Noch keine Nachrichten. Starte den Gildenchat.' : 'No messages yet. Start the guild chat.'}</div>}
    </div>
    {error && <div className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[8px] text-red-200">{error}</div>}
    <div className="mt-2 flex shrink-0 gap-2">
      <textarea
        data-testid="guild-chat-input"
        value={draft}
        maxLength={400}
        rows={2}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
        placeholder={de ? 'Nachricht an die Gilde …' : 'Message the guild …'}
        className="min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-white outline-none placeholder:text-white/24 focus:border-amber-300/35"
      />
      <button data-testid="guild-chat-send" type="button" onClick={() => void send()} disabled={busy || !draft.trim()} className="min-w-16 rounded-xl border border-amber-300/30 bg-amber-500/14 px-3 text-[8px] font-black uppercase tracking-[.12em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{busy ? '…' : (de ? 'Senden' : 'Send')}</button>
    </div>
    <div className="mt-1 text-right text-[6px] text-white/20">{draft.length}/400</div>
  </section>;
}
