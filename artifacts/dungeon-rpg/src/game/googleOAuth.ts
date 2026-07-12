import type { OnlineSession, OnlineUser } from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');
const SESSION_KEY = 'dungeon-veil-supabase-session-v1';
const SESSION_EVENT = 'dungeon-veil-online-session';

export type GoogleOAuthResult = {
  handled: boolean;
  session: OnlineSession | null;
  error: string | null;
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

async function completeRedirect(): Promise<GoogleOAuthResult> {
  const params = oauthParameters();
  if (!params) return { handled: false, session: null, error: null };

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
    return { handled: true, session, error: null };
  } catch (reason) {
    return {
      handled: true,
      session: null,
      error: reason instanceof Error ? reason.message : String(reason),
    };
  } finally {
    clearOAuthParameters();
  }
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

export function signInWithGoogle(): void {
  if (typeof window === 'undefined') throw new Error('Google-Anmeldung ist nur im Browser verfügbar.');
  const redirectTo = oauthReturnUrl();
  const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', redirectTo);
  window.location.assign(authorizeUrl.toString());
}

if (typeof window !== 'undefined') void completion();
