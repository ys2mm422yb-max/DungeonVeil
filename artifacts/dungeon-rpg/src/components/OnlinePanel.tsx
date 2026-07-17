import React, { useCallback, useEffect, useRef, useState } from 'react';
import { consumeGoogleOAuthResult, signInWithGoogle } from '../game/googleOAuth';
import {
  currentOnlineSession,
  getOnlineProfile,
  onlineSessionEventName,
  signInOnline,
  signOutOnline,
  signUpOnline,
  updateOnlineProfile,
  type OnlineProfile,
  type OnlineSession,
} from '../game/supabaseOnline';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';
import { loadSpectatingAllowed, refreshSpectatingAllowed, setSpectatingAllowed } from '../game/socialSpectatorOnline';

type Props = { language: 'de' | 'en' };
type AuthMode = 'login' | 'register';
type ProfileSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

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

export function OnlinePanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);
  const [spectatingAllowed, setSpectatingAllowedState] = useState(loadSpectatingAllowed);
  const [profileSaveState, setProfileSaveState] = useState<ProfileSaveState>('idle');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const savedDisplayName = useRef('');
  const profileSaveSequence = useRef(0);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }, []);

  const refreshOnlineData = useCallback(async () => {
    const active = currentOnlineSession();
    setSession(active);
    if (!active) {
      profileSaveSequence.current += 1;
      savedDisplayName.current = '';
      setProfile(null);
      setSocialProfile(null);
      setDisplayName('');
      setProfileSaveState('idle');
      setProfileSaveError('');
      setSpectatingAllowedState(loadSpectatingAllowed());
      return;
    }
    const [nextProfile, nextSocialProfile, nextSpectatingAllowed] = await Promise.all([
      getOnlineProfile(),
      getMySocialProfile(),
      refreshSpectatingAllowed().catch(() => loadSpectatingAllowed()),
    ]);
    const nextDisplayName = nextProfile?.display_name ?? nextSocialProfile?.display_name ?? '';
    savedDisplayName.current = nextDisplayName.trim();
    setProfile(nextProfile);
    setSocialProfile(nextSocialProfile);
    setSpectatingAllowedState(nextSpectatingAllowed);
    setDisplayName(nextDisplayName);
    setProfileSaveState('saved');
    setProfileSaveError('');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => { void run(refreshOnlineData); };
    window.addEventListener(onlineSessionEventName(), refresh);
    void run(async () => {
      const oauth = await consumeGoogleOAuthResult();
      if (cancelled) return;
      if (oauth.error) throw new Error(oauth.error);
      if (oauth.handled) {
        await refreshOnlineData();
        setMessage(de ? 'Google-Konto verbunden.' : 'Google account connected.');
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
    if (!session) return;
    const nextDisplayName = displayName.trim();
    if (nextDisplayName.length < 2) {
      setProfileSaveState(nextDisplayName ? 'error' : 'idle');
      setProfileSaveError(nextDisplayName ? (de ? 'Der Spielername braucht mindestens 2 Zeichen.' : 'Player name needs at least 2 characters.') : '');
      return;
    }
    if (nextDisplayName === savedDisplayName.current) {
      setProfileSaveState('saved');
      setProfileSaveError('');
      return;
    }

    const sequence = ++profileSaveSequence.current;
    setProfileSaveState('pending');
    setProfileSaveError('');
    const timer = window.setTimeout(() => {
      setProfileSaveState('saving');
      void (async () => {
        try {
          await updateOnlineProfile(nextDisplayName);
          const [nextProfile, nextSocialProfile] = await Promise.all([
            getOnlineProfile(),
            getMySocialProfile(),
          ]);
          if (sequence !== profileSaveSequence.current) return;
          savedDisplayName.current = nextDisplayName;
          setProfile(nextProfile);
          setSocialProfile(nextSocialProfile);
          setProfileSaveState('saved');
        } catch (reason) {
          if (sequence !== profileSaveSequence.current) return;
          setProfileSaveState('error');
          setProfileSaveError(reason instanceof Error ? reason.message : String(reason));
        }
      })();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [de, displayName, session]);

  const authenticate = () => run(async () => {
    if (!email.includes('@')) throw new Error(de ? 'Bitte eine gültige E-Mail eingeben.' : 'Enter a valid email address.');
    if (password.length < 8) throw new Error(de ? 'Das Passwort braucht mindestens 8 Zeichen.' : 'Password must contain at least 8 characters.');
    if (mode === 'register') {
      if (displayName.trim().length < 2) throw new Error(de ? 'Der Spielername ist zu kurz.' : 'Player name is too short.');
      const result = await signUpOnline(email, password, displayName);
      if (result.confirmationRequired) {
        setMessage(de ? 'Konto erstellt. Bitte den Bestätigungslink in der E-Mail öffnen und danach anmelden.' : 'Account created. Confirm the email, then sign in.');
        setMode('login');
        return;
      }
    } else {
      await signInOnline(email, password);
    }
    setPassword('');
    await refreshOnlineData();
    setMessage(de ? 'Online-Konto verbunden.' : 'Online account connected.');
  });

  const googleLogin = () => run(async () => {
    await signInWithGoogle();
    await refreshOnlineData();
    setMessage(de ? 'Google-Konto verbunden.' : 'Google account connected.');
  });

  const toggleSpectating = () => run(async () => {
    const next = !spectatingAllowed;
    await setSpectatingAllowed(next);
    setSpectatingAllowedState(next);
    setMessage(next
      ? (de ? 'Freunde dürfen deinen laufenden Run ansehen.' : 'Friends may watch your active run.')
      : (de ? 'Zuschauen ist jetzt deaktiviert.' : 'Spectating is now disabled.'));
  });

  const copyFriendCode = async () => {
    if (!socialProfile?.friend_code) return;
    await navigator.clipboard?.writeText(socialProfile.friend_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const logout = () => run(async () => {
    await signOutOnline();
    profileSaveSequence.current += 1;
    savedDisplayName.current = '';
    setSession(null);
    setProfile(null);
    setSocialProfile(null);
    setDisplayName('');
    setProfileSaveState('idle');
    setProfileSaveError('');
    setMessage(de ? 'Abgemeldet. Lokales Spielen bleibt verfügbar.' : 'Signed out. Offline play remains available.');
  });

  const profileStatusText = profileSaveError
    || (profileSaveState === 'pending'
      ? (de ? 'Änderung erkannt · wird gleich automatisch gespeichert.' : 'Change detected · saving automatically in a moment.')
      : profileSaveState === 'saving'
        ? (de ? 'Profil wird automatisch gespeichert …' : 'Profile is saving automatically …')
        : (de ? 'Profil wird automatisch gespeichert.' : 'Profile saves automatically.'));

  return <div className="max-h-[78vh] overflow-y-auto rounded-3xl border border-violet-300/18 bg-[#0b0910]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/45">ONLINE & CLOUD</div>
      <div className="mt-1 text-lg font-black">{session ? (profile?.display_name || session.user.email || 'Dungeon Veil') : (de ? 'Konto verbinden' : 'Connect account')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Profil und Spielstand werden automatisch synchronisiert. Offline bleibt immer verfügbar.' : 'Profile and save data sync automatically. Offline play always remains available.'}</div>
    </div>

    {(message || error) && <div className={`mb-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session ? <div className="space-y-3">
      <GoogleButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : de ? 'Mit Google anmelden' : 'Continue with Google'} onClick={googleLogin} disabled={busy} />
      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.18em] text-white/25"><span className="h-px flex-1 bg-white/10" />{de ? 'oder mit E-Mail' : 'or use email'}<span className="h-px flex-1 bg-white/10" /></div>
      <div className="grid grid-cols-2 gap-2"><ActionButton label={de ? 'Anmelden' : 'Sign in'} onClick={() => setMode('login')} primary={mode === 'login'} /><ActionButton label={de ? 'Registrieren' : 'Register'} onClick={() => setMode('register')} primary={mode === 'register'} /></div>
      {mode === 'register' && <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername' : 'Player name'} maxLength={24} />}
      <Field value={email} onChange={setEmail} placeholder="E-Mail" type="email" />
      <Field value={password} onChange={setPassword} placeholder={de ? 'Passwort · mindestens 8 Zeichen' : 'Password · at least 8 characters'} type="password" />
      <ActionButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : mode === 'register' ? (de ? 'Konto erstellen' : 'Create account') : (de ? 'Anmelden' : 'Sign in')} onClick={authenticate} disabled={busy} primary />
    </div> : <div className="space-y-3">
      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'ANGEMELDETES KONTO' : 'SIGNED-IN ACCOUNT'}</div>
        <div className="truncate text-[11px] text-white/62">{session.user.email || profile?.display_name || 'Dungeon Veil'}</div>
      </section>

      {socialProfile && <section data-testid="social-profile-summary" className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[.035] p-3">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[7px] font-black uppercase tracking-[.18em] text-cyan-100/42">{de ? 'FREUNDESCODE' : 'FRIEND CODE'}</div><div className="mt-1 text-[14px] font-black tracking-[.16em] text-cyan-50">{socialProfile.friend_code}</div></div><button type="button" onClick={() => void copyFriendCode()} className="rounded-xl border border-cyan-300/18 bg-cyan-400/[.06] px-3 py-2 text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 active:scale-[.98]">{copied ? (de ? 'Kopiert' : 'Copied') : (de ? 'Kopieren' : 'Copy')}</button></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] uppercase tracking-[.12em] text-white/28">{de ? 'Rang' : 'Rank'}</div><div className="mt-1 font-black text-amber-100">{socialProfile.current_rank}</div></div><div className="rounded-xl border border-white/7 bg-black/20 p-2"><div className="text-[7px] uppercase tracking-[.12em] text-white/28">{de ? 'Kapitel' : 'Chapter'}</div><div className="mt-1 font-black text-violet-100">{socialProfile.current_chapter}</div></div></div>
      </section>}

      <section data-testid="spectating-privacy-setting" className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[.035] p-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-100/62">{de ? 'FREUNDEN ZUSCHAUEN ERLAUBEN' : 'ALLOW FRIEND SPECTATING'}</div><div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Nur bestätigte Freunde können deinen aktiven Run mit kurzer Verzögerung ansehen.' : 'Only confirmed friends can watch your active run with a short delay.'}</div></div>
          <button type="button" role="switch" aria-checked={spectatingAllowed} disabled={busy} onClick={toggleSpectating} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${spectatingAllowed ? 'border-emerald-300/35 bg-emerald-500/25' : 'border-white/12 bg-black/40'} disabled:opacity-40`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${spectatingAllowed ? 'left-6' : 'left-1'}`} /></button>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'PROFIL & CLOUD' : 'PROFILE & CLOUD'}</div>
        <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername' : 'Player name'} maxLength={24} />
        <div data-testid="profile-autosave-status" className={`rounded-xl border px-3 py-2 text-[8px] leading-relaxed ${profileSaveError ? 'border-red-300/18 bg-red-400/[.05] text-red-100/72' : 'border-emerald-300/14 bg-emerald-400/[.04] text-emerald-100/62'}`}>{profileStatusText}</div>
        <div data-testid="cloud-autosync-status" className="rounded-xl border border-cyan-300/12 bg-cyan-400/[.035] px-3 py-2 text-[8px] leading-relaxed text-cyan-50/58">{de ? 'Der Spielstand wird im Hintergrund gesichert und beim Öffnen, Zurückkehren und Browserwechsel automatisch abgeglichen.' : 'Your save is backed up in the background and reconciled automatically when opening, returning, or switching browsers.'}</div>
      </section>

      <ActionButton label={de ? 'Abmelden' : 'Sign out'} onClick={logout} disabled={busy} />
    </div>}
  </div>;
}
