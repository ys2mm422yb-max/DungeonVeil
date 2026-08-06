import { loadMetaProgression } from '../game/metaProgression';
import { getUpgradeVisualProfile, normalizeUpgradeVisualTier } from '../lib/upgradeVisualTiers';
import { attachEquipmentUpgradePrestige3D, type EquipmentUpgradeBinding3D } from './equipmentUpgradePrestige3D';

export type BowRig = {
  bow: any;
  anchor: any;
  basePosition: any;
  baseRotation: any;
  updateShotPose: (pulse: number) => void;
};

const normalizeName = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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

  // Ranger weapon loading wraps authored X-axis Fantasy Weapons bows and
  // rotates the child by -90 degrees. The wrapper remains at identity so the
  // same normalized model works in player, enemy, Codex and menu hand slots.
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

function createPlayerBowUpgradeBinding(THREE: any, heroRoot: any, bow: any) {
  const isPlayerBow = String(heroRoot?.name ?? '').startsWith('KayKitPlayerBody_');
  if (!isPlayerBow) return { update: (_attackPulse: number) => undefined };

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

  // Levels one and two stay byte-for-byte visually normal: no material clone,
  // light or animation is created until the first prestige tier is reached.
  if (tier < 3) return { update: (_attackPulse: number) => undefined };

  const glowColor = tier === 5 ? 0xfef08a : tier === 4 ? 0xd8b4fe : 0xa78bfa;
  const materialStates: Array<{ material: any; baseIntensity: number }> = [];

  bow.traverse?.((node: any) => {
    if (!node.isMesh || !node.material) return;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clonedMaterials = sourceMaterials.map((material: any) => material?.clone?.() ?? material);
    node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0];

    for (const material of clonedMaterials) {
      if (!material?.emissive?.setHex) continue;
      const baseIntensity = Number(material.emissiveIntensity ?? 0);
      material.emissive.setHex(glowColor);
      material.emissiveIntensity = baseIntensity + profile.edgeGlow * 0.72;
      material.needsUpdate = true;
      materialStates.push({ material, baseIntensity });
    }
  });

  const glowLight = new THREE.PointLight(
    glowColor,
    0.18 + profile.edgeGlow * 0.82,
    tier === 5 ? 2.4 : tier === 4 ? 1.9 : 1.45,
    2,
  );
  glowLight.name = 'DungeonVeilBowUpgradePrestige';
  glowLight.position.set(0, 0.08, 0);
  bow.add(glowLight);

  const update = (attackPulse: number) => {
    const staticFallback = staticFallbackActive();
    bow.userData.dungeonVeilUpgradeStaticFallback = staticFallback;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const edgeGlow = staticFallback ? profile.staticFallbackStrength : profile.edgeGlow;
    const ambientPulse = staticFallback || profile.pulseStrength === 0
      ? 0
      : Math.sin(now * (0.0016 + profile.lightSweepSpeed * 0.003)) * profile.pulseStrength;
    const attackBoost = staticFallback ? 0 : Math.max(0, Math.min(1, attackPulse)) * profile.pulseStrength;
    const strength = edgeGlow * Math.max(0.58, 0.78 + ambientPulse + attackBoost);

    for (const state of materialStates) {
      state.material.emissiveIntensity = state.baseIntensity + strength;
    }
    glowLight.intensity = 0.12 + strength * (tier === 5 ? 1.45 : 1.12);
  };

  update(0);
  return { update };
}

function createPlayerArmorAndQuiverUpgradeBinding(THREE: any, heroRoot: any) {
  const isPlayerBody = String(heroRoot?.name ?? '').startsWith('KayKitPlayerBody_');
  if (!isPlayerBody) return { update: (_activityPulse: number) => undefined };

  const meta = loadMetaProgression();
  const armorId = meta.equipped.armor;
  const quiverId = meta.equipped.quiver;
  const armorLevel = Number(meta.owned[armorId]?.level ?? 1);
  const quiverLevel = Number(meta.owned[quiverId]?.level ?? 1);

  // This runs before the bow is parented, so the armor traversal cannot clone
  // or tint bow/quiver materials and each equipped slot remains independent.
  const armorBinding = attachEquipmentUpgradePrestige3D(THREE, heroRoot, {
    slot: 'armor',
    level: armorLevel,
    binding: 'in-run-player-armor-mesh',
  });
  heroRoot.userData = {
    ...(heroRoot.userData ?? {}),
    dungeonVeilArmorUpgradeTier: armorBinding.tier,
    dungeonVeilQuiverUpgradeTier: normalizeUpgradeVisualTier(quiverLevel),
  };

  let quiverBinding: EquipmentUpgradeBinding3D | null = null;
  let remainingQuiverSearches = 16;

  const bindQuiverWhenAttached = () => {
    if (quiverBinding || remainingQuiverSearches <= 0) return;
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
  };

  return {
    update(activityPulse: number) {
      bindQuiverWhenAttached();
      armorBinding.update(activityPulse);
      quiverBinding?.update(activityPulse);
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

  return {
    bow,
    anchor,
    basePosition,
    baseRotation,
    updateShotPose(pulse: number) {
      if (pulse > 0.82 && previousPulse <= 0.82) heroRoot.userData.rangerAttackSignal = (heroRoot.userData.rangerAttackSignal ?? 0) + 1;
      previousPulse = pulse;
      bow.position.copy(basePosition);
      bow.rotation.copy(baseRotation);

      // Keep the grip fixed. The character animation sells the shot; only add a tiny recoil.
      bow.position.z -= pulse * 0.012;
      bow.rotation.x -= pulse * 0.018;

      bow.traverse?.((node: any) => {
        if (!node.morphTargetInfluences?.length) return;
        node.morphTargetInfluences[0] = Math.max(0, Math.min(1, pulse));
      });
      upgradeBinding.update(pulse);
      equipmentUpgradeBinding.update(pulse);
    },
  };
}
