import React, { useCallback, useEffect, useState } from 'react';
import {
  loadPlayerNameProfile,
  normalizePlayerName,
  PLAYER_NAME_CHANGE_GOLD_COST,
  setPlayerDisplayName,
  validatePlayerName,
  type PlayerNameProfile,
} from '../game/playerNameOnline';
import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';

type Props = {
  language: 'de' | 'en';
  onSaved?: (profile: PlayerNameProfile) => void;
};

function errorText(reason: unknown, de: boolean): string {
  const raw = reason instanceof Error ? reason.message : String(reason);
  if (/already in use/i.test(raw)) return de ? 'Dieser Spielername ist bereits vergeben.' : 'This player name is already in use.';
  if (/2 to 24/i.test(raw)) return de ? 'Der Spielername muss 2 bis 24 Zeichen lang sein.' : 'The player name must contain 2 to 24 characters.';
  return raw || (de ? 'Der Spielername konnte nicht gespeichert werden.' : 'The player name could not be saved.');
}

export function PlayerNameOnboardingModal({ language, onSaved }: Props) {
  const de = language === 'de';
  const [profile, setProfile] = useState<PlayerNameProfile | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!currentOnlineSession()) {
      setProfile(null);
      setName('');
      return;
    }
    const next = await loadPlayerNameProfile();
    setProfile(next);
    if (next && !next.display_name_confirmed_at) {
      const suggested = /^(Abenteurer|Adventurer)$/i.test(next.display_name.trim()) ? '' : next.display_name;
      setName(current => current || suggested);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runRefresh = () => {
      void refresh().catch(() => {
        if (cancelled) return;
        window.setTimeout(() => { if (!cancelled) void refresh().catch(() => {}); }, 900);
      });
    };
    window.addEventListener(onlineSessionEventName(), runRefresh);
    runRefresh();
    return () => {
      cancelled = true;
      window.removeEventListener(onlineSessionEventName(), runRefresh);
    };
  }, [refresh]);

  if (!profile || profile.display_name_confirmed_at) return null;

  const normalized = normalizePlayerName(name);
  const validation = validatePlayerName(normalized);
  const save = async () => {
    if (validation) {
      setError(de ? validation : 'The player name must contain 2 to 24 supported characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await setPlayerDisplayName(normalized);
      setProfile(saved);
      onSaved?.(saved);
    } catch (reason) {
      setError(errorText(reason, de));
    } finally {
      setBusy(false);
    }
  };

  return <div data-testid="player-name-onboarding" className="fixed inset-0 z-[320] flex items-center justify-center bg-[#050509]/94 px-5 text-white backdrop-blur-xl">
    <section className="w-full max-w-sm rounded-3xl border border-violet-300/22 bg-[#100c19]/98 p-5 shadow-2xl">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/48">{de ? 'DEIN INGAME-PROFIL' : 'YOUR IN-GAME PROFILE'}</div>
      <h2 className="mt-2 text-xl font-black text-violet-50">{de ? 'Wähle deinen Spielernamen' : 'Choose your player name'}</h2>
      <p className="mt-2 text-[10px] leading-relaxed text-white/48">{de
        ? 'Dieser Name wird oben links sowie bei Freunden, Gilden und Duo-Runs angezeigt. Dein Google- oder Kontoname wird nicht automatisch übernommen.'
        : 'This name appears in the top-left profile and across friends, guilds and Duo runs. Your Google or account name is not used automatically.'}</p>
      <div className="mt-4 rounded-2xl border border-emerald-300/14 bg-emerald-400/[.04] p-3 text-[9px] leading-relaxed text-emerald-100/72">{de
        ? `Die erste Festlegung ist kostenlos. Spätere Änderungen kosten ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('de-DE')} Gold.`
        : `The first setup is free. Later changes cost ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('en-US')} gold.`}</div>
      <label className="mt-4 block text-[8px] font-black uppercase tracking-[.18em] text-white/42">{de ? 'SPIELERNAME' : 'PLAYER NAME'}</label>
      <input
        data-testid="player-name-onboarding-input"
        value={name}
        maxLength={24}
        autoFocus
        autoComplete="off"
        onChange={event => { setName(event.target.value); setError(''); }}
        onKeyDown={event => { if (event.key === 'Enter' && !busy) void save(); }}
        placeholder={de ? '2 bis 24 Zeichen' : '2 to 24 characters'}
        className="mt-2 w-full rounded-2xl border border-white/12 bg-black/50 px-4 py-3 text-[14px] font-bold text-white outline-none placeholder:text-white/22 focus:border-violet-300/45"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-[8px]"><span className={error ? 'text-red-200' : 'text-white/28'}>{error || (de ? 'Leerzeichen, Zahlen und normale Sonderzeichen wie - oder _ sind möglich.' : 'Spaces, numbers, hyphens and underscores are supported.')}</span><span className="shrink-0 text-white/24">{normalized.length}/24</span></div>
      <button
        data-testid="player-name-onboarding-confirm"
        type="button"
        disabled={busy || Boolean(validation)}
        onClick={() => void save()}
        className="mt-4 w-full rounded-2xl border border-violet-200/30 bg-violet-500/22 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-violet-50 active:scale-[.985] disabled:pointer-events-none disabled:opacity-35"
      >{busy ? (de ? 'WIRD GESPEICHERT …' : 'SAVING …') : (de ? 'NAMEN KOSTENLOS FESTLEGEN' : 'SET NAME FOR FREE')}</button>
    </section>
  </div>;
}
