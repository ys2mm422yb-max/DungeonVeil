import type { OnlineSession, OnlineUser } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const SESSION_KEY = 'dungeon-veil-supabase-session-v1';
const SESSION_EVENT = 'dungeon-veil-online-session';
const POPUP_MESSAGE = 'dungeon-veil-google-oauth-result';

export type GoogleOAuthResult = {
  handled: boolean;
  session: OnlineSession | null;
  error: string | null;
};

type GoogleOAuthMessage = {
  type: typeof POPUP_MESSAGE;
  result: GoogleOAuthResult;
};

function oauthReturnUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

function oauthParameters(): URLSearchParams | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hash.has('access_token') || hash.has('error') || hash.has('error_description')) return hash;

  const search = new URLSearchParams(window.location.search);
  if (search.has('access_token') || search.has('error') || search.has('error_description')) return search;
  return null;
}

function clearOAuthParameters(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = '';
  for (const key of [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'provider_token',
    'provider_refresh_token',
    'error',
    'error_code',
    'error_description',
  ]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  for (const key of ['error_description', 'msg', 'message', 'error']) {
    const value = record[key];
    if (typeof value === 'string' && value) return value;
  }
  return fallback;
}

async function fetchOnlineUser(accessToken: string): Promise<OnlineUser> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await parseJson(response);
  if (!response.ok) throw new Error(messageFromPayload(payload, 'Google-Konto konnte nicht geladen werden.'));
  const user = payload as OnlineUser;
  if (!user?.id) throw new Error('Google-Anmeldung lieferte kein gültiges Benutzerkonto.');
  return user;
}

function saveOAuthSession(session: OnlineSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function sendPopupResult(result: GoogleOAuthResult): void {
  if (typeof window === 'undefined' || !window.opener || window.opener === window) return;
  const message: GoogleOAuthMessage = { type: POPUP_MESSAGE, result };
  window.opener.postMessage(message, window.location.origin);
  window.setTimeout(() => window.close(), 120);
}

async function completeRedirect(): Promise<GoogleOAuthResult> {
  const params = oauthParameters();
  if (!params) return { handled: false, session: null, error: null };

  let result: GoogleOAuthResult;
  try {
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) throw new Error(oauthError);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) throw new Error('Google-Anmeldung wurde ohne vollständige Sitzung beendet.');

    const user = await fetchOnlineUser(accessToken);
    const expiresAt = Number(params.get('expires_at'))
      || Math.floor(Date.now() / 1000) + Math.max(60, Number(params.get('expires_in')) || 3600);

    const session: OnlineSession = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_type: params.get('token_type') || 'bearer',
      user,
    };
    saveOAuthSession(session);
    result = { handled: true, session, error: null };
  } catch (reason) {
    result = {
      handled: true,
      session: null,
      error: reason instanceof Error ? reason.message : String(reason),
    };
  } finally {
    clearOAuthParameters();
  }

  sendPopupResult(result);
  return result;
}

let completionPromise: Promise<GoogleOAuthResult> | null = null;
let resultConsumed = false;

function completion(): Promise<GoogleOAuthResult> {
  completionPromise ??= completeRedirect();
  return completionPromise;
}

export async function consumeGoogleOAuthResult(): Promise<GoogleOAuthResult> {
  const result = await completion();
  if (resultConsumed) return { handled: false, session: result.session, error: null };
  resultConsumed = true;
  return result;
}

function isGoogleOAuthMessage(value: unknown): value is GoogleOAuthMessage {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.type === POPUP_MESSAGE && !!record.result && typeof record.result === 'object';
}

export function signInWithGoogle(): Promise<OnlineSession> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google-Anmeldung ist nur im Browser verfügbar.'));

  const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', oauthReturnUrl());

  const popup = window.open(
    authorizeUrl.toString(),
    'dungeon-veil-google-login',
    'popup=yes,width=520,height=720,resizable=yes,scrollbars=yes',
  );

  if (!popup) {
    window.location.assign(authorizeUrl.toString());
    return new Promise<OnlineSession>(() => undefined);
  }

  return new Promise<OnlineSession>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(closedCheck);
      window.clearTimeout(timeout);
      callback();
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || !isGoogleOAuthMessage(event.data)) return;
      const { result } = event.data;
      if (result.session) {
        saveOAuthSession(result.session);
        finish(() => resolve(result.session as OnlineSession));
        return;
      }
      finish(() => reject(new Error(result.error || 'Google-Anmeldung wurde abgebrochen.')));
    };

    window.addEventListener('message', onMessage);

    const closedCheck = window.setInterval(() => {
      if (!popup.closed) return;
      finish(() => reject(new Error('Google-Anmeldung wurde geschlossen, bevor sie abgeschlossen war.')));
    }, 500);

    const timeout = window.setTimeout(() => {
      try { popup.close(); } catch { /* ignore */ }
      finish(() => reject(new Error('Google-Anmeldung hat zu lange gedauert.')));
    }, 120_000);
  });
}

if (typeof window !== 'undefined') void completion();
