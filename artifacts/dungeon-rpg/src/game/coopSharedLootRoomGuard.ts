import { GameEngine } from './runEngine';

type RoomTransitionPrototype = {
  nextRoom: (this: GameEngine) => void;
};

let installed = false;

export function installCoopSharedLootRoomGuard(): void {
  if (installed) return;
  installed = true;
  const prototype = GameEngine.prototype as unknown as RoomTransitionPrototype;
  const originalNextRoom = prototype.nextRoom;
  if (typeof originalNextRoom !== 'function') return;

  prototype.nextRoom = function guardedNextRoom(this: GameEngine): void {
    if (typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilCoopLootPending === '1') {
      this.state.exitHintUntil = performance.now() + 900;
      return;
    }
    originalNextRoom.call(this);
  };
}
