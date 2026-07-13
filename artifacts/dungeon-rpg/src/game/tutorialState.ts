const TUTORIAL_COMPLETED_KEY = 'dungeon-veil-tutorial-completed-v1';
const TUTORIAL_REPLAY_KEY = 'dungeon-veil-tutorial-replay-v1';

function read(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; }
  catch { return false; }
}

function write(key: string, active: boolean): void {
  try {
    if (active) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {}
}

export function shouldShowTutorial(): boolean {
  return read(TUTORIAL_REPLAY_KEY) || !read(TUTORIAL_COMPLETED_KEY);
}

export function requestTutorialReplay(): void {
  write(TUTORIAL_REPLAY_KEY, true);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-tutorial-requested'));
}

export function completeTutorial(): void {
  write(TUTORIAL_COMPLETED_KEY, true);
  write(TUTORIAL_REPLAY_KEY, false);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dungeon-veil-tutorial-completed'));
}

export function resetTutorialProgress(): void {
  write(TUTORIAL_COMPLETED_KEY, false);
  write(TUTORIAL_REPLAY_KEY, false);
}
