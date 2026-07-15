const RUN_LOADING_STARTED_AT_KEY = 'dungeon-veil-run-loading-started-at';

export const LOADING_TIMING = Object.freeze({
  bootMinimumMs: 1800,
  runEntryMinimumMs: 1350,
  worldBossMinimumMs: 1800,
  roomShowDelayMs: 280,
  roomMinimumVisibleMs: 800,
  recoveryMinimumVisibleMs: 1000,
});

export function waitForMinimum(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

export function markRunLoadingStarted(): void {
  try { sessionStorage.setItem(RUN_LOADING_STARTED_AT_KEY, String(Date.now())); } catch {}
}

export function consumeRunLoadingRemainingMs(): number {
  try {
    const startedAt = Number(sessionStorage.getItem(RUN_LOADING_STARTED_AT_KEY));
    sessionStorage.removeItem(RUN_LOADING_STARTED_AT_KEY);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return LOADING_TIMING.runEntryMinimumMs;
    return Math.max(0, LOADING_TIMING.runEntryMinimumMs - (Date.now() - startedAt));
  } catch {
    return LOADING_TIMING.runEntryMinimumMs;
  }
}
