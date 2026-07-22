let installed = false;

type RoomLifecycleDetail = {
  failed?: boolean;
  floor?: number;
  key?: string;
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
