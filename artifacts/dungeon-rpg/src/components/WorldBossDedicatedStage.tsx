import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';
import { loadWorldBossMobileRig, type WorldBossMobileRig } from './worldBossMobileVisual3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const ARENA_WIDTH = 11.8;
const ARENA_DEPTH = 20.4;
const ARENA_INNER_X = 4.95;
const ARENA_INNER_Z = 8.25;
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

export function WorldBossDedicatedStage({ engineRef, onReady }: Props) {
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
    let desktopBoss: KayKitEnemyVisual | null = null;
    let mobileBossRig: WorldBossMobileRig | null = null;
    let mobileBossFallback: any = null;
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
      const aspect = width / height;
      const portrait = aspect < 0.92;
      const viewHeight = portrait ? 19.7 : 16.8;
      const viewWidth = portrait ? Math.max(11.65, viewHeight * aspect) : viewHeight * Math.max(0.42, aspect);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(0, portrait ? 23.8 : 15.8, portrait ? 8.6 : 14.2);
      camera.lookAt(0, 0.22, portrait ? 0.2 : 0.35);
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
      root.name = 'WorldBossDedicatedArena';

      const ashGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH + 1, ARENA_DEPTH + 1));
      const ashMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 1, metalness: 0 }));
      const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
      ashBed.rotation.x = -Math.PI / 2;
      ashBed.position.y = -0.08;
      root.add(ashBed);

      const floorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_DEPTH));
      const floorMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x2b252a, roughness: 0.94, metalness: 0.02 }));
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      root.add(floor);

      const innerFloorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH - 0.68, ARENA_DEPTH - 0.68));
      const innerFloorMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x3b3035, roughness: 0.9, metalness: 0.035 }));
      const innerFloor = new THREE.Mesh(innerFloorGeometry, innerFloorMaterial);
      innerFloor.rotation.x = -Math.PI / 2;
      innerFloor.position.y = -0.012;
      root.add(innerFloor);

      const grid = new THREE.GridHelper(ARENA_DEPTH - 0.9, 8, 0x725044, 0x4e3b3b);
      grid.scale.x = (ARENA_WIDTH - 0.9) / (ARENA_DEPTH - 0.9);
      grid.position.y = 0.006;
      grid.material.transparent = true;
      grid.material.opacity = 0.24;
      grid.material.depthWrite = false;
      rememberGeometry(grid.geometry);
      if (Array.isArray(grid.material)) grid.material.forEach((material: any) => rememberMaterial(material));
      else rememberMaterial(grid.material);
      root.add(grid);

      const runeGeometry = rememberGeometry(new THREE.RingGeometry(1.7, 1.88, 44));
      const runeMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xe4572d, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false }));
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(0, 0.025, 0.55);
      root.add(rune);

      const innerRuneGeometry = rememberGeometry(new THREE.RingGeometry(0.72, 0.82, 36));
      const innerRune = new THREE.Mesh(innerRuneGeometry, runeMaterial);
      innerRune.rotation.x = -Math.PI / 2;
      innerRune.position.set(0, 0.027, 0.55);
      root.add(innerRune);

      const sigilGeometry = rememberGeometry(new THREE.BoxGeometry(0.1, 0.02, 3.75));
      const sigilMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xb63c27, transparent: true, opacity: 0.42, depthWrite: false }));
      const sigilA = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilA.position.set(0, 0.026, 0.55);
      root.add(sigilA);
      const sigilB = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilB.position.set(0, 0.028, 0.55);
      sigilB.rotation.y = Math.PI / 2;
      root.add(sigilB);

      const daisMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x3b2322, roughness: 0.82, metalness: 0.08 }));
      const dais = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(2.45, 2.82, 0.24, 28)), daisMaterial);
      dais.name = 'AshKingDais';
      dais.position.set(0, 0.08, -7.25);
      root.add(dais);
      const daisRing = new THREE.Mesh(
        rememberGeometry(new THREE.RingGeometry(2.42, 2.72, 40)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xc34a2a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })),
      );
      daisRing.rotation.x = -Math.PI / 2;
      daisRing.position.set(0, 0.215, -7.25);
      root.add(daisRing);

      const pathMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x4a3532, roughness: 0.9, metalness: 0.02 }));
      const oathPath = new THREE.Mesh(rememberGeometry(new THREE.PlaneGeometry(4.25, 8.4)), pathMaterial);
      oathPath.name = 'OathPathFromVeilGate';
      oathPath.rotation.x = -Math.PI / 2;
      oathPath.position.set(0, 0.012, 5.45);
      root.add(oathPath);

      const sideAisleMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x241d22, roughness: 0.96, metalness: 0.01 }));
const sideAisleGeometry = rememberGeometry(new THREE.PlaneGeometry(1.95, 16.4));
for (const x of [-4.35, 4.35]) {
  const aisle = new THREE.Mesh(sideAisleGeometry, sideAisleMaterial);
  aisle.name = 'RitualSideAisle';
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(x, 0.014, 0.2);
  root.add(aisle);
}

const channelMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xff6433, emissive: 0x761b0a, emissiveIntensity: 0.72, roughness: 0.48 }));
      const channelGeometry = rememberGeometry(new THREE.BoxGeometry(0.1, 0.025, 7.45));
      for (const x of [-1.48, 1.48]) {
        const channel = new THREE.Mesh(channelGeometry, channelMaterial);
        channel.name = 'EmberChannel';
        channel.position.set(x, 0.035, -3.28);
        root.add(channel);
      }

      const threshold = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(6.6, 0.16, 0.72)), daisMaterial);
      threshold.name = 'VeilGateThreshold';
      threshold.position.set(0, 0.08, 9.62);
      root.add(threshold);

      const archGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1, 1));
      const archMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x24191c, roughness: 0.9, metalness: 0.04 }));
      const archParts: Array<[number, number, number, number, number]> = [
        [-4.25, 1.45, -9.52, 0.7, 2.9],
        [4.25, 1.45, -9.52, 0.7, 2.9],
        [0, 2.62, -9.52, 9.2, 0.5],
      ];
      for (const [x, y, z, sx, sy] of archParts) {
        const part = new THREE.Mesh(archGeometry, archMaterial);
        part.name = 'BrokenThroneArch';
        part.position.set(x, y, z);
        part.scale.set(sx, sy, 0.52);
        root.add(part);
      }

      const brazierBaseGeometry = rememberGeometry(new THREE.CylinderGeometry(0.22, 0.34, 0.72, 10));
      const brazierMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x32272a, roughness: 0.78, metalness: 0.18 }));
      const flameGeometry = rememberGeometry(new THREE.ConeGeometry(0.2, 0.58, 9));
      const flameMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xffa14a, emissive: 0xa92f0c, emissiveIntensity: 1.12, roughness: 0.38 }));
      for (const [x, z] of [[-4.75, -5.55], [4.75, -5.55], [-4.75, 6.45], [4.75, 6.45]] as Array<[number, number]>) {
        const base = new THREE.Mesh(brazierBaseGeometry, brazierMaterial);
        base.name = 'RitualBrazier';
        base.position.set(x, 0.36, z);
        root.add(base);
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.set(x, 0.96, z);
        root.add(flame);
      }

      const wallGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1, 1));
      const wallMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x2a2025, roughness: 0.88, metalness: 0.05 }));
      const sideWallHeight = 0.78;
      const wallTransforms: Array<[number, number, number, number, number]> = [
        [0, -ARENA_DEPTH / 2, ARENA_WIDTH + 0.38, sideWallHeight, 0.38],
        [-ARENA_WIDTH / 2, 0, 0.38, sideWallHeight, ARENA_DEPTH],
        [ARENA_WIDTH / 2, 0, 0.38, sideWallHeight, ARENA_DEPTH],
        [0, ARENA_DEPTH / 2, ARENA_WIDTH + 0.38, 0.22, 0.34],
      ];
      for (const [x, z, sx, sy, sz] of wallTransforms) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, sy / 2, z);
        wall.scale.set(sx, sy, sz);
        root.add(wall);
      }

      const trimMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x5a3a32, roughness: 0.72, metalness: 0.16 }));
      const trimGeometry = rememberGeometry(new THREE.BoxGeometry(1, 0.08, 0.12));
      for (const z of [-ARENA_DEPTH / 2 + 0.22, ARENA_DEPTH / 2 - 0.22]) {
        const trim = new THREE.Mesh(trimGeometry, trimMaterial);
        trim.position.set(0, 0.11, z);
        trim.scale.x = ARENA_WIDTH - 0.45;
        root.add(trim);
      }

      const pillarGeometry = rememberGeometry(new THREE.CylinderGeometry(0.42, 0.58, 1.9, 10));
      const pillarMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x3b3035, roughness: 0.84, metalness: 0.08 }));
      const pillarPositions: Array<[number, number]> = [
        [-5.0, -8.35],
        [5.0, -8.35],
        [-5.0, 8.15],
        [5.0, 8.15],
      ];
      for (const [x, z] of pillarPositions) {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 0.95, z);
        root.add(pillar);
      }

      scene.add(root);
    };

    const buildFallbackMobileBoss = () => {
      if (!scene || !THREE) return null;
      const root = new THREE.Group();
      root.name = 'AshKingMobileFallback';

      const darkMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x2d2224, roughness: 0.76, metalness: 0.08 }));
      const armorMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x7f2f25, roughness: 0.58, metalness: 0.24 }));
      const emberMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xff7a3d, emissive: 0x7a1a08, emissiveIntensity: 0.9, roughness: 0.38 }));
      const goldMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xd1a14d, roughness: 0.46, metalness: 0.55 }));
      const capeMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0x421b20, roughness: 0.88, metalness: 0 }));

      const shadow = new THREE.Mesh(
        rememberGeometry(new THREE.CircleGeometry(0.86, 28)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      root.add(shadow);

      const cape = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.64, 0.9, 1.72, 14)), capeMaterial);
      cape.position.set(0, 0.88, -0.22);
      root.add(cape);

      const body = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.56, 0.78, 1.55, 14)), darkMaterial);
      body.position.y = 0.86;
      root.add(body);

      const armor = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.76, 1.08, 14, 1, true)), armorMaterial);
      armor.position.y = 1.08;
      armor.rotation.x = Math.PI;
      root.add(armor);

      const shoulderGeometry = rememberGeometry(new THREE.SphereGeometry(0.28, 14, 10));
      const armGeometry = rememberGeometry(new THREE.CylinderGeometry(0.16, 0.21, 0.96, 10));
      const gauntletGeometry = rememberGeometry(new THREE.SphereGeometry(0.18, 12, 8));
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        shoulder.position.set(side * 0.67, 1.34, 0);
        shoulder.scale.set(1.18, 0.78, 1.05);
        root.add(shoulder);

        const arm = new THREE.Mesh(armGeometry, darkMaterial);
        arm.position.set(side * 0.8, 0.96, 0.02);
        arm.rotation.z = side * -0.36;
        root.add(arm);

        const gauntlet = new THREE.Mesh(gauntletGeometry, goldMaterial);
        gauntlet.position.set(side * 0.93, 0.55, 0.04);
        root.add(gauntlet);
      }

      const head = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.36, 16, 12)), armorMaterial);
      head.position.y = 1.78;
      root.add(head);

      const crownBand = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.38, 0.42, 0.18, 12)), goldMaterial);
      crownBand.position.y = 2.06;
      root.add(crownBand);

      const crownSpikeGeometry = rememberGeometry(new THREE.ConeGeometry(0.1, 0.42, 8));
      for (const x of [-0.25, 0, 0.25]) {
        const spike = new THREE.Mesh(crownSpikeGeometry, goldMaterial);
        spike.position.set(x, x === 0 ? 2.38 : 2.3, 0);
        root.add(spike);
      }

      const core = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.15, 14, 10)), emberMaterial);
      core.position.set(0, 1.17, 0.61);
      root.add(core);

      const collar = new THREE.Mesh(rememberGeometry(new THREE.TorusGeometry(0.46, 0.06, 8, 24)), emberMaterial);
      collar.position.set(0, 1.54, 0.08);
      collar.rotation.x = Math.PI / 2;
      root.add(collar);

      const weaponShaft = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.045, 0.045, 1.55, 8)), goldMaterial);
      weaponShaft.position.set(1.04, 1.03, 0.02);
      weaponShaft.rotation.z = -0.12;
      root.add(weaponShaft);

      const weaponHead = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.25, 0.6, 10)), emberMaterial);
      weaponHead.position.set(1.13, 1.84, 0.02);
      weaponHead.rotation.z = -0.12;
      root.add(weaponHead);

      scene.add(root);
      return root;
    };

    const buildProjectilePool = () => {
      if (!scene || !THREE) return;
      const geometry = rememberGeometry(new THREE.BoxGeometry(0.09, 0.09, 0.76));
      for (let index = 0; index < MAX_PROJECTILES; index++) {
        const material = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xf3d7a0, transparent: true, opacity: 0.94, depthWrite: false }));
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
        slot.mesh.position.set(start.x + dx * progress, effect.id.startsWith('boss-shot-') ? 1.18 : 0.94, start.z + dz * progress);
        slot.mesh.rotation.y = Math.atan2(dx, dz);
        slot.material.color.set(effect.color);
        slot.material.opacity = Math.max(0.34, 0.96 - progress * 0.42);
        const pulse = 0.94 + Math.sin(now * 0.018 + slotIndex) * 0.08;
        slot.mesh.scale.set(effect.id.startsWith('boss-shot-') ? 1.4 : pulse, pulse, pulse);
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
      telegraph.position.set(point.x, 0.05, point.z);
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
          mobileBossSource: mobileBossRig ? 'kaykit-knight' : mobileBossFallback ? 'fallback' : 'desktop-library',
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
        if (desktopBoss) {
          desktopBoss.root.position.set(bossPoint.x, 0, bossPoint.z);
          desktopBoss.root.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          if (qualityLevel < 2 || animationFrameCounter % 2 === 0) updateKayKitEnemyVisual(desktopBoss, boss, delta, now);
        }
        if (mobileBossRig) {
          mobileBossRig.root.position.set(bossPoint.x, 0, bossPoint.z);
          mobileBossRig.root.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          mobileBossRig.setMoving(boss.state === 'chase' && Math.hypot(boss.vx, boss.vy) > 0.05);
          if (boss.lastAttackTime > lastBossAttack) {
            lastBossAttack = boss.lastAttackTime;
            mobileBossRig.triggerAttack();
          }
          if (qualityLevel < 2 || animationFrameCounter % 2 === 0) mobileBossRig.update(delta, now);
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          mobileBossRig.root.scale.setScalar(1.54 + attackPulse * 0.035);
        }
        if (mobileBossFallback) {
          mobileBossFallback.position.set(bossPoint.x, Math.sin(now * 0.003) * 0.025, bossPoint.z);
          mobileBossFallback.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          if (boss.lastAttackTime > lastBossAttack) lastBossAttack = boss.lastAttackTime;
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          mobileBossFallback.scale.setScalar(1.28 + attackPulse * 0.06);
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
      scene.background = new THREE.Color(0x07090d);
      scene.fog = new THREE.Fog(0x07090d, 25, 46);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      camera = new THREE.OrthographicCamera(-5.85, 5.85, 12, -12, 0.1, 70);
      scene.add(new THREE.AmbientLight(0xd9d4d2, 1.05));
      scene.add(new THREE.HemisphereLight(0xffd2ad, 0x121722, 0.78));
      const keyLight = new THREE.DirectionalLight(0xffb274, 1.28);
      keyLight.position.set(-5, 11, 8);
      keyLight.castShadow = false;
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x7d9fd8, 0.46);
      fillLight.position.set(6, 8, -5);
      fillLight.castShadow = false;
      scene.add(fillLight);

      buildArena();
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
      playerRig.root.scale.setScalar(IS_MOBILE ? 1.04 : 1.1);
      scene.add(playerRig.root);

      const boss = state()?.enemies.find(enemy => enemy.enemyType === 'boss');
      if (!boss) throw new Error('World boss entity missing');
      if (IS_MOBILE) {
        try {
          mobileBossRig = await loadWorldBossMobileRig(THREE, GLTFLoader);
          if (disposed) return;
          scene.add(mobileBossRig.root);
        } catch (error) {
          console.warn('Lightweight KayKit Ash King unavailable; using procedural fallback', error);
          mobileBossFallback = buildFallbackMobileBoss();
        }
      } else {
        const loadedBoss = await createKayKitEnemyVisual(THREE, boss);
        if (disposed) return;
        if (!loadedBoss) throw new Error('World boss visual could not be created');
        desktopBoss = loadedBoss;
        desktopBoss.statusRoot.visible = false;
        if (desktopBoss.bossAura) desktopBoss.bossAura.visible = false;
        if (desktopBoss.bossCore) desktopBoss.bossCore.visible = false;
        desktopBoss.root.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
        });
        scene.add(desktopBoss.root);
      }

      clock = new THREE.Clock();
      resize();
      const current = state();
      if (!current || !playerRig || (!mobileBossRig && !mobileBossFallback && !desktopBoss)) throw new Error('World boss stage incomplete');
      const bossEntity = current.enemies.find(enemy => enemy.enemyType === 'boss');
      if (!bossEntity) throw new Error('World boss entity disappeared during load');
      const playerPoint = mapPoint(current.player.x + current.player.width / 2, current.player.y + current.player.height / 2);
      const bossPoint = mapPoint(bossEntity.x + bossEntity.width / 2, bossEntity.y + bossEntity.height / 2);
      playerRig.root.position.set(playerPoint.x, 0, playerPoint.z);
      if (mobileBossRig) {
        mobileBossRig.root.position.set(bossPoint.x, 0, bossPoint.z);
        mobileBossRig.root.scale.setScalar(1.54);
      }
      if (mobileBossFallback) {
        mobileBossFallback.position.set(bossPoint.x, 0, bossPoint.z);
        mobileBossFallback.scale.setScalar(1.28);
      }
      if (desktopBoss) desktopBoss.root.position.set(bossPoint.x, 0, bossPoint.z);
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
    void boot().catch(error => console.error('World boss dedicated renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(readyRaf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      visualViewport?.removeEventListener('resize', resize);
      visualViewport?.removeEventListener('scroll', resize);
      playerRig?.stop();
      mobileBossRig?.stop();
      desktopBoss?.mixer?.stopAllAction?.();
      if (playerRig?.root) disposeModel(playerRig.root);
      if (desktopBoss?.root) disposeModel(desktopBoss.root);
      if (mobileBossRig?.root) disposeModel(mobileBossRig.root);
      ownedGeometries.forEach(geometry => geometry?.dispose?.());
      ownedMaterials.forEach(material => material?.dispose?.());
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
      projectileSlots.length = 0;
      playerRig = null;
      desktopBoss = null;
      mobileBossRig = null;
      mobileBossFallback = null;
      telegraph = null;
      scene = null;
      camera = null;
      renderer = null;
    };
  }, [engineRef]);

  return <div ref={hostRef} className="pointer-events-none fixed inset-0 overflow-hidden" style={{ width: '100vw', height: '100dvh' }} />;
}
