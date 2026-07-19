import React, { useCallback, useEffect, useRef, useState } from 'react';
import { consumeGoogleOAuthResult, signInWithGoogle } from '../game/googleOAuth';
import {
  currentOnlineSession,
  getOnlineProfile,
  onlineSessionEventName,
  signInOnline,
  signOutOnline,
  signUpOnline,
  type OnlineProfile,
  type OnlineSession,
} from '../game/supabaseOnline';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';
import { loadSpectatingAllowed, refreshSpectatingAllowed, setSpectatingAllowed } from '../game/socialSpectatorOnline';
import { loadMetaProgression } from '../game/metaProgression';
import {
  commitServerPlayerNameChange,
  playerNameChangeQuoteFromServer,
  PLAYER_NAME_CHANGE_EVENT,
  PLAYER_NAME_CHANGE_GOLD_COST,
} from '../game/playerNameChange';
import {
  getMyPlayerNameStateOnline,
  setMyPlayerNameOnline,
  validatePlayerNameDraft,
  type PlayerNameStateOnline,
} from '../game/playerNameOnline';
import { renameSavedPlayerName } from '../game/saveManager';
import { rememberRunName, sanitizeRunName } from '../game/runIdentity';
import { pushCloudSave } from '../game/cloudSave';

type Props = { language: 'de' | 'en' };
type AuthMode = 'login' | 'register';

function Field({ value, onChange, placeholder, type = 'text', maxLength }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return <input value={value} type={type} maxLength={maxLength} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/55 px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet-300/45" />;
}

function ActionButton({ label, onClick, disabled = false, primary = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl border px-3 py-2.5 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${primary ? 'border-violet-300/35 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/[.04] text-white/65'} ${disabled ? 'pointer-events-none opacity-35' : ''}`}>{label}</button>;
}

function GoogleButton({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-white px-3 py-2.5 text-[10px] font-black text-[#202124] active:scale-[.98] ${disabled ? 'pointer-events-none opacity-40' : ''}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-white text-[12px] font-black text-[#4285f4]">G</span>{label}</button>;
}

function validationMessage(error: ReturnType<typeof validatePlayerNameDraft>['error'], de: boolean): string {
  if (error === 'length') return de ? 'Der Spielername braucht 3 bis 20 Zeichen.' : 'Player name must contain 3 to 20 characters.';
  if (error === 'characters') return de ? 'Erlaubt sind Buchstaben, Zahlen, Leerzeichen, Bindestrich und Unterstrich.' : 'Use letters, numbers, spaces, hyphens and underscores only.';
  if (error === 'reserved') return de ? 'Dieser Spielername ist reserviert.' : 'This player name is reserved.';
  return '';
}

export function OnlinePanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);
  const [playerNameState, setPlayerNameState] = useState<PlayerNameStateOnline | null>(null);
  const [spectatingAllowed, setSpectatingAllowedState] = useState(loadSpectatingAllowed);
  const [busy, setBusy] = useState(false);
  const [nameChangeBusy, setNameChangeBusy] = useState(false);
  const [, setNameEconomyRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const savedDisplayName = useRef('');
  const nameChangeLock = useRef(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, []);

  const refreshOnlineData = useCallback(async (): Promise<PlayerNameStateOnline | null> => {
    const active = currentOnlineSession();
    setSession(active);
    if (!active) {
      savedDisplayName.current = '';
      setProfile(null);
      setSocialProfile(null);
      setPlayerNameState(null);
      setDisplayName('');
      setSpectatingAllowedState(loadSpectatingAllowed());
      return null;
    }
    const [nextProfile, nextSocialProfile, nextSpectatingAllowed, nextNameState] = await Promise.all([
      getOnlineProfile(),
      getMySocialProfile(),
      refreshSpectatingAllowed().catch(() => loadSpectatingAllowed()),
      getMyPlayerNameStateOnline(),
    ]);
    const nextDisplayName = sanitizeRunName(nextNameState.display_name || nextProfile?.display_name || nextSocialProfile?.display_name || '');
    savedDisplayName.current = nextDisplayName;
    setProfile(nextProfile);
    setSocialProfile(nextSocialProfile);
    setPlayerNameState(nextNameState);
    setSpectatingAllowedState(nextSpectatingAllowed);
    setDisplayName(nextDisplayName);
    return nextNameState;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => { void run(async () => { await refreshOnlineData(); }); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void run(async () => {
      const oauth = await consumeGoogleOAuthResult();
      if (cancelled) return;
      if (oauth.error) throw new Error(oauth.error);
      if (oauth.handled) {
        const nameState = await refreshOnlineData();
        setMessage(nameState?.confirmed
          ? (de ? 'Google-Konto verbunden.' : 'Google account connected.')
          : (de ? 'Google-Konto verbunden. Wähle jetzt deinen eindeutigen Ingame-Spielernamen.' : 'Google account connected. Choose your unique in-game player name now.'));
        return;
      }
      if (currentOnlineSession()) await refreshOnlineData();
    });
    return () => {
      cancelled = true;
      window.removeEventListener(onlineSessionEventName(), refresh);
    };
  }, [de, refreshOnlineData, run]);

  useEffect(() => {
    const refresh = () => setNameEconomyRevision(value => value + 1);
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    window.addEventListener(PLAYER_NAME_CHANGE_EVENT, refresh);
    window.addEventListener('dungeon-veil-cloud-save-restored', refresh);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refresh);
      window.removeEventListener(PLAYER_NAME_CHANGE_EVENT, refresh);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refresh);
    };
  }, []);

  const applyConfirmedNameLocally = useCallback(async (name: string) => {
    rememberRunName(name);
    renameSavedPlayerName(name);
    void pushCloudSave();
  }, []);

  const authenticate = () => run(async () => {
    if (!email.includes('@')) throw new Error(de ? 'Bitte eine gültige E-Mail eingeben.' : 'Enter a valid email address.');
    if (password.length < 8) throw new Error(de ? 'Das Passwort braucht mindestens 8 Zeichen.' : 'Password must contain at least 8 characters.');
    if (mode === 'register') {
      const validation = validatePlayerNameDraft(displayName);
      if (!validation.valid) throw new Error(validationMessage(validation.error, de));
      const result = await signUpOnline(email, password, validation.normalized);
      if (result.confirmationRequired) {
        setMessage(de ? 'Konto erstellt. Bestätige deine E-Mail; beim ersten Login bestätigst du deinen Ingame-Spielernamen.' : 'Account created. Confirm your email; on first login you will confirm your in-game player name.');
        setMode('login');
        return;
      }
      const confirmed = await setMyPlayerNameOnline(validation.normalized);
      commitServerPlayerNameChange(confirmed.user_id, confirmed.completed_changes, confirmed.charged_gold);
      await applyConfirmedNameLocally(confirmed.display_name);
    } else {
      await signInOnline(email, password);
    }
    setPassword('');
    const nameState = await refreshOnlineData();
    setMessage(nameState?.confirmed
      ? (de ? 'Online-Konto verbunden.' : 'Online account connected.')
      : (de ? 'Online-Konto verbunden. Bestätige jetzt deinen Ingame-Spielernamen.' : 'Online account connected. Confirm your in-game player name now.'));
  });

  const googleLogin = () => run(async () => {
    await signInWithGoogle();
    const nameState = await refreshOnlineData();
    setMessage(nameState?.confirmed
      ? (de ? 'Google-Konto verbunden.' : 'Google account connected.')
      : (de ? 'Google-Konto verbunden. Der Google-Anzeigename wird nicht automatisch übernommen – bestätige deinen Ingame-Namen.' : 'Google account connected. Your Google display name is not accepted automatically—confirm your in-game name.'));
  });

  const toggleSpectating = () => run(async () => {
    const next = !spectatingAllowed;
    await setSpectatingAllowed(next);
    setSpectatingAllowedState(next);
    setMessage(next
      ? (de ? 'Freunde dürfen deinen laufenden Run ansehen.' : 'Friends may watch your active run.')
      : (de ? 'Zuschauen ist jetzt deaktiviert.' : 'Spectating is now disabled.'));
  });

  const changePlayerName = async () => {
    if (!session || !playerNameState || nameChangeLock.current) return;
    const validation = validatePlayerNameDraft(displayName);
    if (!validation.valid) {
      setError(validationMessage(validation.error, de));
      return;
    }
    const previousName = sanitizeRunName(savedDisplayName.current);
    if (playerNameState.confirmed && validation.normalized === previousName) {
      setError(de ? 'Bitte einen neuen Spielernamen eingeben.' : 'Enter a new player name.');
      return;
    }

    const quote = playerNameChangeQuoteFromServer(
      playerNameState.completed_changes,
      playerNameState.next_change_cost,
      loadMetaProgression(),
    );
    if (!quote.affordable) {
      setError(de ? `Nicht genug Gold. Benötigt: ${quote.cost}.` : `Not enough gold. Required: ${quote.cost}.`);
      return;
    }

    nameChangeLock.current = true;
    setNameChangeBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await setMyPlayerNameOnline(validation.normalized);
      commitServerPlayerNameChange(result.user_id, result.completed_changes, result.charged_gold);
      await applyConfirmedNameLocally(result.display_name);
      const [nextProfile, nextSocialProfile, nextNameState] = await Promise.all([
        getOnlineProfile(),
        getMySocialProfile(),
        getMyPlayerNameStateOnline(),
      ]);
      savedDisplayName.current = result.display_name;
      setDisplayName(result.display_name);
      setProfile(nextProfile);
      setSocialProfile(nextSocialProfile);
      setPlayerNameState(nextNameState);
      setNameEconomyRevision(value => value + 1);
      setMessage(result.initial_confirmation
        ? (de ? 'Ingame-Spielername bestätigt.' : 'In-game player name confirmed.')
        : result.charged_gold === 0
          ? (de ? 'Spielername geändert. Die erste Änderung war kostenlos.' : 'Player name changed. The first change was free.')
          : (de ? `Spielername geändert. ${result.charged_gold} Gold wurden bezahlt.` : `Player name changed. ${result.charged_gold} gold was paid.`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      nameChangeLock.current = false;
      setNameChangeBusy(false);
    }
  };

  const copyFriendCode = async () => {
    if (!socialProfile?.friend_code) return;
    await navigator.clipboard?.writeText(socialProfile.friend_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const logout = () => run(async () => {
    await signOutOnline();
    savedDisplayName.current = '';
    setSession(null);
    setProfile(null);
    setSocialProfile(null);
    setPlayerNameState(null);
    setDisplayName('');
    setMessage(de ? 'Abgemeldet. Lokales Spielen bleibt verfügbar.' : 'Signed out. Offline play remains available.');
  });

  const nameValidation = validatePlayerNameDraft(displayName);
  const sanitizedDraft = nameValidation.normalized;
  const savedName = sanitizeRunName(savedDisplayName.current);
  const nameConfirmationRequired = Boolean(session && playerNameState && !playerNameState.confirmed);
  const nameChanged = Boolean(session && nameValidation.valid && (nameConfirmationRequired || sanitizedDraft !== savedName));
  const nameQuote = session && playerNameState
    ? playerNameChangeQuoteFromServer(playerNameState.completed_changes, playerNameState.next_change_cost, loadMetaProgression())
    : null;
  const nameChangeDisabled = !nameChanged || nameChangeBusy || !nameQuote?.affordable;
  const nameChangeLabel = nameChangeBusy
    ? (de ? 'SPIELERNAME WIRD GESPEICHERT…' : 'SAVING PLAYER NAME…')
    : nameConfirmationRequired
      ? (de ? 'INGAME-NAMEN BESTÄTIGEN' : 'CONFIRM IN-GAME NAME')
      : nameQuote?.free
        ? (de ? 'KOSTENLOS ÄNDERN' : 'CHANGE FOR FREE')
        : (de ? `FÜR ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('de-DE')} GOLD ÄNDERN` : `CHANGE FOR ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('en-US')} GOLD`);
  const invalidNameMessage = displayName && !nameValidation.valid ? validationMessage(nameValidation.error, de) : '';
  const nameRuleText = invalidNameMessage || (nameConfirmationRequired
    ? (de ? 'Wähle 3–20 Zeichen. Dein Google- oder E-Mail-Anzeigename wird erst nach dieser Bestätigung als Ingame-Name verwendet.' : 'Choose 3–20 characters. Your Google or email display name is used in game only after this confirmation.')
    : nameQuote?.free
      ? (de ? 'Deine erste spätere Spielername-Änderung ist kostenlos.' : 'Your first later player-name change is free.')
      : (de ? `Weitere Änderungen kosten ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('de-DE')} Gold. Verfügbar: ${nameQuote?.gold.toLocaleString('de-DE') ?? 0}.` : `Further changes cost ${PLAYER_NAME_CHANGE_GOLD_COST.toLocaleString('en-US')} gold. Available: ${nameQuote?.gold.toLocaleString('en-US') ?? 0}.`));

  return <div className="max-h-[78vh] overflow-y-auto rounded-3xl border border-violet-300/18 bg-[#0b0910]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/45">ONLINE & CLOUD</div>
      <div className="mt-1 text-lg font-black">{session ? (playerNameState?.confirmed ? profile?.display_name : session.user.email || 'Dungeon Veil') : (de ? 'Konto verbinden' : 'Connect account')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Profil und Spielstand werden automatisch synchronisiert. Offline bleibt immer verfügbar.' : 'Profile and save data sync automatically. Offline play always remains available.'}</div>
    </div>

    {(message || error) && <div className={`mb-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session ? <div className="space-y-3">
      <GoogleButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : de ? 'Mit Google anmelden' : 'Continue with Google'} onClick={googleLogin} disabled={busy} />
      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.18em] text-white/25"><span className="h-px flex-1 bg-white/10" />{de ? 'oder mit E-Mail' : 'or use email'}<span className="h-px flex-1 bg-white/10" /></div>
      <div className="grid grid-cols-2 gap-2"><ActionButton label={de ? 'Anmelden' : 'Sign in'} onClick={() => setMode('login')} primary={mode === 'login'} /><ActionButton label={de ? 'Registrieren' : 'Register'} onClick={() => setMode('register')} primary={mode === 'register'} /></div>
      {mode === 'register' && <><Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername · 3–20 Zeichen' : 'Player name · 3–20 characters'} maxLength={20} />{displayName && !nameValidation.valid && <div className="rounded-xl border border-red-300/18 bg-red-400/[.05] px-3 py-2 text-[8px] text-red-100/72">{validationMessage(nameValidation.error, de)}</div>}</>}
      <Field value={email} onChange={setEmail} placeholder="E-Mail" type="email" />
      <Field value={password} onChange={setPassword} placeholder={de ? 'Passwort · mindestens 8 Zeichen' : 'Password · at least 8 characters'} type="password" />
      <ActionButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : mode === 'register' ? (de ? 'Konto erstellen' : 'Create account') : (de ? 'Anmelden' : 'Sign in')} onClick={authenticate} disabled={busy} primary />
    </div> : <div className="space-y-3">
      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'ANGEMELDETES KONTO' : 'SIGNED-IN ACCOUNT'}</div>
        <div className="truncate text-[11px] text-white/62">{session.user.email || profile?.display_name || 'Dungeon Veil'}</div>
      </section>

      {nameConfirmationRequired && <section data-testid="player-name-confirmation-required" className="rounded-2xl border border-amber-300/30 bg-amber-400/[.09] p-3">
        <div className="text-[9px] font-black uppercase tracking-[.16em] text-amber-100">{de ? 'INGAME-NAMEN BESTÄTIGEN' : 'CONFIRM IN-GAME NAME'}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-amber-50/72">{de ? 'Bevor Freunde, Gilde, Duo und Ranglisten deinen Namen anzeigen, bestätigst du einmal selbst den gewünschten Namen.' : 'Before friends, guilds, Duo and leaderboards show your name, confirm the name you chose.'}</div>
      </section>}

      {socialProfile && playerNameState?.confirmed && <section data-testid="social-profile-summary" className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[.035] p-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[7px] font-black uppercase tracking-[.18em] text-cyan-100/42">{de ? 'FREUNDESCODE' : 'FRIEND CODE'}</div><div className="mt-1 text-[14px] font-black tracking-[.16em] text-cyan-50">{socialProfile.friend_code}</div></div><button type="button" onClick={() => void copyFriendCode()} className="rounded-xl border border-cyan-300/18 bg-cyan-400/[.06] px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{copied ? (de ? 'Kopiert' : 'Copied') : (de ? 'Kopieren' : 'Copy')}</button></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] uppercase tracking-[.12em] text-white/28">{de ? 'Rang' : 'Rank'}</div><div className="mt-1 font-black text-amber-100">{socialProfile.current_rank}</div></div><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] uppercase tracking-[.12em] text-white/28">{de ? 'Kapitel' : 'Chapter'}</div><div className="mt-1 font-black text-violet-100">{socialProfile.current_chapter}</div></div></div>
      </section>}

      {playerNameState?.confirmed && <section data-testid="spectating-privacy-setting" className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[.035] p-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-100/62">{de ? 'FREUNDEN ZUSCHAUEN ERLAUBEN' : 'ALLOW FRIEND SPECTATING'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Nur bestätigte Freunde können deinen aktiven Run mit kurzer Verzögerung ansehen.' : 'Only confirmed friends can watch your active run with a short delay.'}</div></div>
          <button type="button" role="switch" aria-checked={spectatingAllowed} disabled={busy} onClick={toggleSpectating} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${spectatingAllowed ? 'border-emerald-300/35 bg-emerald-500/25' : 'border-white/12 bg-black/40'} disabled:opacity-40`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${spectatingAllowed ? 'left-6' : 'left-1'}`} /></button>
        </div>
      </section>}

      <section data-testid="player-name-change" className="space-y-2 rounded-2xl border border-amber-300/14 bg-amber-400/[.035] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-amber-100/62">{nameConfirmationRequired ? (de ? 'INGAME-SPIELERNAME' : 'IN-GAME PLAYER NAME') : (de ? 'SPIELERNAME ÄNDERN' : 'CHANGE PLAYER NAME')}</div>
        <div className="text-[8px] leading-relaxed text-white/42">{de ? 'Der bestätigte Name erscheint einheitlich im Profil, bei Freunden, Gilde, Duo, Zuschauern und Ranglisten.' : 'The confirmed name appears consistently in profiles, friends, guilds, Duo, spectating and leaderboards.'}</div>
        <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername · 3–20 Zeichen' : 'Player name · 3–20 characters'} maxLength={20} />
        <div data-testid="player-name-change-cost" className={`rounded-xl border px-3 py-2 text-[8px] leading-relaxed ${nameQuote?.affordable && !invalidNameMessage ? 'border-amber-300/14 bg-black/20 text-amber-100/68' : 'border-red-300/18 bg-red-400/[.05] text-red-100/72'}`}>{nameRuleText}</div>
        <button data-testid="player-name-change-submit" type="button" disabled={nameChangeDisabled} onClick={() => void changePlayerName()} className="w-full rounded-xl border border-amber-300/28 bg-amber-500/14 px-3 py-3 text-[8px] font-black uppercase tracking-[.13em] text-amber-100 active:scale-[.98] disabled:pointer-events-none disabled:opacity-35">{nameChangeLabel}</button>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'CLOUD-SPEICHERUNG' : 'CLOUD SAVE'}</div>
        <div data-testid="cloud-autosync-status" className="rounded-xl border border-cyan-300/12 bg-cyan-400/[.035] px-3 py-2 text-[8px] leading-relaxed text-cyan-50/58">{de ? 'Der Spielstand wird im Hintergrund gesichert und beim Öffnen, Zurückkehren und Browserwechsel automatisch abgeglichen.' : 'Your save is backed up in the background and reconciled automatically when opening, returning, or switching browsers.'}</div>
      </section>

      <ActionButton label={de ? 'Abmelden' : 'Sign out'} onClick={logout} disabled={busy || nameChangeBusy} />
    </div>}
  </div>;
}
