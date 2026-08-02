let installed = false;

type RoomLifecycleDetail = {
  failed?: boolean;
  floor?: number;
  key?: string;
  recovered?: boolean;
};

export function installRoomReadyFailureGuard(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('dungeon-veil-room-preparing', event => {
    const detail = (event as CustomEvent<RoomLifecycleDetail>).detail;
    document.documentElement.dataset.dungeonVeilRoomBuildState = 'preparing';
    document.documentElement.dataset.dungeonVeilRoomBuildFloor = String(detail?.floor ?? '');
  });

  window.addEventListener('dungeon-veil-room-ready', event => {
    const detail = (event as CustomEvent<RoomLifecycleDetail>).detail;
    const rendererRecovering = document.documentElement.dataset.dungeonVeilRendererState === 'recovering';
    if (rendererRecovering && !detail?.recovered) {
      // A room build that was already in flight can finish after WebGL recovery
      // has begun. That stale normal ready event must not reach Game's lifecycle
      // listener and resume the simulation. Only the explicit recovery-ready
      // event is allowed to release the freeze.
      event.stopImmediatePropagation();
      document.documentElement.dataset.dungeonVeilRoomBuildState = 'recovering';
      document.documentElement.dataset.dungeonVeilRoomBuildFloor = String(detail?.floor ?? '');
      return;
    }
    if (!detail?.failed) return;
    // GameCanvasKayKit3D retains the previous room and automatically retries the
    // requested build. A failed attempt must never resume combat or dismiss the
    // transition veil before a later successful atomic room-ready event arrives.
    event.stopImmediatePropagation();
    document.documentElement.dataset.dungeonVeilRoomBuildState = 'retrying';
    document.documentElement.dataset.dungeonVeilRoomBuildFloor = String(detail.floor ?? '');
  });

  window.addEventListener('dungeon-veil-room-ready', event => {
    const detail = (event as CustomEvent<RoomLifecycleDetail>).detail;
    if (detail?.failed) return;
    document.documentElement.dataset.dungeonVeilRoomBuildState = 'ready';
    document.documentElement.dataset.dungeonVeilRoomBuildFloor = String(detail?.floor ?? '');
  });
}
