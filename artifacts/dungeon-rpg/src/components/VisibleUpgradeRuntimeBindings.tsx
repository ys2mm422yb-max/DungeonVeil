import { useEffect } from 'react';
import { COMPANION_DEFINITIONS_V5 } from '../game/companionCollectionV5';
import { loadMetaProgression } from '../game/metaProgression';
import {
  createVisibleUpgradePrestige3D,
  type VisibleUpgradePrestigeBinding3D,
  type VisibleUpgradePrestigeSlot,
} from './visibleUpgradePrestige3D';

const localRuntimeUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const THREE_URLS = [
  localRuntimeUrl('assets/vendor/three/build/three.module.js'),
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
];

type RuntimeBinding = {
  object: any;
  slot: VisibleUpgradePrestigeSlot;
  binding: VisibleUpgradePrestigeBinding3D;
  lastAttackSignal: number;
  attackPulseUntil: number;
};

type CaptureContext = {
  THREE: any;
  originalAdd: (...objects: any[]) => any;
  patchedAdd: (this: any, ...objects: any[]) => any;
};

function equippedLevel(slot: 'bow' | 'quiver' | 'armor') {
  const meta = loadMetaProgression();
  const id = meta.equipped[slot];
  return Number(meta.owned[id]?.level ?? 1);
}

function bindingDescriptor(node: any): { slot: VisibleUpgradePrestigeSlot; level: number; binding: string; accentHex?: number } | null {
  const runtimeBinding = String(node?.userData?.dungeonVeilUpgradeBinding ?? '');
  if (runtimeBinding === 'in-run-player-bow-mesh') {
    return { slot: 'bow', level: equippedLevel('bow'), binding: 'visible:player-bow' };
  }
  if (runtimeBinding === 'in-run-player-quiver-mesh') {
    return { slot: 'quiver', level: equippedLevel('quiver'), binding: 'visible:player-quiver' };
  }
  if (String(node?.name ?? '').startsWith('DungeonVeilEquippedQuiver_')) {
    return { slot: 'quiver', level: equippedLevel('quiver'), binding: 'visible:player-quiver' };
  }
  if (String(node?.name ?? '').startsWith('KayKitPlayerBody_')) {
    return { slot: 'armor', level: equippedLevel('armor'), binding: 'visible:player-armor' };
  }
  return null;
}

export function VisibleUpgradeRuntimeBindings() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let nextScanAt = 0;
    const candidates = new Map<any, any>();
    const bindings = new Map<any, RuntimeBinding>();
    const contexts: CaptureContext[] = [];

    const publishTelemetry = () => {
      const data = document.documentElement.dataset;
      const slots = [...new Set([...bindings.values()].map(entry => entry.slot))].sort();
      data.dungeonVeilVisibleUpgradeBindingCount = String(bindings.size);
      data.dungeonVeilVisibleUpgradeSlots = slots.join(',');
      for (const slot of ['bow', 'quiver', 'armor', 'companion'] as const) {
        const entry = [...bindings.values()].find(candidate => candidate.slot === slot);
        const key = `dungeonVeilVisibleUpgrade${slot[0].toUpperCase()}${slot.slice(1)}Tier`;
        if (entry) data[key] = String(entry.binding.tier);
        else delete data[key];
      }
    };

    const clearTelemetry = () => {
      const data = document.documentElement.dataset;
      delete data.dungeonVeilVisibleUpgradeBindingCount;
      delete data.dungeonVeilVisibleUpgradeSlots;
      delete data.dungeonVeilVisibleUpgradeBowTier;
      delete data.dungeonVeilVisibleUpgradeQuiverTier;
      delete data.dungeonVeilVisibleUpgradeArmorTier;
      delete data.dungeonVeilVisibleUpgradeCompanionTier;
    };

    const remember = (THREE: any, object: any) => {
      if (!object || typeof object !== 'object') return;
      candidates.set(object, THREE);
      if (object.parent) candidates.set(object.parent, THREE);
    };

    const bindObject = (THREE: any, object: any) => {
      if (!object || bindings.has(object) || object.userData?.dungeonVeilVisibleUpgradeBinding) return;
      const descriptor = bindingDescriptor(object);
      if (!descriptor || descriptor.level < 3) return;
      const binding = createVisibleUpgradePrestige3D(THREE, object, descriptor);
      bindings.set(object, {
        object,
        slot: descriptor.slot,
        binding,
        lastAttackSignal: Number(object.userData?.rangerAttackSignal ?? 0),
        attackPulseUntil: 0,
      });
      publishTelemetry();
    };

    const bindCompanionRoot = (THREE: any, root: any) => {
      if (!root?.userData?.dungeonVeilCompanionV5) return;
      const role = String(root.userData.companionRole ?? '') as keyof typeof COMPANION_DEFINITIONS_V5;
      const definition = COMPANION_DEFINITIONS_V5[role];
      const level = Number(root.userData.companionLevel ?? 1);
      if (!definition || level < 3) return;
      const visual = root.children?.find((child: any) => String(child?.name ?? '').startsWith('CompanionVisual_'));
      if (!visual || bindings.has(visual) || visual.userData?.dungeonVeilVisibleUpgradeBinding) return;
      const binding = createVisibleUpgradePrestige3D(THREE, visual, {
        slot: 'companion',
        level,
        binding: `visible:companion:${role}`,
        accentHex: definition.accentHex,
      });
      bindings.set(visual, { object: visual, slot: 'companion', binding, lastAttackSignal: 0, attackPulseUntil: 0 });
      publishTelemetry();
    };

    const scanCandidate = (THREE: any, candidate: any) => {
      bindObject(THREE, candidate);
      bindCompanionRoot(THREE, candidate);
      candidate.traverse?.((node: any) => {
        bindObject(THREE, node);
        bindCompanionRoot(THREE, node);
      });
    };

    const installCapture = async (url: string) => {
      const THREE = await import(/* @vite-ignore */ url);
      if (disposed) return;
      const prototype = THREE.Object3D?.prototype;
      const originalAdd = prototype?.add;
      if (!prototype || typeof originalAdd !== 'function') return;
      const patchedAdd = function visiblePrestigeCapture(this: any, ...objects: any[]) {
        const result = originalAdd.apply(this, objects);
        remember(THREE, this);
        objects.forEach(object => remember(THREE, object));
        return result;
      };
      prototype.add = patchedAdd;
      contexts.push({ THREE, originalAdd, patchedAdd });
    };

    const update = (now: number) => {
      if (disposed) return;
      if (now >= nextScanAt) {
        nextScanAt = now + 250;
        for (const [candidate, THREE] of candidates) scanCandidate(THREE, candidate);
        publishTelemetry();
      }

      for (const [object, entry] of bindings) {
        if (!object.parent && !String(object.name ?? '').startsWith('KayKitPlayerBody_')) {
          entry.binding.dispose();
          bindings.delete(object);
          publishTelemetry();
          continue;
        }
        const attackSignal = Number(object.userData?.rangerAttackSignal ?? 0);
        if (attackSignal > entry.lastAttackSignal) {
          entry.lastAttackSignal = attackSignal;
          entry.attackPulseUntil = now + 420;
        }
        const activityPulse = entry.attackPulseUntil > now
          ? Math.sin(Math.max(0, Math.min(1, 1 - (entry.attackPulseUntil - now) / 420)) * Math.PI)
          : 0;
        entry.binding.update(activityPulse);
      }
      frame = window.requestAnimationFrame(update);
    };

    const rescan = () => {
      nextScanAt = 0;
    };

    Promise.allSettled(THREE_URLS.map(installCapture)).then(() => {
      if (!disposed) frame = window.requestAnimationFrame(update);
    });
    window.addEventListener('dungeon-veil-renderer-ready', rescan);
    window.addEventListener('dungeon-veil-run-active-changed', rescan);
    window.addEventListener('dungeon-veil-meta-changed', rescan);
    window.addEventListener('dungeon-veil-cloud-save-restored', rescan);

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('dungeon-veil-renderer-ready', rescan);
      window.removeEventListener('dungeon-veil-run-active-changed', rescan);
      window.removeEventListener('dungeon-veil-meta-changed', rescan);
      window.removeEventListener('dungeon-veil-cloud-save-restored', rescan);
      bindings.forEach(entry => entry.binding.dispose());
      bindings.clear();
      clearTelemetry();
      for (const context of contexts) {
        const prototype = context.THREE.Object3D?.prototype;
        if (prototype?.add === context.patchedAdd) prototype.add = context.originalAdd;
      }
      contexts.length = 0;
      candidates.clear();
    };
  }, []);

  return null;
}
