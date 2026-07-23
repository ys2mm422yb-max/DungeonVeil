let installed = false;
let blockClicksUntil = 0;

export function armMobilePointerSafety(durationMs = 480): void {
  if (typeof performance === 'undefined') return;
  blockClicksUntil = Math.max(blockClicksUntil, performance.now() + Math.max(0, durationMs));
}

export function installMobilePointerSafety(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', event => {
    if (typeof performance === 'undefined' || performance.now() > blockClicksUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
