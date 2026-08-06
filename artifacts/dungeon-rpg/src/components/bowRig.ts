import { loadMetaProgression } from '../game/metaProgression';
import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';
import { attachEquipmentUpgradePrestige3D, type EquipmentUpgradeBinding3D } from './equipmentUpgradePrestige3D';
import { createVisibleUpgradePrestige3D, type VisibleUpgradePrestigeBinding3D } from './visibleUpgradePrestige3D';

export type BowRig = {
  bow: any;
  anchor: any;
  basePosition: any;
  baseRotation: any;
  updateShotPose: (pulse: number) => void;
  dispose: () => void;
};

type UpgradeBinding = {
  update: (activityPulse: number) => void;
  dispose: () => void;
};

const normalizeName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const emptyUpgradeBinding = (): UpgradeBinding => ({
  update: (_activityPulse: number) => undefined,
  dispose: () => undefined,
});

function scoreLeftHand(name: string) {
  if (name === 'handslotl' || name.endsWith('handslotl')) return 140;
  if (name.includes('handslotl') || name.includes('lefthandslot')) return 130;
  if (name === 'lefthand' || name.endsWith('lefthand')) return 100;
  if (name.includes('lefthand')) return 90;
  if (name.includes('handl') || name.endsWith('lhand')) return 80;
  if (name.includes('leftwrist') || name.includes('wristl')) return 60;
  return 0;
}

function authoredBowAxisCorrection(THREE: any, bow: any) {
  bow.position.set(0, 0, 0);
  bow.rotation.set(0, 0, 0);
  bow.scale.set(1, 1, 1);
  bow.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(bow);
  const size = bounds.getSize(new THREE.Vector3());
  const names: string[] = [];
  bow.traverse?.((node: any) => names.push(normalizeName(node.name)));
  const key = names.join('|');

  const alreadyNormalized = bow.userData?.dungeonVeilBowNormalized === true;
  const namedFantasyBow = /(?:^|\|)bow[a-z](?:withstring)?(?:\||$)/.test(key);
  const majorAxisIsX = size.x > Math.max(size.z, size.y) * 1.3;
  const correctionY = alreadyNormalized ? 0 : (namedFantasyBow || majorAxisIsX ? -Math.PI / 2 : 0);

  bow.userData = {
    ...(bow.userData ?? {}),
    dungeonVeilBowAxisCorrection: correctionY,
    dungeonVeilBowBounds: { x: size.x, y: size.y, z: size.z },
  };
  return correctionY;
}

function enemyFacingCorrection(heroRoot: any) {
  let current = heroRoot;
  while (current) {
    if (String(current.name ?? '').startsWith('KayKitEnemy_')) return Math.PI;
    current = current.parent;
  }
  return 0;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rendererRecoveryActive() {
  return typeof document !== 'undefined'
    && (document.documentElement.dataset.dungeonVeilLowGpu === '1'
      || document.documentElement.dataset.dungeonVeilRendererRecovery === '1');
}

function createPlayerBowUpgradeBinding(THREE: any, heroRoot: any, bow: any): UpgradeBinding {
  const isPlayerBow = String(heroRoot?.name ?? '').startsWith('KayKitPlayerBody_');
  if (!isPlayerBow) return emptyUpgradeBinding();

  const meta = loadMetaProgression();
  const bowId = meta.equipped.bow;
  const tier = normalizeUpgradeVisualTier(Number(meta.owned[bowId]?.level ?? 1));
  const profile = getUpgradeVisualProfile(tier);
  const staticFallbackActive = () => prefersReducedMotion() || rendererRecoveryActive();

  bow.userData = {
    ...(bow.userData ?? {}),
    dungeonVeilUpgradeBinding: 'in-run-player-bow-mesh',
    dungeonVeilUpgradeTier: tier,
    dungeonVeilUpgradePrestige: profile.prestige,
    dungeonVeilUpgradeStaticFallback: staticFallbackActive(),
  };
  heroRoot.userData = {
    ...(heroRoot.userData ?? {}),
    dungeonVeilBowUpgradeTier: tier,
  };

  if (tier < 3) return {
    update: (_attackPulse: number) => undefined,
    dispose: () => undefined,
  };

  const visibleBinding = createVisibleUpgradePrestige3D(THREE, bow, {
    slot: 'bow',
    level: tier,
    binding: 'visible:player-bow',
  });
  const glowColor = new THREE.Color(tier === 5 ? 0xf6d778 : tier === 4 ? 0xc4a7ff : 0x9f8be8);
  const materialStates: Array<{ material: any; baseEmissive: any; baseIntensity: number }> = [];

  bow.traverse?.((node: any) => {
    if (!node.isMesh || !node.material || String(node.name ?? '').startsWith('DungeonVeilVisibleUpgrade')) return;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clonedMaterials = sourceMaterials.map((material: any) => material?.clone?.() ?? material);
    node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0];

    for (const material of clonedMaterials) {
      if (!material?.emissive?.copy) continue;
      materialStates.push({
        material,
        baseEmissive: material.emissive.clone?.() ?? null,
        baseIntensity: Number(material.emissiveIntensity ?? 0),
      });
      material.needsUpdate = true;
    }
  });

  const glowLight = new THREE.PointLight(
    glowColor.getHex(),
    0,
    tier === 5 ? 1.05 : tier === 4 ? 0.88 : 0.72,
    2,
  );
  glowLight.name = 'DungeonVeilBowUpgradePrestige';
  glowLight.position.set(0, 0.08, 0);
  glowLight.castShadow = false;
  bow.add(glowLight);

  let disposed = false;
  const update = (attackPulse: number) => {
    if (disposed) return;
    const staticFallback = staticFallbackActive();
    bow.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const edgeGlow = staticFallback ? profile.staticFallbackStrength : profile.edgeGlow;
    const ambientPulse = staticFallback || profile.pulseStrength === 0
      ? 0
      : Math.sin(now * (0.001 + profile.lightSweepSpeed * 0.0018)) * profile.pulseStrength * 0.4;
    const attackBoost = staticFallback ? 0 : Math.max(0, Math.min(1, attackPulse)) * profile.pulseStrength * 0.55;
    const strength = Math.max(0, edgeGlow * (0.42 + ambientPulse + attackBoost));
    const blend = Math.min(0.2, strength * 0.24);

    for (const state of materialStates) {
      if (state.baseEmissive && state.material.emissive?.copy) {
        state.material.emissive.copy(state.baseEmissive);
        state.material.emissive.lerp(glowColor, blend);
      }
      state.material.emissiveIntensity = state.baseIntensity + strength * 0.22;
    }
    glowLight.intensity = Math.min(0.18, strength * 0.2);
    visibleBinding.update(attackPulse);
  };

  update(0);
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      visibleBinding.dispose();
      bow.remove?.(glowLight);
      for (const state of materialStates) {
        if (state.baseEmissive && state.material.emissive?.copy) state.material.emissive.copy(state.baseEmissive);
        state.material.emissiveIntensity = state.baseIntensity;
      }
    },
  };
}

function createPlayerArmorAndQuiverUpgradeBinding(THREE: any, heroRoot: any): UpgradeBinding {
  const isPlayerBody = String(heroRoot?.name ?? '').startsWith('KayKitPlayerBody_');
  if (!isPlayerBody) return emptyUpgradeBinding();

  const meta = loadMetaProgression();
  const armorId = meta.equipped.armor;
  const quiverId = meta.equipped.quiver;
  const armorLevel = Number(meta.owned[armorId]?.level ?? 1);
  const quiverLevel = Number(meta.owned[quiverId]?.level ?? 1);

  const armorBinding = attachEquipmentUpgradePrestige3D(THREE, heroRoot, {
    slot: 'armor',
    level: armorLevel,
    binding: 'in-run-player-armor-model-local-motes',
  });
  const armorVisibleBinding = createVisibleUpgradePrestige3D(THREE, heroRoot, {
    slot: 'armor',
    level: armorLevel,
    binding: 'visible:player-armor',
  });
  heroRoot.userData = {
    ...(heroRoot.userData ?? {}),
    dungeonVeilArmorUpgradeTier: armorBinding.tier,
    dungeonVeilArmorUpgradeMaterialTint: false,
    dungeonVeilQuiverUpgradeTier: normalizeUpgradeVisualTier(quiverLevel),
  };

  let quiverBinding: EquipmentUpgradeBinding3D | null = null;
  let quiverVisibleBinding: VisibleUpgradePrestigeBinding3D | null = null;
  let remainingQuiverSearches = 16;
  let disposed = false;

  const bindQuiverWhenAttached = () => {
    if (disposed || quiverBinding || remainingQuiverSearches <= 0) return;
    remainingQuiverSearches -= 1;
    let equippedQuiver: any = null;
    heroRoot.traverse?.((node: any) => {
      if (equippedQuiver) return;
      if (String(node?.name ?? '').startsWith('DungeonVeilEquippedQuiver_')) equippedQuiver = node;
    });
    if (!equippedQuiver) return;

    quiverBinding = attachEquipmentUpgradePrestige3D(THREE, equippedQuiver, {
      slot: 'quiver',
      level: quiverLevel,
      binding: 'in-run-player-quiver-mesh',
    });
    quiverVisibleBinding = createVisibleUpgradePrestige3D(THREE, equippedQuiver, {
      slot: 'quiver',
      level: quiverLevel,
      binding: 'visible:player-quiver',
    });
  };

  return {
    update(activityPulse: number) {
      if (disposed) return;
      bindQuiverWhenAttached();
      armorBinding.update(activityPulse);
      armorVisibleBinding.update(activityPulse);
      quiverBinding?.update(activityPulse);
      quiverVisibleBinding?.update(activityPulse);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      armorVisibleBinding.dispose();
      quiverVisibleBinding?.dispose();
    },
  };
}

export function attachBowToRanger(
  THREE: any,
  heroRoot: any,
  bow: any,
  facingCorrectionY = enemyFacingCorrection(heroRoot),
): BowRig {
  let anchor = heroRoot;
  let bestScore = 0;
  let previousPulse = 0;
  let disposed = false;

  heroRoot.traverse((node: any) => {
    const score = scoreLeftHand(normalizeName(node.name));
    if (score > bestScore) {
      bestScore = score;
      anchor = node;
    }
  });

  const equipmentUpgradeBinding = createPlayerArmorAndQuiverUpgradeBinding(THREE, heroRoot);
  const correctionY = authoredBowAxisCorrection(THREE, bow) + facingCorrectionY;
  anchor.add(bow);
  bow.rotation.order = 'YXZ';

  if (bestScore >= 130) {
    bow.position.set(0, 0, 0);
    bow.rotation.set(0, correctionY, 0);
  } else if (bestScore > 0) {
    bow.position.set(0.02, -0.015, 0.04);
    bow.rotation.set(Math.PI / 2, correctionY, 0);
  } else {
    bow.position.set(-0.32, 1.02, 0.16);
    bow.rotation.set(Math.PI / 2, correctionY, 0);
  }

  const basePosition = bow.position.clone();
  const baseRotation = bow.rotation.clone();
  const upgradeBinding = createPlayerBowUpgradeBinding(THREE, heroRoot, bow);
  const lifecycleRoot = heroRoot.parent ?? heroRoot;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifecycleRoot.removeEventListener?.('removed', dispose);
    upgradeBinding.dispose();
    equipmentUpgradeBinding.dispose();
  };
  lifecycleRoot.addEventListener?.('removed', dispose);

  return {
    bow,
    anchor,
    basePosition,
    baseRotation,
    updateShotPose(pulse: number) {
      if (disposed) return;
      if (pulse > 0.82 && previousPulse <= 0.82) heroRoot.userData.rangerAttackSignal = (heroRoot.userData.rangerAttackSignal ?? 0) + 1;
      previousPulse = pulse;
      bow.position.copy(basePosition);
      bow.rotation.copy(baseRotation);

      bow.position.z -= pulse * 0.012;
      bow.rotation.x -= pulse * 0.018;

      bow.traverse?.((node: any) => {
        if (!node.morphTargetInfluences?.length) return;
        node.morphTargetInfluences[0] = Math.max(0, Math.min(1, pulse));
      });
      upgradeBinding.update(pulse);
      equipmentUpgradeBinding.update(pulse);
    },
    dispose,
  };
}
