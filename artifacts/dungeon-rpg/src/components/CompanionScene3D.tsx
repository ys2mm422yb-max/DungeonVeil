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
import { COMPANION_ACTION_EVENT_V4 } from './CompanionRuntimeBridge';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const TILE = 40;
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

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

type VeilWolfRig = {
  root: any;
  triggerAction: () => void;
  update: (now: number, moving: boolean) => void;
  dispose: () => void;
};

type CompanionBinding = {
  reservation: CompanionReservationV4;
  scene: any;
  rig: VeilWolfRig;
  x: number;
  z: number;
  initialized: boolean;
  lastFrame: number;
  lastRemoteAttack: number;
};

function createVeilWolfRig(THREE: any, role: CompanionRoleV4): VeilWolfRig {
  const roleColor = ROLE_COLOR[role];
  const root = new THREE.Group();
  root.name = `VeilWolfCompanion_${role}`;
  root.userData.dungeonVeilCompanionV4 = true;
  root.userData.companionSpecies = 'veil-wolf';
  root.userData.companionRole = role;
  root.scale.setScalar(IS_MOBILE ? 0.64 : 0.7);

  const visual = new THREE.Group();
  visual.name = 'VeilWolfVisual';
  root.add(visual);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x24202f,
    emissive: 0x24123d,
    emissiveIntensity: 0.48,
    roughness: 0.66,
    metalness: 0.06,
  });
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x090a10,
    emissive: 0x0f0818,
    emissiveIntensity: 0.2,
    roughness: 0.86,
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xe4d2ff });
  const roleMaterial = new THREE.MeshStandardMaterial({
    color: roleColor,
    emissive: roleColor,
    emissiveIntensity: 1.25,
    roughness: 0.28,
  });
  const auraMaterial = new THREE.MeshBasicMaterial({
    color: roleColor,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const bodyGeometry = new THREE.SphereGeometry(0.5, IS_MOBILE ? 10 : 14, IS_MOBILE ? 8 : 10);
  const smallSphereGeometry = new THREE.SphereGeometry(0.18, IS_MOBILE ? 8 : 10, IS_MOBILE ? 6 : 8);
  const legGeometry = new THREE.CylinderGeometry(0.11, 0.14, 0.76, IS_MOBILE ? 7 : 9);
  const earGeometry = new THREE.ConeGeometry(0.2, 0.5, IS_MOBILE ? 6 : 8);
  const tailGeometry = new THREE.CylinderGeometry(0.09, 0.18, 1.12, IS_MOBILE ? 7 : 9);

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.name = 'VeilWolfBody';
  body.scale.set(1.34, 0.62, 0.62);
  body.position.set(0, 0.92, 0);
  visual.add(body);

  const chest = new THREE.Mesh(bodyGeometry, shadowMaterial);
  chest.name = 'VeilWolfChest';
  chest.scale.set(0.68, 0.82, 0.61);
  chest.position.set(0.34, 1, 0);
  visual.add(chest);

  const headPivot = new THREE.Group();
  headPivot.name = 'VeilWolfHeadPivot';
  headPivot.position.set(0.68, 1.4, 0);
  visual.add(headPivot);

  const head = new THREE.Mesh(bodyGeometry, bodyMaterial);
  head.name = 'VeilWolfHead';
  head.scale.set(0.7, 0.67, 0.64);
  headPivot.add(head);

  const muzzle = new THREE.Mesh(smallSphereGeometry, shadowMaterial);
  muzzle.name = 'VeilWolfMuzzle';
  muzzle.scale.set(1.25, 0.72, 0.86);
  muzzle.position.set(0.35, -0.08, 0);
  headPivot.add(muzzle);

  for (const side of [-1, 1]) {
    const z = side * 0.22;
    const ear = new THREE.Mesh(earGeometry, bodyMaterial);
    ear.position.set(-0.08, 0.48, z);
    ear.rotation.z = side * 0.12;
    headPivot.add(ear);

    const eye = new THREE.Mesh(smallSphereGeometry, eyeMaterial);
    eye.scale.setScalar(0.22);
    eye.position.set(0.31, 0.09, z * 1.2);
    headPivot.add(eye);
  }

  const legPositions: Array<[number, number]> = [[0.4, -0.28], [0.4, 0.28], [-0.47, -0.28], [-0.47, 0.28]];
  for (const [x, z] of legPositions) {
    const leg = new THREE.Mesh(legGeometry, shadowMaterial);
    leg.position.set(x, 0.43, z);
    visual.add(leg);
    const paw = new THREE.Mesh(smallSphereGeometry, bodyMaterial);
    paw.scale.set(0.74, 0.36, 0.86);
    paw.position.set(x + 0.05, 0.08, z);
    visual.add(paw);
  }

  const tailPivot = new THREE.Group();
  tailPivot.name = 'VeilWolfTailPivot';
  tailPivot.position.set(-0.7, 1.06, 0);
  tailPivot.rotation.z = -1.04;
  visual.add(tailPivot);
  const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
  tail.position.y = 0.46;
  tail.rotation.z = -0.16;
  tailPivot.add(tail);

  const aura = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.05, IS_MOBILE ? 24 : 36), auraMaterial);
  aura.name = 'VeilWolfRoleAura';
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.025;
  root.add(aura);

  const roleCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), roleMaterial);
  roleCrystal.name = 'VeilWolfRoleCrystal';
  roleCrystal.position.set(0.08, 1.48, -0.48);
  visual.add(roleCrystal);

  let actionStartedAt = 0;
  let actionEndsAt = 0;

  return {
    root,
    triggerAction() {
      actionStartedAt = performance.now();
      actionEndsAt = actionStartedAt + 360;
    },
    update(now: number, moving: boolean) {
      const breath = Math.sin(now * 0.0021);
      const stride = moving ? Math.sin(now * 0.012) : 0;
      const actionProgress = actionEndsAt > now ? Math.min(1, Math.max(0, (now - actionStartedAt) / 360)) : 1;
      const lunge = actionEndsAt > now ? Math.sin(actionProgress * Math.PI) * 0.24 : 0;
      visual.position.set(0, 0.16 + breath * 0.025 + Math.abs(stride) * 0.025, -lunge);
      body.scale.y = 0.62 + breath * 0.012;
      headPivot.rotation.z = Math.sin(now * 0.00125) * 0.035 + stride * 0.025;
      tailPivot.rotation.z = -1.04 + Math.sin(now * (moving ? 0.006 : 0.0032)) * (moving ? 0.26 : 0.18);
      auraMaterial.opacity = 0.24 + Math.sin(now * 0.0024) * 0.08;
      aura.scale.setScalar(0.96 + Math.sin(now * 0.0045) * 0.06);
      roleCrystal.rotation.y = now * 0.001;
    },
    dispose() {
      const geometries = new Set<any>();
      const materials = new Set<any>();
      root.traverse((node: any) => {
        if (node.geometry && !geometries.has(node.geometry)) {
          geometries.add(node.geometry);
          node.geometry.dispose?.();
        }
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.filter(Boolean).forEach((material: any) => {
          if (materials.has(material)) return;
          materials.add(material);
          material.dispose?.();
        });
      });
    },
  };
}

export function CompanionScene3D({ gameState, localRole, remotePlayer = null }: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  const localRoleRef = useRef(localRole);
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;
  localRoleRef.current = localRole;

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let THREE: any = null;
    let desiredScene: any = null;
    let originalAdd: ((...objects: any[]) => any) | null = null;
    let patchedAdd: ((this: any, ...objects: any[]) => any) | null = null;
    const bindings = new Map<string, CompanionBinding>();
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
      marker.dataset.localRole = localRoleRef.current;
      marker.dataset.sceneCaptured = desiredScene ? 'true' : 'false';
    };

    const removeBinding = (ownerPlayerId: string) => {
      const binding = bindings.get(ownerPlayerId);
      if (!binding) return;
      binding.scene.remove(binding.rig.root);
      binding.rig.dispose();
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
      const activeLocalRole = localRoleRef.current;
      const candidates = [createCompanionReservationV4({
        id: `companion-v4-local-${activeLocalRole}`,
        ownerPlayerId: 'player',
        role: activeLocalRole,
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

    const ensureBinding = (scene: any, reservation: CompanionReservationV4) => {
      const ownerId = reservation.ownerPlayerId;
      if (disposed || bindings.has(ownerId) || !THREE) return;
      const rig = createVeilWolfRig(THREE, reservation.role);
      rig.root.visible = false;
      scene.add(rig.root);
      bindings.set(ownerId, {
        reservation,
        scene,
        rig,
        x: 0,
        z: 0,
        initialized: false,
        lastFrame: performance.now(),
        lastRemoteAttack: 0,
      });
      updateMarker();
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
      for (const reservation of roster) ensureBinding(desiredScene, reservation);
    };

    const updateBinding = (binding: CompanionBinding, now: number) => {
      const state = stateRef.current;
      const remote = remoteRef.current;
      const isRemote = binding.reservation.ownerPlayerId.startsWith('remote:');
      const ownerVisible = isRemote
        ? Boolean(remote && remotePresenceIsFresh(remote) && remote.chapter === state.chapter && remote.room === state.floor && remote.lifeState === 'alive')
        : state.player.hp > 0;
      binding.rig.root.visible = ownerVisible;
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
      const side = isRemote ? -1 : 1;
      const followX = ownerX - facingX * 42 - facingY * 34 * side;
      const followY = ownerY - facingY * 42 + facingX * 34 * side;
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
      binding.rig.root.position.set(binding.x, 0.02, binding.z);
      binding.rig.root.rotation.y = moving ? Math.atan2(movementX, movementZ) : Math.atan2(facingX, facingY);
      if (isRemote && remote && remote.lastAttackTime > binding.lastRemoteAttack) {
        binding.lastRemoteAttack = remote.lastAttackTime;
        binding.rig.triggerAction();
      }
      binding.rig.update(now, moving);
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

    void install().catch(error => console.error('Veil Wolf scene bridge could not start', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener(COMPANION_ACTION_EVENT_V4, actionHandler);
      clearBindings();
      if (THREE && originalAdd && patchedAdd && THREE.Object3D.prototype.add === patchedAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
    };
  }, []);

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
    data-model-source="procedural-veil-wolf"
    data-animation-source="procedural-wolf-motion"
    data-companion-species="veil-wolf"
    data-shared-renderer="true"
    data-extra-canvas="false"
  />;
}
