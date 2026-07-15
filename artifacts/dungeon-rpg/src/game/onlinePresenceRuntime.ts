import { FRIENDS_EVENT } from './friendOnline';
import {
  ONLINE_PRESENCE_POLL_MS,
  ONLINE_PRESENCE_REFRESH_EVENT,
  ONLINE_PRESENCE_TICK_EVENT,
  ONLINE_PRESENCE_TICK_MS,
  publishOnlinePresence,
} from './onlinePresence';

function emit(name: string): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
}

async function refreshPresence(): Promise<void> {
  try { await publishOnlinePresence(); } catch {}
  emit(ONLINE_PRESENCE_REFRESH_EVENT);
  emit(FRIENDS_EVENT);
}

if (typeof window !== 'undefined') {
  void refreshPresence();
  window.setInterval(() => emit(ONLINE_PRESENCE_TICK_EVENT), ONLINE_PRESENCE_TICK_MS);
  window.setInterval(() => { void refreshPresence(); }, ONLINE_PRESENCE_POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshPresence();
  });
}
