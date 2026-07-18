import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { remotePresenceIsFresh, type CoopPlayerPresence } from '../game/coopRealtimePresence';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;

type Props = {
  gameState: GameState;
  remotePlayer: CoopPlayerPresence;
};

type SceneBinding = {
  scene: any;
  rig: KayKitPlayerRig;
  ring: any;
  x: number;
  z: number;
  initialized: boolean;
  lastAttack: number;
  lastDodge: number;
  lastFrame: number;
};

/**
 * Adds the teammate to the already active run scene. This deliberately reuses
 * the existing WebGL renderer instead of creating a competing second canvas.
 */
export function CoopTeammateScene3D({ gameState, remotePlayer }: Props) {
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let THREE: any = null;
    let GLTFLoaderCtor: any = null;
    let originalAdd: ((...objects: any[]) => any) | null = null;
    let patchedAdd: ((this: any, ...objects: any[]) => any) | null = null;
    let binding: SceneBinding | null = null;
    let loading = false;
    let desiredScene: any = null;

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const removeBinding = () => {
      if (!binding) return;
      binding.rig.stop();
      binding.scene.remove(binding.rig.root);
      binding.scene.remove(binding.ring);
      disposeObject(binding.rig.root);
      binding.ring.geometry?.dispose?.();
      binding.ring.material?.dispose?.();
      binding = null;
    };

    const createRing = () => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.48, 0.62, 32),
        new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false,
        }),
      );
      ring.name = 'DungeonVeilCoopTeammateRing';
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 14;
      return ring;
    };

    const ensureBinding = async (scene: any) => {
      if (loading || binding || !THREE || !GLTFLoaderCtor) return;
      loading = true;
      const requestedScene = scene;
      try {
        const rig = await loadKayKitRanger(THREE, GLTFLoaderCtor);
        if (disposed || desiredScene !== requestedScene) {
          rig.stop();
          disposeObject(rig.root);
          return;
        }
        rig.root.name = 'KayKitCoopTeammate';
        rig.root.userData.dungeonVeilCoopRemote = true;
        rig.root.scale.setScalar(0.96);
        rig.root.visible = false;
        const ring = createRing();
        ring.visible = false;
        originalAdd!.call(requestedScene, rig.root, ring);
        binding = {
          scene: requestedScene,
          rig,
          ring,
          x: 0,
          z: 0,
          initialized: false,
          lastAttack: 0,
          lastDodge: 0,
          lastFrame: performance.now(),
        };
      } catch (error) {
        console.error('KayKit coop teammate could not be loaded', error);
      } finally {
        loading = false;
      }
    };

    const captureRunScene = (scene: any) => {
      if (!scene?.isScene || !scene.getObjectByName?.('KayKitRangerPlayer')) return;
      if (desiredScene !== scene) {
        desiredScene = scene;
        if (binding && binding.scene !== scene) removeBinding();
      }
      if (!binding) void ensureBinding(scene);
    };

    const updateBinding = (now: number) => {
      if (!binding) return;
      const state = stateRef.current;
      const remote = remoteRef.current;
      const visible = remotePresenceIsFresh(remote)
        && remote.chapter === state.chapter
        && remote.room === state.floor;
      binding.rig.root.visible = visible;
      binding.ring.visible = visible;
      if (!visible) {
        binding.lastFrame = now;
        return;
      }

      const delta = Math.min(0.05, Math.max(0, now - binding.lastFrame) / 1000);
      binding.lastFrame = now;
      const targetX = remote.x / TILE - state.map.width / 2 + 0.5;
      const targetZ = remote.y / TILE - state.map.height / 2 + 0.5;
      if (!binding.initialized) {
        binding.x = targetX;
        binding.z = targetZ;
        binding.initialized = true;
      } else {
        const smoothing = 1 - Math.exp(-delta * 12);
        binding.x += (targetX - binding.x) * smoothing;
        binding.z += (targetZ - binding.z) * smoothing;
      }

      const alive = remote.lifeState === 'alive';
      const tiltTarget = alive ? 0 : remote.lifeState === 'downed' ? -Math.PI * 0.42 : -Math.PI * 0.5;
      binding.rig.root.position.set(binding.x, alive ? 0 : 0.16, binding.z);
      binding.rig.root.rotation.y = Math.atan2(remote.facingX, remote.facingY);
      binding.rig.root.rotation.z += (tiltTarget - binding.rig.root.rotation.z) * Math.min(1, delta * 12);
      binding.rig.setMoving(alive && remote.state === 'moving');
      binding.rig.setMotionSpeed(1, 1);
      if (alive && remote.lastAttackTime > binding.lastAttack) {
        binding.lastAttack = remote.lastAttackTime;
        binding.rig.triggerAttack();
      }
      if (alive && remote.lastDodgeTime > binding.lastDodge) {
        binding.lastDodge = remote.lastDodgeTime;
        binding.rig.triggerDash();
      }
      binding.rig.update(delta);

      binding.ring.position.set(binding.x, 0.025, binding.z);
      binding.ring.material.color.setHex(alive ? 0x67e8f9 : remote.lifeState === 'downed' ? 0xf87171 : 0x94a3b8);
      binding.ring.material.opacity = alive
        ? 0.52 + Math.sin(now * 0.005) * 0.12
        : remote.lifeState === 'downed'
          ? 0.68 + Math.sin(now * 0.009) * 0.2
          : 0.4;
      binding.ring.scale.setScalar(alive ? 1 : 1.08);
    };

    const tick = (now: number) => {
      if (disposed) return;
      updateBinding(now);
      raf = requestAnimationFrame(tick);
    };

    const install = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule = await import(/* @vite-ignore */ GLTF_URL) as any;
      GLTFLoaderCtor = loaderModule.GLTFLoader;
      if (disposed) return;

      originalAdd = THREE.Object3D.prototype.add;
      patchedAdd = function patchedCoopSceneAdd(this: any, ...objects: any[]) {
        const result = originalAdd!.apply(this, objects);
        if (this?.isScene && (objects.some(object => object?.name === 'KayKitRangerPlayer') || this.getObjectByName?.('KayKitRangerPlayer'))) {
          captureRunScene(this);
        }
        return result;
      };
      THREE.Object3D.prototype.add = patchedAdd;
      raf = requestAnimationFrame(tick);
    };

    void install().catch(error => console.error('Coop teammate scene bridge could not start', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeBinding();
      if (THREE && originalAdd && patchedAdd && THREE.Object3D.prototype.add === patchedAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
    };
  }, []);

  return <span data-testid="coop-remote-three-scene" className="hidden" aria-hidden="true" />;
}
