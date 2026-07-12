import React, { useCallback, useEffect, useState } from 'react';
import { pullCloudSave, pushCloudSave } from '../game/cloudSave';
import { consumeGoogleOAuthResult, signInWithGoogle } from '../game/googleOAuth';
import {
  acceptGuildInvite,
  createGuild,
  currentOnlineSession,
  declineGuildInvite,
  getCurrentWorldBoss,
  getMyGuildMembership,
  getOnlineProfile,
  listMyGuildInvites,
  onlineSessionEventName,
  signInOnline,
  signOutOnline,
  signUpOnline,
  updateOnlineProfile,
  type OnlineGuildInvite,
  type OnlineGuildMembership,
  type OnlineProfile,
  type OnlineSession,
  type WorldBossEvent,
} from '../game/supabaseOnline';

type Props = {
  language: 'de' | 'en';
};

type AuthMode = 'login' | 'register';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
}

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
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [invites, setInvites] = useState<OnlineGuildInvite[]>([]);
  const [boss, setBoss] = useState<WorldBossEvent | null>(null);
  const [guildName, setGuildName] = useState('');
  const [guildTag, setGuildTag] = useState('');
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
      setMembership(null);
      setInvites([]);
      setBoss(null);
      return;
    }
    const [nextProfile, nextMembership, nextInvites, nextBoss] = await Promise.all([
      getOnlineProfile(),
      getMyGuildMembership(),
      listMyGuildInvites(),
      getCurrentWorldBoss(),
    ]);
    setProfile(nextProfile);
    setDisplayName(nextProfile?.display_name ?? '');
    setMembership(nextMembership);
    setInvites(nextInvites);
    setBoss(nextBoss);
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

  const makeGuild = () => run(async () => {
    if (guildName.trim().length < 3) throw new Error(de ? 'Der Gildenname ist zu kurz.' : 'Guild name is too short.');
    if (guildTag.trim().length < 2) throw new Error(de ? 'Das Kürzel ist zu kurz.' : 'Guild tag is too short.');
    await createGuild(guildName, guildTag);
    setGuildName('');
    setGuildTag('');
    await refreshOnlineData();
    setMessage(de ? 'Gilde gegründet.' : 'Guild created.');
  });

  const answerInvite = (inviteId: string, accept: boolean) => run(async () => {
    if (accept) await acceptGuildInvite(inviteId);
    else await declineGuildInvite(inviteId);
    await refreshOnlineData();
    setMessage(accept ? (de ? 'Einladung angenommen.' : 'Invite accepted.') : (de ? 'Einladung abgelehnt.' : 'Invite declined.'));
  });

  const logout = () => run(async () => {
    await signOutOnline();
    setSession(null);
    setProfile(null);
    setMembership(null);
    setInvites([]);
    setBoss(null);
    setMessage(de ? 'Abgemeldet. Lokales Spielen bleibt verfügbar.' : 'Signed out. Offline play remains available.');
  });

  return <div className="max-h-[78vh] overflow-y-auto rounded-3xl border border-violet-300/18 bg-[#0b0910]/96 p-4 text-white shadow-2xl">
    <div className="mb-4">
      <div className="text-[8px] font-black uppercase tracking-[.28em] text-violet-200/45">{de ? 'ONLINE & CLOUD' : 'ONLINE & CLOUD'}</div>
      <div className="mt-1 text-lg font-black">{session ? (profile?.display_name || session.user.email || 'Dungeon Veil') : (de ? 'Konto verbinden' : 'Connect account')}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-white/38">{de ? 'Offline bleibt immer verfügbar. Online-Funktionen werden nur nach Anmeldung genutzt.' : 'Offline play always remains available. Online features are only used after sign-in.'}</div>
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
    </div> : <div className="space-y-4">
      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'PROFIL & CLOUD' : 'PROFILE & CLOUD'}</div>
        <Field value={displayName} onChange={setDisplayName} placeholder={de ? 'Spielername' : 'Player name'} maxLength={24} />
        <div className="grid grid-cols-3 gap-2">
          <ActionButton label={de ? 'Profil speichern' : 'Save profile'} onClick={saveProfile} disabled={busy} />
          <ActionButton label={de ? 'Hochladen' : 'Upload'} onClick={uploadSave} disabled={busy} />
          <ActionButton label={de ? 'Herunterladen' : 'Download'} onClick={downloadSave} disabled={busy} />
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'GILDE' : 'GUILD'}</div>
        {membership ? <div className="rounded-xl border border-amber-300/15 bg-amber-400/[.06] p-3">
          <div className="text-sm font-black text-amber-100">[{membership.guild.tag}] {membership.guild.name}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[.14em] text-white/35">{membership.role}</div>
        </div> : <div className="space-y-2">
          <div className="grid grid-cols-[1fr_90px] gap-2"><Field value={guildName} onChange={setGuildName} placeholder={de ? 'Gildenname' : 'Guild name'} maxLength={32} /><Field value={guildTag} onChange={setGuildTag} placeholder="TAG" maxLength={6} /></div>
          <ActionButton label={de ? 'Gilde gründen' : 'Create guild'} onClick={makeGuild} disabled={busy} />
        </div>}
        {invites.length > 0 && <div className="space-y-2 pt-1">{invites.map(invite => <div key={invite.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 p-2.5"><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold">[{invite.guild.tag}] {invite.guild.name}</div><div className="text-[8px] text-white/30">{de ? 'Gildeneinladung' : 'Guild invitation'}</div></div><ActionButton label="✓" onClick={() => answerInvite(invite.id, true)} disabled={busy} primary /><ActionButton label="×" onClick={() => answerInvite(invite.id, false)} disabled={busy} /></div>)}</div>}
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="text-[8px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'WELTBOSS' : 'WORLD BOSS'}</div>
        {boss ? <div className="mt-2">
          <div className="flex items-center justify-between gap-3"><div className="text-sm font-black">{boss.name}</div><div className="text-[8px] font-black uppercase tracking-[.15em] text-orange-200/60">{boss.status}</div></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/55"><div className="h-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${Math.max(0, Math.min(100, boss.current_hp / boss.max_hp * 100))}%` }} /></div>
          <div className="mt-1.5 text-right text-[9px] text-white/38">{formatNumber(boss.current_hp)} / {formatNumber(boss.max_hp)} HP</div>
        </div> : <div className="mt-2 text-[10px] text-white/32">{de ? 'Aktuell ist kein Weltboss geplant.' : 'No world boss is currently scheduled.'}</div>}
      </section>

      <div className="flex gap-2"><ActionButton label={de ? 'Aktualisieren' : 'Refresh'} onClick={() => run(refreshOnlineData)} disabled={busy} /><ActionButton label={de ? 'Abmelden' : 'Sign out'} onClick={logout} disabled={busy} /></div>
    </div>}
  </div>;
}
