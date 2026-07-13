import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadWorldBossMobileRig, type WorldBossMobileRig } from './worldBossMobileVisual3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const ARENA_WIDTH = 12.2;
const ARENA_DEPTH = 20.8;
const ARENA_INNER_X = 5.18;
const ARENA_INNER_Z = 8.48;
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (IS_ANDROID || IS_IOS || navigator.maxTouchPoints > 1);
const MAX_PROJECTILES = IS_MOBILE ? 4 : 7;
const PERF_KEY = 'dungeon-veil-worldboss-performance';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type ProjectileSlot = {
  mesh: any;
  material: any;
};

type ArenaPoint = {
  x: number;
  z: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function WorldBossCohesiveStage({ engineRef, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let readyRaf = 0;
    let THREE: any = null;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let clock: any = null;
    let playerRig: KayKitPlayerRig | null = null;
    let bossRig: WorldBossMobileRig | null = null;
    let bossFallback: any = null;
    let telegraph: any = null;
    let lastAttack = 0;
    let lastDodge = 0;
    let lastBossAttack = 0;
    let lastFrameAt = 0;
    let performanceWindowAt = performance.now();
    let performanceFrames = 0;
    let qualityLevel = 0;
    let animationFrameCounter = 0;
    const projectileSlots: ProjectileSlot[] = [];
    const ownedGeometries: any[] = [];
    const ownedMaterials: any[] = [];

    const state = () => engineRef.current?.state ?? null;

    const mapPoint = (worldX: number, worldY: number): ArenaPoint => {
      const current = state();
      if (!current) return { x: 0, z: 0 };
      const mapWidth = Math.max(1, current.map.width * TILE);
      const mapDepth = Math.max(1, current.map.height * TILE);
      const normalizedX = worldX / mapWidth - 0.5;
      const normalizedZ = worldY / mapDepth - 0.5;
      return {
        x: clamp(normalizedX * ARENA_INNER_X * 2, -ARENA_INNER_X, ARENA_INNER_X),
        z: clamp(normalizedZ * ARENA_INNER_Z * 2, -ARENA_INNER_Z, ARENA_INNER_Z),
      };
    };

    const arenaUnitsPerPixel = () => {
      const current = state();
      if (!current) return 1 / TILE;
      const xScale = ARENA_INNER_X * 2 / Math.max(1, current.map.width * TILE);
      const zScale = ARENA_INNER_Z * 2 / Math.max(1, current.map.height * TILE);
      return Math.min(xScale, zScale);
    };

    const rememberGeometry = (geometry: any) => {
      ownedGeometries.push(geometry);
      return geometry;
    };

    const rememberMaterial = (material: any) => {
      ownedMaterials.push(material);
      return material;
    };

    const disposeModel = (root: any) => root?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const pixelRatioForQuality = () => {
      const deviceRatio = window.devicePixelRatio || 1;
      if (!IS_MOBILE) return Math.min(deviceRatio, 1.5);
      if (qualityLevel >= 2) return IS_ANDROID ? 0.62 : 0.68;
      if (qualityLevel >= 1) return IS_ANDROID ? 0.72 : 0.8;
      return Math.min(deviceRatio, IS_ANDROID ? 0.85 : 1);
    };

    const frameIntervalForQuality = () => {
      if (!IS_MOBILE) return 0;
      if (qualityLevel >= 2) return 50;
      if (qualityLevel >= 1) return 42;
      return 33;
    };

    const frameCamera = (width: number, height: number) => {
      if (!camera) return;
      const aspect = width / Math.max(1, height);
      const portrait = aspect < 0.92;
      const viewHeight = portrait ? 21.1 : 17.4;
      const viewWidth = portrait ? Math.max(12.15, viewHeight * aspect) : viewHeight * Math.max(0.55, aspect);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(0, portrait ? 25.2 : 16.6, portrait ? 9.4 : 15.2);
      camera.lookAt(0, 0.2, portrait ? 0.45 : 0.3);
      camera.updateProjectionMatrix();
    };

    const viewportSize = () => {
      const viewport = window.visualViewport;
      return {
        width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
        height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
      };
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const { width, height } = viewportSize();
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      renderer.setPixelRatio(pixelRatioForQuality());
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      frameCamera(width, height);
    };

    const buildArena = () => {
      if (!scene || !THREE) return;
      const root = new THREE.Group();
      root.name = 'AshKingRitualHall';

      const ashBed = new THREE.Mesh(
        rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH + 1.6, ARENA_DEPTH + 1.8)),
        rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x130d0f, roughness: 1, metalness: 0 })),
      );
      ashBed.rotation.x = -Math.PI / 2;
      ashBed.position.y = -0.11;
      root.add(ashBed);

      const slabGeometry = rememberGeometry(new THREE.BoxGeometry(2.82, 0.075, 2.18));
      const slabMaterialA = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x514345, roughness: 0.92, metalness: 0.025 }));
      const slabMaterialB = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x44383b, roughness: 0.95, metalness: 0.02 }));
      const slabA = new THREE.InstancedMesh(slabGeometry, slabMaterialA, 18);
      const slabB = new THREE.InstancedMesh(slabGeometry, slabMaterialB, 18);
      slabA.name = 'StoneFloorSlabs';
      slabB.name = 'StoneFloorSlabsAlternate';
      const matrix = new THREE.Matrix4();
      let countA = 0;
      let countB = 0;
      for (let row = 0; row < 9; row++) {
        for (let column = 0; column < 4; column++) {
          const x = (column - 1.5) * 2.86;
          const z = (row - 4) * 2.22;
          const y = -0.02 + ((row + column) % 3) * 0.004;
          matrix.compose(
            new THREE.Vector3(x, y, z),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ((row * 7 + column * 3) % 5 - 2) * 0.004, 0)),
            new THREE.Vector3(1, 1, 1),
          );
          if ((row + column) % 2 === 0) slabA.setMatrixAt(countA++, matrix);
          else slabB.setMatrixAt(countB++, matrix);
        }
      }
      slabA.instanceMatrix.needsUpdate = true;
      slabB.instanceMatrix.needsUpdate = true;
      root.add(slabA, slabB);

      const pathMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x665044, roughness: 0.86, metalness: 0.04 }));
      const oathPath = new THREE.Mesh(rememberGeometry(new THREE.PlaneGeometry(3.9, 10.4)), pathMaterial);
      oathPath.name = 'OathPathFromVeilGate';
      oathPath.rotation.x = -Math.PI / 2;
      oathPath.position.set(0, 0.025, 4.2);
      root.add(oathPath);

      const pathTrimMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xd09554, transparent: true, opacity: 0.34, depthWrite: false }));
      const pathTrimGeometry = rememberGeometry(new THREE.BoxGeometry(0.055, 0.02, 10.1));
      for (const x of [-1.86, 1.86]) {
        const trim = new THREE.Mesh(pathTrimGeometry, pathTrimMaterial);
        trim.position.set(x, 0.046, 4.2);
        root.add(trim);
      }

      const sealMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xd75d35, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false }));
      const sealArcs: any[] = [];
      for (const [start, length, radius] of [[0.18, 1.4, 1.95], [2.34, 1.24, 1.58], [4.44, 1.3, 1.92]] as Array<[number, number, number]>) {
        const arc = new THREE.Mesh(rememberGeometry(new THREE.RingGeometry(radius - 0.09, radius, 30, 1, start, length)), sealMaterial);
        arc.name = 'BrokenAshSeal';
        arc.rotation.x = -Math.PI / 2;
        arc.position.set(0, 0.052, 0.55);
        root.add(arc);
        sealArcs.push(arc);
      }
      const sealCore = new THREE.Mesh(rememberGeometry(new THREE.RingGeometry(0.62, 0.74, 30)), sealMaterial);
      sealCore.rotation.x = -Math.PI / 2;
      sealCore.position.set(0, 0.054, 0.55);
      root.add(sealCore);

      const fissureMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xff6c3a, emissive: 0x8b210c, emissiveIntensity: 0.86, roughness: 0.38 }));
      const fissures: Array<[number, number, number, number]> = [
        [-0.9, -0.55, 1.35, 0.34],
        [0.82, -0.2, 1.1, -0.42],
        [-0.35, 1.55, 1.18, -0.15],
        [1.25, 1.32, 0.86, 0.52],
        [-1.35, 1.12, 0.8, -0.6],
      ];
      fissures.forEach(([x, z, length, rotation]) => {
        const crack = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(0.06, 0.025, length)), fissureMaterial);
        crack.name = 'EmberFissure';
        crack.position.set(x, 0.055, z + 0.55);
        crack.rotation.y = rotation;
        root.add(crack);
      });

      const stoneDark = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x31272b, roughness: 0.9, metalness: 0.05 }));
      const stoneWarm = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x58403a, roughness: 0.8, metalness: 0.08 }));
      const daisLower = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(8.1, 0.24, 2.45)), stoneWarm);
      daisLower.name = 'AshKingDais';
      daisLower.position.set(0, 0.1, -8.48);
      root.add(daisLower);
      const daisUpper = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(6.4, 0.26, 1.7)), stoneDark);
      daisUpper.position.set(0, 0.31, -8.72);
      root.add(daisUpper);

      const throneGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1, 1));
      const throneParts: Array<[number, number, number, number, number, number]> = [
        [-3.65, 1.45, -9.62, 0.72, 2.9, 0.62],
        [3.65, 1.45, -9.62, 0.72, 2.9, 0.62],
        [0, 2.52, -9.62, 7.8, 0.48, 0.62],
        [-1.45, 2.05, -9.38, 0.42, 1.35, 0.45],
        [1.6, 1.92, -9.4, 0.38, 1.08, 0.45],
      ];
      throneParts.forEach(([x, y, z, sx, sy, sz], index) => {
        const part = new THREE.Mesh(throneGeometry, index < 3 ? stoneDark : stoneWarm);
        part.name = 'BrokenAshThrone';
        part.position.set(x, y, z);
        part.scale.set(sx, sy, sz);
        if (index >= 3) part.rotation.z = index % 2 ? 0.18 : -0.16;
        root.add(part);
      });

      const bannerMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x4e1f27, emissive: 0x160407, emissiveIntensity: 0.2, roughness: 0.9, side: THREE.DoubleSide }));
      for (const x of [-4.6, 4.6]) {
        const banner = new THREE.Mesh(rememberGeometry(new THREE.PlaneGeometry(1.05, 2.4)), bannerMaterial);
        banner.name = 'AshBanner';
        banner.position.set(x, 1.5, -8.82);
        banner.rotation.y = x < 0 ? 0.08 : -0.08;
        root.add(banner);
      }

      const brazierBaseGeometry = rememberGeometry(new THREE.CylinderGeometry(0.24, 0.38, 0.78, 10));
      const brazierMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x3d3232, roughness: 0.72, metalness: 0.28 }));
      const flameGeometry = rememberGeometry(new THREE.ConeGeometry(0.22, 0.62, 9));
      const flameMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xffb05a, emissive: 0xa9360d, emissiveIntensity: 1.25, roughness: 0.3 }));
      for (const [x, z] of [[-4.72, -5.85], [4.72, -5.85], [-4.72, 5.8], [4.72, 5.8]] as Array<[number, number]>) {
        const base = new THREE.Mesh(brazierBaseGeometry, brazierMaterial);
        base.name = 'RitualBrazier';
        base.position.set(x, 0.39, z);
        root.add(base);
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(x, 1.02, z);
        root.add(flame);
      }

      const sideWallGeometry = rememberGeometry(new THREE.BoxGeometry(0.4, 0.7, ARENA_DEPTH));
      const wallMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x362d31, roughness: 0.9, metalness: 0.04 }));
      for (const x of [-ARENA_WIDTH / 2, ARENA_WIDTH / 2]) {
        const wall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        wall.position.set(x, 0.35, 0);
        root.add(wall);
      }
      const backWall = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(ARENA_WIDTH + 0.4, 0.76, 0.38)), wallMaterial);
      backWall.position.set(0, 0.38, -ARENA_DEPTH / 2);
      root.add(backWall);

      const threshold = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(7.2, 0.18, 0.74)), stoneWarm);
      threshold.name = 'VeilGateThreshold';
      threshold.position.set(0, 0.09, 9.72);
      root.add(threshold);
      for (const x of [-3.4, 3.4]) {
        const gatePillar = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.36, 0.5, 1.45, 10)), wallMaterial);
        gatePillar.position.set(x, 0.72, 9.48);
        root.add(gatePillar);
      }

      root.userData.sealArcs = sealArcs;
      root.userData.flameMaterial = flameMaterial;
      scene.add(root);
      return root;
    };

    const buildFallbackBoss = () => {
      if (!scene || !THREE) return null;
      const root = new THREE.Group();
      root.name = 'AshKingVeilFallback';
      const dark = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x2a2227, roughness: 0.84, metalness: 0.12 }));
      const bone = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x9e9079, roughness: 0.72, metalness: 0.08 }));
      const ember = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xff8146, emissive: 0x8b210c, emissiveIntensity: 1.05, roughness: 0.34 }));
      const body = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.72, 1.65, 12)), dark);
      body.position.y = 0.84;
      root.add(body);
      const head = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.34, 14, 10)), bone);
      head.position.y = 1.68;
      root.add(head);
      const core = new THREE.Mesh(rememberGeometry(new THREE.OctahedronGeometry(0.17, 1)), ember);
      core.position.set(0, 1.05, 0.46);
      root.add(core);
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(rememberGeometry(new THREE.OctahedronGeometry(0.28, 0)), dark);
        shoulder.position.set(side * 0.58, 1.25, 0);
        shoulder.scale.set(1.4, 0.7, 1);
        root.add(shoulder);
      }
      const crown = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.43, 0.62, 6, 1, true)), bone);
      crown.position.y = 2.14;
      root.add(crown);
      scene.add(root);
      return root;
    };

    const buildProjectilePool = () => {
      if (!scene || !THREE) return;
      const geometry = rememberGeometry(new THREE.BoxGeometry(0.09, 0.09, 0.76));
      for (let index = 0; index < MAX_PROJECTILES; index++) {
        const material = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xf4d7a3, transparent: true, opacity: 0.94, depthWrite: false }));
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        mesh.frustumCulled = true;
        scene.add(mesh);
        projectileSlots.push({ mesh, material });
      }
    };

    const syncProjectiles = (now: number) => {
      const current = state();
      if (!current) return;
      for (const slot of projectileSlots) slot.mesh.visible = false;
      let slotIndex = 0;
      for (let index = current.effects.length - 1; index >= 0 && slotIndex < projectileSlots.length; index--) {
        const effect = current.effects[index];
        if (effect.type !== 'beam') continue;
        if (!effect.id.startsWith('shot-') && !effect.id.startsWith('pierce-') && !effect.id.startsWith('rico-') && !effect.id.startsWith('boss-shot-')) continue;
        const slot = projectileSlots[slotIndex++];
        const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
        const angle = effect.angle ?? 0;
        const start = mapPoint(effect.x, effect.y);
        const end = mapPoint(effect.x + Math.cos(angle) * effect.maxRadius, effect.y + Math.sin(angle) * effect.maxRadius);
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        slot.mesh.visible = true;
        slot.mesh.position.set(start.x + dx * progress, effect.id.startsWith('boss-shot-') ? 1.15 : 0.92, start.z + dz * progress);
        slot.mesh.rotation.y = Math.atan2(dx, dz);
        slot.material.color.set(effect.color);
        slot.material.opacity = Math.max(0.34, 0.96 - progress * 0.42);
        const pulse = 0.94 + Math.sin(now * 0.018 + slotIndex) * 0.08;
        slot.mesh.scale.set(effect.id.startsWith('boss-shot-') ? 1.35 : pulse, pulse, pulse);
      }
    };

    const syncTelegraph = () => {
      const current = state();
      if (!current || !telegraph) return;
      let effect: any = null;
      for (let index = current.effects.length - 1; index >= 0; index--) {
        if (current.effects[index].type === 'circle') {
          effect = current.effects[index];
          break;
        }
      }
      if (!effect) {
        telegraph.visible = false;
        return;
      }
      const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
      const point = mapPoint(effect.x, effect.y);
      telegraph.visible = true;
      telegraph.position.set(point.x, 0.07, point.z);
      telegraph.scale.setScalar(Math.max(0.12, effect.maxRadius * arenaUnitsPerPixel() * Math.max(0.2, progress)));
      telegraph.material.color.set(effect.color);
      telegraph.material.opacity = Math.max(0.18, 0.82 * (1 - progress));
    };

    const adaptQuality = (now: number) => {
      performanceFrames += 1;
      const elapsed = now - performanceWindowAt;
      if (elapsed < 2200 || !renderer) return;
      const fps = Math.round(performanceFrames * 1000 / elapsed);
      const nextLevel = fps < 19 ? 2 : fps < 27 ? Math.max(qualityLevel, 1) : qualityLevel;
      if (nextLevel !== qualityLevel) {
        qualityLevel = nextLevel;
        resize();
      }
      try {
        localStorage.setItem(PERF_KEY, JSON.stringify({
          fps,
          qualityLevel,
          targetFps: qualityLevel >= 2 ? 20 : qualityLevel >= 1 ? 24 : IS_MOBILE ? 30 : 0,
          pixelRatio: pixelRatioForQuality(),
          calls: renderer.info?.render?.calls ?? 0,
          triangles: renderer.info?.render?.triangles ?? 0,
          mobileBoss: IS_MOBILE,
          mobileBossSource: bossRig ? 'ash-warden-skeleton' : bossFallback ? 'veil-fallback' : 'loading',
          arena: 'cohesive-ritual-hall',
          at: Date.now(),
        }));
      } catch {}
      performanceFrames = 0;
      performanceWindowAt = now;
    };

    const renderLoop = (now: number) => {
      if (disposed || !renderer || !scene || !camera || !clock) return;
      raf = requestAnimationFrame(renderLoop);
      const interval = frameIntervalForQuality();
      if (interval && now - lastFrameAt < interval) return;
      lastFrameAt = now;
      animationFrameCounter += 1;

      const current = state();
      if (!current) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const playerPoint = mapPoint(current.player.x + current.player.width / 2, current.player.y + current.player.height / 2);

      if (playerRig) {
        playerRig.root.position.set(playerPoint.x, 0, playerPoint.z);
        if (Math.hypot(current.player.facing.x, current.player.facing.y) > 0.1) {
          const facingEnd = mapPoint(
            current.player.x + current.player.width / 2 + current.player.facing.x * TILE,
            current.player.y + current.player.height / 2 + current.player.facing.y * TILE,
          );
          playerRig.root.rotation.y = Math.atan2(facingEnd.x - playerPoint.x, facingEnd.z - playerPoint.z);
        }
        playerRig.setMoving(current.player.state === 'moving');
        if (current.player.lastAttackTime > lastAttack) {
          lastAttack = current.player.lastAttackTime;
          playerRig.triggerAttack();
        }
        if (current.player.lastDodgeTime > lastDodge) {
          lastDodge = current.player.lastDodgeTime;
          playerRig.triggerDash();
        }
        if (qualityLevel < 2 || animationFrameCounter % 2 === 0) playerRig.update(delta);
      }

      const boss = current.enemies.find(enemy => enemy.enemyType === 'boss');
      if (boss) {
        const bossPoint = mapPoint(boss.x + boss.width / 2, boss.y + boss.height / 2);
        if (bossRig) {
          bossRig.root.position.set(bossPoint.x, 0, bossPoint.z);
          bossRig.root.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          bossRig.setMoving(boss.state === 'chase' && Math.hypot(boss.vx, boss.vy) > 0.05);
          if (boss.lastAttackTime > lastBossAttack) {
            lastBossAttack = boss.lastAttackTime;
            bossRig.triggerAttack();
          }
          if (qualityLevel < 2 || animationFrameCounter % 2 === 0) bossRig.update(delta, now);
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          bossRig.root.scale.setScalar(1.28 + attackPulse * 0.035);
        }
        if (bossFallback) {
          bossFallback.position.set(bossPoint.x, Math.sin(now * 0.003) * 0.025, bossPoint.z);
          bossFallback.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          if (boss.lastAttackTime > lastBossAttack) lastBossAttack = boss.lastAttackTime;
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          bossFallback.scale.setScalar(1.18 + attackPulse * 0.05);
        }
      }

      syncProjectiles(now);
      syncTelegraph();
      renderer.render(scene, camera);
      adaptQuality(now);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed || !state()) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x120c0e);
      scene.fog = new THREE.Fog(0x120c0e, 24, 44);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      camera = new THREE.OrthographicCamera(-6.1, 6.1, 10.55, -10.55, 0.1, 70);
      scene.add(new THREE.AmbientLight(0xe5d7ce, 1.12));
      scene.add(new THREE.HemisphereLight(0xffd3a0, 0x1a1722, 0.9));
      const keyLight = new THREE.DirectionalLight(0xffbd7c, 1.42);
      keyLight.position.set(-5, 11, 8);
      keyLight.castShadow = false;
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x899fd7, 0.58);
      fillLight.position.set(6, 8, -5);
      fillLight.castShadow = false;
      scene.add(fillLight);

      const arena = buildArena();
      buildProjectilePool();
      telegraph = new THREE.Mesh(
        rememberGeometry(new THREE.RingGeometry(0.72, 1, 28)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff7247, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
      );
      telegraph.rotation.x = -Math.PI / 2;
      telegraph.visible = false;
      scene.add(telegraph);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(IS_MOBILE ? 1.02 : 1.08);
      scene.add(playerRig.root);

      try {
        bossRig = await loadWorldBossMobileRig(THREE, GLTFLoader);
        if (disposed) return;
        scene.add(bossRig.root);
      } catch (error) {
        console.warn('Ash Warden rig unavailable; using the Veil fallback', error);
        bossFallback = buildFallbackBoss();
      }

      clock = new THREE.Clock();
      resize();
      const current = state();
      if (!current || !playerRig || (!bossRig && !bossFallback)) throw new Error('World boss stage incomplete');
      const bossEntity = current.enemies.find(enemy => enemy.enemyType === 'boss');
      if (!bossEntity) throw new Error('World boss entity missing');
      const playerPoint = mapPoint(current.player.x + current.player.width / 2, current.player.y + current.player.height / 2);
      const bossPoint = mapPoint(bossEntity.x + bossEntity.width / 2, bossEntity.y + bossEntity.height / 2);
      playerRig.root.position.set(playerPoint.x, 0, playerPoint.z);
      if (bossRig) {
        bossRig.root.position.set(bossPoint.x, 0, bossPoint.z);
        bossRig.root.scale.setScalar(1.28);
      }
      if (bossFallback) {
        bossFallback.position.set(bossPoint.x, 0, bossPoint.z);
        bossFallback.scale.setScalar(1.18);
      }
      if (arena?.userData?.sealArcs) {
        arena.userData.sealArcs.forEach((arc: any, index: number) => { arc.rotation.z = index * 0.42; });
      }
      renderer.render(scene, camera);
      readyRaf = requestAnimationFrame(() => {
        if (!disposed) readyRef.current();
      });
      raf = requestAnimationFrame(renderLoop);
    };

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    visualViewport?.addEventListener('resize', resize);
    visualViewport?.addEventListener('scroll', resize);
    void boot().catch(error => console.error('World boss cohesive renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(readyRaf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      visualViewport?.removeEventListener('resize', resize);
      visualViewport?.removeEventListener('scroll', resize);
      playerRig?.stop();
      bossRig?.stop();
      if (playerRig?.root) disposeModel(playerRig.root);
      if (bossRig?.root) disposeModel(bossRig.root);
      ownedGeometries.forEach(geometry => geometry?.dispose?.());
      ownedMaterials.forEach(material => material?.dispose?.());
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
      projectileSlots.length = 0;
      playerRig = null;
      bossRig = null;
      bossFallback = null;
      telegraph = null;
      scene = null;
      camera = null;
      renderer = null;
    };
  }, [engineRef]);

  return <div ref={hostRef} data-testid="ash-king-cohesive-stage" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ width: '100vw', height: '100dvh' }} />;
}
