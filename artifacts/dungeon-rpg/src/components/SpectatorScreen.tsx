import React, { useEffect, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import { loadFriendSpectatorFeed, SPECTATOR_REFRESH_MS, type FriendSpectatorFeed } from '../game/socialSpectatorOnline';
import { CombatStage } from './CombatStage';

export function SpectatorScreen({ friendId, friendName, language, onClose }: {
  friendId: string;
  friendName: string;
  language: 'de' | 'en';
  onClose: () => void;
}) {
  const de = language === 'de';
  const [feed, setFeed] = useState<FriendSpectatorFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const refresh = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        const next = await loadFriendSpectatorFeed(friendId);
        if (cancelled) return;
        if (next) {
          setFeed(next);
          setEnded(false);
          setError('');
        } else if (feed) {
          setEnded(true);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setLoading(false);
        busy = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), SPECTATOR_REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [friendId]);

  const gameState = feed?.snapshot?.state as RunGameState | undefined;

  return <div data-testid="spectator-screen" className="fixed inset-0 z-[220] overflow-hidden bg-black text-white">
    {gameState && <CombatStage gameState={gameState} />}
    {!gameState && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(67,41,102,.3),#050507_56%)]" />}

    <header className="pointer-events-none absolute inset-x-0 top-0 z-[240] flex items-start justify-between gap-3 bg-gradient-to-b from-black/88 via-black/52 to-transparent px-4 pb-10 pt-[max(14px,calc(env(safe-area-inset-top)+8px))]">
      <div className="min-w-0 rounded-2xl border border-violet-300/18 bg-black/65 px-3 py-2 backdrop-blur-lg">
        <div className="text-[7px] font-black uppercase tracking-[.24em] text-violet-200/55">{de ? 'LIVE ZUSCHAUEN' : 'LIVE SPECTATING'}</div>
        <div className="mt-1 truncate text-[13px] font-black text-white/90">{friendName}</div>
        <div className="mt-1 text-[7px] uppercase tracking-[.13em] text-white/40">{feed ? `${de ? 'Kapitel' : 'Chapter'} ${feed.chapter} · ${de ? 'Raum' : 'Room'} ${feed.room} · ${de ? 'ca. 1 Sek. verzögert' : 'about 1 sec delayed'}` : (de ? 'Verbindung wird aufgebaut' : 'Connecting')}</div>
      </div>
      <button type="button" aria-label={de ? 'Zuschauen beenden' : 'Stop spectating'} onClick={onClose} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/16 bg-black/72 text-xl font-black text-white/80 backdrop-blur-lg active:scale-90">×</button>
    </header>

    {(loading || error || ended) && <div className="absolute inset-x-4 bottom-[max(18px,env(safe-area-inset-bottom))] z-[240] rounded-2xl border border-white/12 bg-black/78 p-4 text-center backdrop-blur-xl">
      <div className="text-[9px] font-black uppercase tracking-[.17em] text-violet-100">{loading ? (de ? 'LIVE-RUN WIRD GELADEN …' : 'LOADING LIVE RUN …') : ended ? (de ? 'DER RUN WURDE BEENDET ODER PAUSIERT' : 'THE RUN ENDED OR WAS PAUSED') : (de ? 'ZUSCHAUEN NICHT VERFÜGBAR' : 'SPECTATING UNAVAILABLE')}</div>
      {(error || ended) && <div className="mt-2 text-[9px] leading-relaxed text-white/42">{error || (de ? 'Du kannst zur Freundesliste zurückkehren.' : 'You can return to the friends list.')}</div>}
      {(error || ended) && <button type="button" onClick={onClose} className="mt-3 rounded-xl border border-violet-300/20 bg-violet-500/12 px-5 py-2.5 text-[8px] font-black uppercase tracking-[.14em] text-violet-100 active:scale-[.98]">{de ? 'ZURÜCK' : 'BACK'}</button>}
    </div>}
  </div>;
}
