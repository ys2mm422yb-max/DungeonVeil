const DEFAULT_SUPABASE_URL = 'https://hfndwqfghyomwapqsked.supabase.co';
const PATCH_MARKER = '__dungeonVeilEmailRedirectPatched';

type PatchedFetch = typeof window.fetch & {
  [PATCH_MARKER]?: boolean;
};

function appReturnUrl(): string {
  const basePath = String(import.meta.env.BASE_URL || '/');
  return new URL(basePath, window.location.origin).toString();
}

function supabaseOrigin(): string {
  const configuredUrl = String(import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL);
  return new URL(configuredUrl).origin;
}

/**
 * The project uses the GoTrue REST endpoint directly instead of supabase-js.
 * GoTrue otherwise falls back to the project's Site URL for confirmation mail.
 * This narrowly patches only the signup request so confirmation always returns
 * to the deployed Vite base path (for production: /DungeonVeil/).
 */
export function installEmailConfirmationRedirect(): void {
  if (typeof window === 'undefined') return;

  const activeFetch = window.fetch as PatchedFetch;
  if (activeFetch[PATCH_MARKER]) return;

  const originalFetch = activeFetch.bind(window);
  const patchedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    let nextInput = input;

    try {
      const inputUrl = input instanceof Request ? input.url : input.toString();
      const url = new URL(inputUrl, window.location.href);

      if (url.origin === supabaseOrigin() && url.pathname === '/auth/v1/signup') {
        url.searchParams.set('redirect_to', appReturnUrl());
        nextInput = input instanceof Request
          ? new Request(url.toString(), input)
          : url.toString();
      }
    } catch {
      // Preserve the original request unchanged if URL parsing is impossible.
    }

    return originalFetch(nextInput, init);
  }) as PatchedFetch;

  patchedFetch[PATCH_MARKER] = true;
  window.fetch = patchedFetch;
}
