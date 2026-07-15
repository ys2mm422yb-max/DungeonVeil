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
