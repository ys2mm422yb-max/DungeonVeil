import React, { useCallback, useEffect, useState } from 'react';
import { pullCloudSave, pushCloudSave } from '../game/cloudSave';
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

type Props = {
  language: 'de' | 'en';
};

type AuthMode = 'login' | 'register';

function Field({ value, onChange, placeholder, type = 'text', maxLength }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return <input
    value={value}
    type={type}
    maxLength={maxLength}
    placeholder={placeholder}
    onChange={event => onChange(event.target.value)}
    className="w-full rounded-xl border border-white/10 bg-black/55 px-3 py-2.5 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet-300/45"
  />;
}

function ActionButton({ label, onClick, disabled = false, primary = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`rounded-xl border px-3 py-2.5 text-[9px] font-black uppercase tracking-[.14em] active:scale-[.98] ${primary ? 'border-violet-300/35 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/[.04] text-white/65'} ${disabled ? 'pointer-events-none opacity-35' : ''}`}
  >{label}</button>;
}

function GoogleButton({ label, onClick, disabled = false }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-white px-3 py-2.5 text-[10px] font-black text-[#202124] active:scale-[.98] ${disabled ? 'pointer-events-none opacity-40' : ''}`}
  >
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-white text-[12px] font-black text-[#4285f4]">G</span>
    {label}
  </button>;
}

export function OnlinePanel({ language }: Props) {
  const de = language === 'de';
  const [session, setSession] = useState<OnlineSession | null>(() => currentOnlineSession());
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profile, setProfile] = useState<OnlineProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      setProfile(null);
      setDisplayName('');
      return;
    }
    const nextProfile = await getOnlineProfile();
    setProfile(nextProfile);
    setDisplayName(nextProfile?.display_name ?? '');
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

  const saveProfile = () => run(async () => {
    if (displayName.trim().length < 2) throw new Error(de ? 'Der Spielername ist zu kurz.' : 'Player name is too short.');
    const next = await updateOnlineProfile(displayName);
    setProfile(next);
    setMessage(de ? 'Profil gespeichert.' : 'Profile saved.');
  });

  const uploadSave = () => run(async () => {
    if (!await pushCloudSave()) throw new Error(de ? 'Cloud-Speicherung fehlgeschlagen.' : 'Cloud save failed.');
    setMessage(de ? 'Aktueller Spielstand wurde hochgeladen.' : 'Current save uploaded.');
  });

  const downloadSave = () => run(async () => {
    const restored = await pullCloudSave();
    setMessage(restored
      ? de ? 'Neuerer Cloud-Spielstand geladen.' : 'Newer cloud save restored.'
      : de ? 'Kein neuerer Cloud-Spielstand vorhanden.' : 'No newer cloud save is available.');
  });

  const logout = () => run(async () => {
    await signOutOnline();
    setSession(null);
    setProfile(null);
    setDisplayName('');
    setMessage(de ? 'Abgemeldet. Lokales Spielen bleibt verfügbar.' : 'Signed out. Offline play remains available.');
  });

  return <div className="max-h-[78vh] overflow-y-auto rounded-3xl border border-violet-300/18 bg-[#0b0910]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/45">ONLINE & CLOUD</div>
      <div className="mt-1 text-lg font-black">{session ? (profile?.display_name || session.user.email || 'Dungeon Veil') : (de ? 'Konto verbinden' : 'Connect account')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Profil und Cloud-Spielstand. Offline bleibt immer verfügbar.' : 'Profile and cloud save. Offline play always remains available.'}</div>
    </div>

    {(message || error) && <div className={`mb-3 rounded-xl border px-3 py-2 text-[10px] ${error ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'}`}>{error || message}</div>}

    {!session ? <div className="space-y-3">
      <GoogleButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : de ? 'Mit Google anmelden' : 'Continue with Google'} onClick={googleLogin} disabled={busy} />
      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.18em] text-white/25">
        <span className="h-px flex-1 bg-white/10" />
        {de ? 'oder mit E-Mail' : 'or use email'}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ActionButton label={de ? 'Anmelden' : 'Sign in'} onClick={() => setMode('login')} primary={mode === 'login'} />
        <ActionButton label={de ? 'Registrieren' : 'Register'} onClick={() => setMode('register')} primary={mode === 'register'} />
      </div>
      {mode === 'register' && <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername' : 'Player name'} maxLength={24} />}
      <Field value={email} onChange={setEmail} placeholder="E-Mail" type="email" />
      <Field value={password} onChange={setPassword} placeholder={de ? 'Passwort · mindestens 8 Zeichen' : 'Password · at least 8 characters'} type="password" />
      <ActionButton label={busy ? (de ? 'Bitte warten …' : 'Please wait …') : mode === 'register' ? (de ? 'Konto erstellen' : 'Create account') : (de ? 'Anmelden' : 'Sign in')} onClick={authenticate} disabled={busy} primary />
    </div> : <div className="space-y-3">
      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'ANGEMELDETES KONTO' : 'SIGNED-IN ACCOUNT'}</div>
        <div className="truncate text-[11px] text-white/62">{session.user.email || profile?.display_name || 'Dungeon Veil'}</div>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'PROFIL & CLOUD' : 'PROFILE & CLOUD'}</div>
        <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername' : 'Player name'} maxLength={24} />
        <ActionButton label={de ? 'Profil speichern' : 'Save profile'} onClick={saveProfile} disabled={busy} primary />
        <div className="grid grid-cols-2 gap-2">
          <ActionButton label={de ? 'Spielstand hochladen' : 'Upload save'} onClick={uploadSave} disabled={busy} />
          <ActionButton label={de ? 'Spielstand herunterladen' : 'Download save'} onClick={downloadSave} disabled={busy} />
        </div>
      </section>

      <ActionButton label={de ? 'Abmelden' : 'Sign out'} onClick={logout} disabled={busy} />
    </div>}
  </div>;
}
