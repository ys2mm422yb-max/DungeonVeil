import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { remotePresenceIsFresh, type CoopPlayerPresence } from '../game/coopRealtimePresence';
import {
  createCompanionReservationV4,
  normalizeCompanionRosterV4,
  type CompanionReservationV4,
  type CompanionRoleV4,
} from '../game/companionReserveV4';
import { companionRoleForOwnerV4 } from '../game/companionSelectionV4';
import { findKayKitModels, loadKayKitManifest, modelUrl, type KayKitManifest } from './kaykitManifest3D';
import { COMPANION_ACTION_EVENT_V4 } from './CompanionRuntimeBridge';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const ROLE_MODEL: Readonly<Record<CompanionRoleV4, string>> = Object.freeze({
  'single-target': 'Ranger',
  'critical-support': 'Rogue_Hooded',
  shield: 'Knight',
  'loot-comfort': 'Barbarian',
  distraction: 'Mage',
});

const ROLE_COLOR: Readonly<Record<CompanionRoleV4, number>> = Object.freeze({
  'single-target': 0x8ce7ff,
  'critical-support': 0xffd76a,
  shield: 0x79e6a4,
  'loot-comfort': 0xd9b36c,
  distraction: 0xb693ff,
});

type Props = {
  gameState: GameState;
  localRole: CompanionRoleV4;
  remotePlayer?: CoopPlayerPresence | null;
};

type CompanionRig = {
  root: any;
  setMoving: (moving: boolean) => void;
  triggerAction: () => void;
  update: (delta: number) => void;
  stop: () => void;
};

type CompanionBinding = {
  reservation: CompanionReservationV4;
  scene: any;
  rig: CompanionRig;
  ring: any;
  x: number;
  z: number;
  initialized: boolean;
  lastFrame: number;
  lastRemoteAttack: number;
};

let sharedAnimationClipsPromise: Promise<any[]> | null = null;

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseClip(clips: any[], groups: string[][], rejects: string[] = []) {
  for (const terms of groups) {
    const match = clips.find(clip => {
      const key = clipKey(clip);
      return terms.every(term => key.includes(term)) && rejects.every(term => !key.includes(term));
    });
    if (match) return match;
  }
  return null;
}

function prepareModel(root: any) {
  root.traverse((node: any) => {
    if (!node.isMesh && !node.isSkinnedMesh) return;
    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = false;
    if (node.material) {
      node.material = Array.isArray(node.material)
        ? node.material.map((material: any) => material.clone())
        : node.material.clone();
    }
  });
}

function characterPath(manifest: KayKitManifest, role: CompanionRoleV4) {
  const expected = ROLE_MODEL[role].toLowerCase();
  return findKayKitModels(manifest, 'adventurers', /\/characters\/gltf\/.*\.glb$/i)
    .find(path => path.toLowerCase().endsWith(`/${expected}.glb`)) ?? null;
}

function sharedAnimationClips(loader: any, manifest: KayKitManifest) {
  if (!sharedAnimationClipsPromise) {
    const paths = [
      ...findKayKitModels(manifest, 'animations', /rig_medium_general\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_movementbasic\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_combatmelee\.glb$/i),
      ...findKayKitModels(manifest, 'animations', /rig_medium_combatranged\.glb$/i),
    ];
    sharedAnimationClipsPromise = Promise.all(paths.map(path => loader.loadAsync(modelUrl(manifest, path))))
      .then(entries => entries.flatMap(entry => entry.animations ?? []));
  }
  return sharedAnimationClipsPromise;
}

async function loadCompanionRig(THREE: any, GLTFLoaderCtor: any, role: CompanionRoleV4): Promise<CompanionRig> {
  const manifest = await loadKayKitManifest();
  const path = characterPath(manifest, role);
  if (!path) throw new Error(`KayKit companion model missing for ${role}`);
  const loader = new GLTFLoaderCtor();
  const [character, sharedClips] = await Promise.all([
    loader.loadAsync(modelUrl(manifest, path)),
    sharedAnimationClips(loader, manifest),
  ]);
  const visual = character.scene;
  visual.name = `KayKitCompanionVisual_${role}`;
  visual.scale.setScalar(1.18);
  prepareModel(visual);

  const root = new THREE.Group();
  root.name = `KayKitCompanion_${role}`;
  root.userData.dungeonVeilCompanionV4 = true;
  root.userData.companionRole = role;
  root.scale.setScalar(role === 'shield' ? 0.48 : 0.44);
  root.add(visual);

  const clips = [...(character.animations ?? []), ...sharedClips];
  const idleClip = chooseClip(clips, [['idle', 'a'], ['idle']], ['crouch', 'sit', 'sleep', 'aim']);
  const runClip = chooseClip(clips, [['run'], ['jog'], ['walk']], ['back', 'left', 'right', 'crouch']);
  const attackClip = role === 'single-target' || role === 'critical-support'
    ? chooseClip(clips, [['attack', 'bow'], ['attack', 'ranged'], ['attack']], ['death'])
    : chooseClip(clips, [['attack', 'a'], ['attack', 'melee'], ['attack']], ['bow', 'ranged', 'death']);
  const mixer = new THREE.AnimationMixer(visual);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const run = runClip ? mixer.clipAction(runClip) : null;
  const attack = attackClip ? mixer.clipAction(attackClip) : null;
  let current = idle ?? run;
  let moving = false;
  let actionRemaining = 0;
  current?.reset().play();
  if (run) run.timeScale = 1.16;
  if (attack && attackClip) {
    attack.setLoop(THREE.LoopOnce, 1);
    attack.clampWhenFinished = false;
    attack.timeScale = Math.max(0.9, Math.min(2.6, (attackClip.duration ?? 0.5) / 0.42));
  }

  const playBase = () => {
    const next = moving ? run : idle;
    if (!next || next === current) return;
    next.reset().fadeIn(0.08).play();
    current?.fadeOut(0.08);
    current = next;
  };

  return {
    root,
    setMoving(value: boolean) {
      moving = value;
      if (actionRemaining <= 0) playBase();
    },
    triggerAction() {
      if (!attack) return;
      actionRemaining = 0.44;
      current?.fadeOut(0.04);
      attack.reset().fadeIn(0.04).play();
      current = attack;
    },
    update(delta: number) {
      mixer.update(delta);
      if (actionRemaining > 0) {
        actionRemaining = Math.max(0, actionRemaining - delta);
        if (actionRemaining === 0) playBase();
      }
    },
    stop() { mixer.stopAllAction(); },
  };
}

function createRing(THREE: any, role: CompanionRoleV4) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.38, IS_MOBILE ? 20 : 32),
    new THREE.MeshBasicMaterial({
      color: ROLE_COLOR[role],
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  ring.name = `DungeonVeilCompanionRing_${role}`;
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 14;
  return ring;
}

function disposeObject(object: any) {
  object?.traverse?.((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

export function CompanionScene3D({ gameState, localRole, remotePlayer = null }: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let THREE: any = null;
    let GLTFLoaderCtor: any = null;
    let desiredScene: any = null;
    let originalAdd: ((...objects: any[]) => any) | null = null;
    let patchedAdd: ((this: any, ...objects: any[]) => any) | null = null;
    const bindings = new Map<string, CompanionBinding>();
    const loading = new Set<string>();
    let lastVisibleCount = -1;
    let lastLoadedCount = -1;

    const updateMarker = (visibleCount = 0) => {
      const marker = markerRef.current;
      if (!marker) return;
      if (visibleCount !== lastVisibleCount) {
        marker.dataset.visibleCount = String(visibleCount);
        lastVisibleCount = visibleCount;
      }
      if (bindings.size !== lastLoadedCount) {
        marker.dataset.loadedCount = String(bindings.size);
        lastLoadedCount = bindings.size;
      }
      marker.dataset.localRole = localRole;
      marker.dataset.sceneCaptured = desiredScene ? 'true' : 'false';
    };

    const removeBinding = (ownerPlayerId: string) => {
      const binding = bindings.get(ownerPlayerId);
      if (!binding) return;
      binding.rig.stop();
      binding.scene.remove(binding.rig.root, binding.ring);
      disposeObject(binding.rig.root);
      binding.ring.geometry?.dispose?.();
      binding.ring.material?.dispose?.();
      bindings.delete(ownerPlayerId);
      updateMarker();
    };

    const clearBindings = () => {
      for (const ownerId of [...bindings.keys()]) removeBinding(ownerId);
    };

    const captureScene = (candidate: any) => {
      if (!candidate?.isScene || !candidate.getObjectByName?.('KayKitRangerPlayer')) return;
      if (desiredScene === candidate) return;
      desiredScene = candidate;
      clearBindings();
      updateMarker();
    };

    const desiredRoster = () => {
      const remote = remoteRef.current;
      const candidates = [createCompanionReservationV4({
        id: `companion-v4-local-${localRole}`,
        ownerPlayerId: 'player',
        role: localRole,
      })];
      if (remote && remotePresenceIsFresh(remote)) {
        const remoteRole = companionRoleForOwnerV4(remote.userId);
        candidates.push(createCompanionReservationV4({
          id: `companion-v4-remote-${remote.userId}-${remoteRole}`,
          ownerPlayerId: `remote:${remote.userId}`,
          ownerUserId: remote.userId,
          role: remoteRole,
        }));
      }
      return normalizeCompanionRosterV4(candidates, remote ? 'duo' : 'solo');
    };

    const ensureBinding = async (scene: any, reservation: CompanionReservationV4) => {
      const ownerId = reservation.ownerPlayerId;
      if (disposed || loading.has(ownerId) || bindings.has(ownerId) || !THREE || !GLTFLoaderCtor) return;
      loading.add(ownerId);
      try {
        const rig = await loadCompanionRig(THREE, GLTFLoaderCtor, reservation.role);
        const stillWanted = desiredRoster().some(entry => entry.ownerPlayerId === ownerId && entry.role === reservation.role);
        if (disposed || desiredScene !== scene || !stillWanted) {
          rig.stop();
          disposeObject(rig.root);
          return;
        }
        const ring = createRing(THREE, reservation.role);
        rig.root.visible = false;
        ring.visible = false;
        scene.add(rig.root, ring);
        bindings.set(ownerId, {
          reservation,
          scene,
          rig,
          ring,
          x: 0,
          z: 0,
          initialized: false,
          lastFrame: performance.now(),
          lastRemoteAttack: 0,
        });
        updateMarker();
      } catch (error) {
        console.error(`KayKit companion could not be loaded: ${reservation.role}`, error);
      } finally {
        loading.delete(ownerId);
      }
    };

    const syncRoster = () => {
      if (!desiredScene) return;
      const roster = desiredRoster();
      const desiredOwners = new Set(roster.map(entry => entry.ownerPlayerId));
      for (const ownerId of [...bindings.keys()]) {
        const binding = bindings.get(ownerId)!;
        const desired = roster.find(entry => entry.ownerPlayerId === ownerId);
        if (!desiredOwners.has(ownerId) || desired?.role !== binding.reservation.role || binding.scene !== desiredScene) removeBinding(ownerId);
      }
      for (const reservation of roster) void ensureBinding(desiredScene, reservation);
    };

    const updateBinding = (binding: CompanionBinding, now: number) => {
      const state = stateRef.current;
      const remote = remoteRef.current;
      const isRemote = binding.reservation.ownerPlayerId.startsWith('remote:');
      const ownerVisible = isRemote
        ? Boolean(remote && remotePresenceIsFresh(remote) && remote.chapter === state.chapter && remote.room === state.floor && remote.lifeState === 'alive')
        : state.player.hp > 0;
      binding.rig.root.visible = ownerVisible;
      binding.ring.visible = ownerVisible;
      if (!ownerVisible) {
        binding.lastFrame = now;
        return false;
      }

      const delta = Math.min(0.05, Math.max(0, now - binding.lastFrame) / 1000);
      binding.lastFrame = now;
      const ownerX = isRemote && remote ? remote.x : state.player.x + state.player.width / 2;
      const ownerY = isRemote && remote ? remote.y : state.player.y + state.player.height / 2;
      const facingX = isRemote && remote ? remote.facingX : state.player.facing.x;
      const facingY = isRemote && remote ? remote.facingY : state.player.facing.y;
      const side = binding.reservation.role === 'shield' ? -1 : 1;
      const followX = ownerX - facingX * 34 - facingY * 26 * side;
      const followY = ownerY - facingY * 34 + facingX * 26 * side;
      const targetX = followX / TILE - state.map.width / 2 + 0.5;
      const targetZ = followY / TILE - state.map.height / 2 + 0.5;
      if (!binding.initialized) {
        binding.x = targetX;
        binding.z = targetZ;
        binding.initialized = true;
      }
      const previousX = binding.x;
      const previousZ = binding.z;
      const smoothing = 1 - Math.exp(-delta * 9.5);
      binding.x += (targetX - binding.x) * smoothing;
      binding.z += (targetZ - binding.z) * smoothing;
      const movementX = binding.x - previousX;
      const movementZ = binding.z - previousZ;
      const moving = Math.hypot(movementX, movementZ) > 0.0005;
      binding.rig.root.position.set(binding.x, 0.02 + Math.sin(now * 0.004 + binding.reservation.id.length) * 0.025, binding.z);
      binding.rig.root.rotation.y = moving ? Math.atan2(movementX, movementZ) : Math.atan2(facingX, facingY);
      binding.rig.setMoving(moving);
      if (isRemote && remote && remote.lastAttackTime > binding.lastRemoteAttack) {
        binding.lastRemoteAttack = remote.lastAttackTime;
        binding.rig.triggerAction();
      }
      binding.rig.update(delta);
      binding.ring.position.set(binding.x, 0.026, binding.z);
      binding.ring.material.opacity = 0.48 + Math.sin(now * 0.006 + binding.reservation.id.length) * 0.14;
      binding.ring.scale.setScalar(0.94 + Math.sin(now * 0.0045) * 0.07);
      return true;
    };

    const actionHandler = (event: Event) => {
      const ownerId = (event as CustomEvent<{ ownerPlayerId?: string }>).detail?.ownerPlayerId ?? '';
      bindings.get(ownerId)?.rig.triggerAction();
    };

    const tick = (now: number) => {
      if (disposed) return;
      syncRoster();
      let visible = 0;
      for (const binding of bindings.values()) if (updateBinding(binding, now)) visible += 1;
      updateMarker(visible);
      raf = requestAnimationFrame(tick);
    };

    const install = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule = await import(/* @vite-ignore */ GLTF_URL) as any;
      GLTFLoaderCtor = loaderModule.GLTFLoader;
      if (disposed) return;
      originalAdd = THREE.Object3D.prototype.add;
      patchedAdd = function patchedCompanionObjectAdd(this: any, ...objects: any[]) {
        const result = originalAdd!.apply(this, objects);
        captureScene(this);
        return result;
      };
      THREE.Object3D.prototype.add = patchedAdd;
      window.addEventListener(COMPANION_ACTION_EVENT_V4, actionHandler);
      updateMarker(0);
      raf = requestAnimationFrame(tick);
    };

    void install().catch(error => console.error('Companion scene bridge could not start', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener(COMPANION_ACTION_EVENT_V4, actionHandler);
      clearBindings();
      if (THREE && originalAdd && patchedAdd && THREE.Object3D.prototype.add === patchedAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
    };
  }, [localRole]);

  return <span
    ref={markerRef}
    className="hidden"
    aria-hidden="true"
    data-testid="run-companion-scene"
    data-visible-count="0"
    data-loaded-count="0"
    data-local-role={localRole}
    data-scene-captured="false"
    data-scene-hook="object3d-add"
    data-model-source="kaykit-adventurers"
    data-animation-source="kaykit-character-animations"
    data-shared-renderer="true"
    data-extra-canvas="false"
  />;
}
