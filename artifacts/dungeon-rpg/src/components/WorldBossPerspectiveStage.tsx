import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { buildKayKitDungeonRoom, preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { buildKayKitRoomTheme, preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { loadWorldBossMobileRig, type WorldBossMobileRig } from './worldBossMobileVisual3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const VISUAL_ROOM = 20;
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (IS_ANDROID || IS_IOS || navigator.maxTouchPoints > 1);
const MAX_PROJECTILES = IS_MOBILE ? 5 : 10;
const PERF_KEY = 'dungeon-veil-worldboss-performance';
const DUNGEON = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const HALLOWEEN = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

const ARENA_MODELS = {
  arch: `${DUNGEON}/wall_arched.gltf`,
  pillar: `${DUNGEON}/pillar_decorated.gltf`,
  barrier: `${DUNGEON}/barrier_column.gltf`,
  torch: `${DUNGEON}/torch_lit.gltf`,
  banner: `${DUNGEON}/banner_shield_red.gltf`,
  shrine: `${HALLOWEEN}/shrine_candles.gltf`,
} as const;

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type ProjectileSlot = { mesh: any; material: any };

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const damp = (current: number, target: number, speed: number, delta: number) => current + (target - current) * (1 - Math.exp(-speed * delta));

export function WorldBossPerspectiveStage({ engineRef, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let readyRaf = 0;
    let THREE: any;
    let renderer: any;
    let scene: any;
    let camera: any;
    let cameraGoal: any;
    let cameraLook: any;
    let clock: any;
    let roomRoot: any;
    let architecture: any;
    let playerRig: KayKitPlayerRig | null = null;
    let bossRig: WorldBossMobileRig | null = null;
    let fallbackBoss: any;
    let bossAura: any;
    let telegraph: any;
    let embers: any;
    let bossLight: any;
    let lastAttack = 0;
    let lastDodge = 0;
    let lastBossAttack = 0;
    let lastFrameAt = 0;
    let qualityLevel = 0;
    let perfStarted = performance.now();
    let perfFrames = 0;
    let renderedOnce = false;
    const projectileSlots: ProjectileSlot[] = [];
    const ownedGeometries: any[] = [];
    const ownedMaterials: any[] = [];

    const state = () => engineRef.current?.state ?? null;
    const keepGeometry = (geometry: any) => { ownedGeometries.push(geometry); return geometry; };
    const keepMaterial = (material: any) => { ownedMaterials.push(material); return material; };
    const mapX = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.width / 2 + 0.5 : 0;
    };
    const mapZ = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.height / 2 + 0.5 : 0;
    };

    const cleanBossFloorLane = async (shell: any, current: NonNullable<ReturnType<typeof state>>) => {
    await shell.userData?.ready;
    if (disposed) return;
    const floorStep = 4;
    const columns = Math.max(1, Math.floor(current.map.width / floorStep));
    const rows = Math.max(1, Math.floor(current.map.height / floorStep));
    const floorChildren = shell.children.slice(0, columns * rows);
    const cleanPrototype = floorChildren.find((_tile: any, index: number) => (index + VISUAL_ROOM * 3) % 3 !== 0);
    if (!cleanPrototype) return;
    floorChildren.forEach((tile: any, index: number) => {
      const broken = (index + VISUAL_ROOM * 3) % 3 === 0;
      const centralLane = Math.abs(tile.position.x) < 4.2 && tile.position.z > -8.5 && tile.position.z < 10.5;
      if (!broken || !centralLane) return;
      const replacement = cleanPrototype.clone(true);
      replacement.position.copy(tile.position);
      replacement.rotation.copy(tile.rotation);
      replacement.scale.copy(tile.scale);
      replacement.name = `WorldBossCleanFloor_${index}`;
      shell.remove(tile);
      shell.add(replacement);
    });
  };

    const disposeObject = (root: any) => root?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const pixelRatio = () => {
      const ratio = window.devicePixelRatio || 1;
      if (!IS_MOBILE) return Math.min(ratio, qualityLevel ? 1.2 : 1.5);
      if (qualityLevel >= 2) return IS_ANDROID ? 0.62 : 0.7;
      if (qualityLevel >= 1) return IS_ANDROID ? 0.74 : 0.82;
      return Math.min(ratio, IS_ANDROID ? 0.9 : 1);
    };

    const frameInterval = () => {
      if (!IS_MOBILE) return 0;
      if (qualityLevel >= 2) return 50;
      if (qualityLevel >= 1) return 42;
      return 33;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const viewport = window.visualViewport;
      const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
      const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = width / height;
      camera.fov = camera.aspect < 0.7 ? 50 : 44;
      camera.updateProjectionMatrix();
    };

    const loadArchitecture = async (GLTFLoader: any) => {
      const current = state();
      if (!current || !scene) return;
      const manifest = await loadKayKitManifest();
      const loader = new GLTFLoader();
      const entries = await Promise.all(Object.entries(ARENA_MODELS).map(async ([key, path]) => {
        try { return [key, (await loader.loadAsync(modelUrl(manifest, path))).scene] as const; }
        catch (error) { console.warn(`World boss asset unavailable: ${path}`, error); return [key, null] as const; }
      }));
      if (disposed) return;
      const models = Object.fromEntries(entries) as Record<keyof typeof ARENA_MODELS, any>;
      const root = new THREE.Group();
      root.name = 'AshKingPerspectiveSanctum';
      const backZ = -current.map.height / 2 + 2.25;
      const daisZ = backZ + 3.4;
      const sideX = Math.min(7.2, current.map.width / 2 - 2.1);
      const stone = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x453a3d, roughness: 0.86, metalness: 0.05 }));
      const trim = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x685147, roughness: 0.72, metalness: 0.12 }));
      const glow = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xff8b4a, emissive: 0x9b260d, emissiveIntensity: 1.2, roughness: 0.3 }));

      const lower = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(10.8, 0.42, 4.7)), stone);
      lower.name = 'AshKingRaisedDais';
      lower.position.set(0, 0.17, daisZ);
      root.add(lower);
      const upper = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(7.8, 0.42, 2.6)), trim);
      upper.position.set(0, 0.5, daisZ - 0.85);
      root.add(upper);
      for (let index = 0; index < 3; index++) {
        const step = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(5.8 + index * 0.9, 0.18, 0.74)), index % 2 ? stone : trim);
        step.position.set(0, 0.09 + index * 0.13, daisZ + 1.75 - index * 0.48);
        root.add(step);
      }

      const seal = new THREE.Mesh(
        keepGeometry(new THREE.RingGeometry(1.35, 2.15, IS_MOBILE ? 36 : 64, 1, 0.25, Math.PI * 1.75)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0xff7442, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })),
      );
      seal.name = 'AshKingPerspectiveSeal';
      seal.rotation.x = -Math.PI / 2;
      seal.position.set(0, 0.74, daisZ - 0.45);
      root.add(seal);

      const addModel = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
        if (!prototype) return;
        const object = prototype.clone(true);
        object.position.set(x, y, z);
        object.rotation.y = rotation;
        object.scale.setScalar(scale);
        if (name) object.name = name;
        object.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = !IS_MOBILE;
          node.receiveShadow = true;
        });
        root.add(object);
      };

      addModel(models.arch, 0, 0, backZ, 1.85, Math.PI, 'VeilGateArch');
      addModel(models.shrine, 0, 0.72, backZ + 0.5, 1.6, 0, 'AshKingCandleShrine');
      for (const side of [-1, 1]) {
        addModel(models.pillar, side * sideX, 0, daisZ - 0.8, 1.65);
        addModel(models.barrier, side * (sideX - 1.15), 0.46, daisZ + 1.85, 1.35);
        addModel(models.torch, side * (sideX - 0.25), 1.05, daisZ - 0.1, 1.4, Math.PI);
        addModel(models.banner, side * (sideX + 0.1), 3.1, backZ + 0.25, 1.35, Math.PI);
      }

      const throne = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(3.25, 3.55, 0.72)), stone);
      throne.name = 'BrokenAshThronePerspective';
      throne.position.set(0, 2.42, backZ + 0.55);
      root.add(throne);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(keepGeometry(new THREE.ConeGeometry(0.32, 2.15, 7)), trim);
        horn.position.set(side * 1.42, 4.02, backZ + 0.58);
        horn.rotation.z = side * -0.22;
        root.add(horn);
      }
      for (const [x, z, length, rotation] of [[-1.25, daisZ + 1.4, 1.6, -0.55], [1.15, daisZ + 1.0, 1.45, 0.46], [-2.1, daisZ - 0.15, 1.1, -0.18], [2.05, daisZ - 0.35, 1.2, 0.28]] as Array<[number, number, number, number]>) {
        const crack = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(0.075, 0.035, length)), glow);
        crack.position.set(x, 0.73, z);
        crack.rotation.y = rotation;
        root.add(crack);
      }
      root.userData.seal = seal;
      scene.add(root);
      architecture = root;
    };

    const buildFallbackBoss = () => {
      const root = new THREE.Group();
      root.name = 'AshKingVeilFallback';
      const dark = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x23191f, roughness: 0.78, metalness: 0.18 }));
      const bone = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xa99b83, roughness: 0.68, metalness: 0.1 }));
      const glow = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xff8246, emissive: 0xa3290c, emissiveIntensity: 1.35, roughness: 0.28 }));
      const body = new THREE.Mesh(keepGeometry(new THREE.ConeGeometry(0.95, 2.6, 12)), dark);
      body.position.y = 1.3;
      root.add(body);
      const shoulders = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(2.35, 0.52, 0.86)), dark);
      shoulders.position.y = 2.1;
      root.add(shoulders);
      const head = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(0.42, 14, 10)), bone);
      head.position.y = 2.65;
      root.add(head);
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(keepGeometry(new THREE.ConeGeometry(0.13, 0.86, 7)), bone);
        horn.position.set(side * 0.28, 3.22, 0);
        horn.rotation.z = side * -0.28;
        root.add(horn);
      }
      const core = new THREE.Mesh(keepGeometry(new THREE.OctahedronGeometry(0.25, 1)), glow);
      core.position.set(0, 1.72, 0.58);
      root.add(core);
      scene.add(root);
      return root;
    };

    const buildBossAura = () => {
      const root = new THREE.Group();
      root.name = 'AshKingDominanceAura';
      const shadow = new THREE.Mesh(
        keepGeometry(new THREE.CircleGeometry(2.15, 44)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.52, depthWrite: false })),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.018;
      root.add(shadow);
      const ring = new THREE.Mesh(
        keepGeometry(new THREE.RingGeometry(1.35, 2.25, 52, 1, 0.2, Math.PI * 1.78)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0xf06133, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035;
      root.add(ring);
      root.userData.ring = ring;
      scene.add(root);
      return root;
    };

    const buildProjectilePool = () => {
      const geometry = keepGeometry(new THREE.CapsuleGeometry(0.055, 0.58, 4, 7));
      for (let index = 0; index < MAX_PROJECTILES; index++) {
        const material = keepMaterial(new THREE.MeshBasicMaterial({ color: 0xf4d7a3, transparent: true, opacity: 0.94, depthWrite: false }));
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        scene.add(mesh);
        projectileSlots.push({ mesh, material });
      }
    };

    const buildEmbers = () => {
      const count = IS_MOBILE ? 30 : 64;
      const positions = new Float32Array(count * 3);
      const seeds = new Float32Array(count * 4);
      for (let index = 0; index < count; index++) {
        seeds[index * 4] = (Math.random() - 0.5) * 8;
        seeds[index * 4 + 1] = Math.random() * 4.5;
        seeds[index * 4 + 2] = (Math.random() - 0.5) * 6;
        seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
      }
      const geometry = keepGeometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(
        geometry,
        keepMaterial(new THREE.PointsMaterial({ color: 0xff9a55, size: IS_MOBILE ? 0.085 : 0.105, transparent: true, opacity: 0.72, depthWrite: false, sizeAttenuation: true })),
      );
      points.userData.seeds = seeds;
      scene.add(points);
      return points;
    };

    const syncProjectiles = (now: number) => {
      const current = state();
      if (!current) return;
      projectileSlots.forEach(slot => { slot.mesh.visible = false; });
      let slotIndex = 0;
      for (let index = current.effects.length - 1; index >= 0 && slotIndex < projectileSlots.length; index--) {
        const effect = current.effects[index];
        if (effect.type !== 'beam' || !/^(shot-|pierce-|rico-|boss-shot-)/.test(effect.id)) continue;
        const slot = projectileSlots[slotIndex++];
        const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
        const angle = effect.angle ?? 0;
        const travel = effect.maxRadius / TILE;
        const bossShot = effect.id.startsWith('boss-shot-');
        slot.mesh.visible = true;
        slot.mesh.position.set(mapX(effect.x) + Math.cos(angle) * travel * progress, bossShot ? 1.6 : 1.05, mapZ(effect.y) + Math.sin(angle) * travel * progress);
        slot.mesh.rotation.set(Math.PI / 2, -angle, 0);
        slot.material.color.set(effect.color);
        slot.material.opacity = Math.max(0.3, 0.96 - progress * 0.44);
        slot.mesh.scale.setScalar(bossShot ? 1.5 : 0.92 + Math.sin(now * 0.02 + slotIndex) * 0.12);
      }
    };

    const syncTelegraph = () => {
      const current = state();
      if (!current || !telegraph) return;
      const effect = [...current.effects].reverse().find(item => item.type === 'circle');
      if (!effect) { telegraph.visible = false; return; }
      const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
      telegraph.visible = true;
      telegraph.position.set(mapX(effect.x), 0.07, mapZ(effect.y));
      telegraph.scale.setScalar(Math.max(0.18, effect.maxRadius / TILE * Math.max(0.22, progress)));
      telegraph.material.color.set(effect.color);
      telegraph.material.opacity = Math.max(0.1, 0.48 * (1 - progress));
    };

    const syncEmbers = (now: number, bossX: number, bossZ: number) => {
      if (!embers) return;
      const positions = embers.geometry.attributes.position.array as Float32Array;
      const seeds = embers.userData.seeds as Float32Array;
      for (let index = 0; index < positions.length / 3; index++) {
        const offset = index * 3;
        const seed = index * 4;
        const rise = (seeds[seed + 1] + now * (0.00022 + (index % 5) * 0.000018)) % 4.5;
        positions[offset] = bossX + seeds[seed] + Math.sin(now * 0.001 + seeds[seed + 3]) * 0.22;
        positions[offset + 1] = 0.18 + rise;
        positions[offset + 2] = bossZ + seeds[seed + 2] + Math.cos(now * 0.0012 + seeds[seed + 3]) * 0.18;
      }
      embers.geometry.attributes.position.needsUpdate = true;
    };

    const updateCamera = (delta: number, playerX: number, playerZ: number, bossX: number, bossZ: number) => {
    const portrait = camera.aspect < 0.72;
    const focusX = clamp(
      playerX * (portrait ? 0.56 : 0.44) + bossX * (portrait ? 0.44 : 0.56),
      -3.6,
      3.6,
    );
    const focusZ = clamp(
      playerZ * (portrait ? 0.62 : 0.46) + bossZ * (portrait ? 0.38 : 0.54) + (portrait ? 0.65 : 0.2),
      -2.2,
      4.6,
    );
    const spread = Math.hypot(playerX - bossX, playerZ - bossZ);
    const extra = clamp((spread - 10) * 0.22, 0, 2.6);
    cameraGoal.set(
      focusX,
      (portrait ? 13.7 : 11.9) + extra * 0.34,
      focusZ + (portrait ? 19.6 : 16.7) + extra,
    );
    camera.position.x = damp(camera.position.x, cameraGoal.x, 5.8, delta);
    camera.position.y = damp(camera.position.y, cameraGoal.y, 5.2, delta);
    camera.position.z = damp(camera.position.z, cameraGoal.z, 5.8, delta);
    cameraLook.set(focusX, portrait ? 0.92 : 1.08, focusZ - (portrait ? 1.65 : 3.15));
    camera.lookAt(cameraLook);
    camera.userData.dungeonPlayerX = playerX;
    camera.userData.dungeonPlayerZ = playerZ;
  };

    const updatePerformance = (now: number) => {
      perfFrames += 1;
      const elapsed = now - perfStarted;
      if (elapsed < 2200) return;
      const fps = Math.round(perfFrames * 1000 / elapsed);
      const nextLevel = fps < 19 ? 2 : fps < 27 ? Math.max(qualityLevel, 1) : qualityLevel;
      if (nextLevel !== qualityLevel) { qualityLevel = nextLevel; resize(); }
      try {
        localStorage.setItem(PERF_KEY, JSON.stringify({
          fps,
          qualityLevel,
          targetFps: qualityLevel >= 2 ? 20 : qualityLevel >= 1 ? 24 : IS_MOBILE ? 30 : 0,
          pixelRatio: pixelRatio(),
          calls: renderer.info?.render?.calls ?? 0,
          triangles: renderer.info?.render?.triangles ?? 0,
          mobileBoss: IS_MOBILE,
          mobileBossSource: bossRig ? 'ash-warden-skeleton' : fallbackBoss ? 'veil-fallback' : 'loading',
          arena: 'kaykit-perspective-boss-sanctum',
          camera: 'perspective-run-camera',
          at: Date.now(),
        }));
      } catch {}
      perfFrames = 0;
      perfStarted = now;
    };

    const renderLoop = (now: number) => {
      if (disposed || !renderer || !scene || !camera || !clock) return;
      raf = requestAnimationFrame(renderLoop);
      const interval = frameInterval();
      if (interval && now - lastFrameAt < interval) return;
      lastFrameAt = now;
      const current = state();
      if (!current) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const playerX = mapX(current.player.x + current.player.width / 2);
      const playerZ = mapZ(current.player.y + current.player.height / 2);
      const boss = current.enemies.find(enemy => enemy.enemyType === 'boss');
      const bossX = boss ? mapX(boss.x + boss.width / 2) : 0;
      const bossZ = boss ? mapZ(boss.y + boss.height / 2) : -5;

      if (playerRig) {
        playerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(current.player.facing.x, current.player.facing.y) > 0.1) playerRig.root.rotation.y = Math.atan2(current.player.facing.x, current.player.facing.y);
        playerRig.setMoving(current.player.state === 'moving');
        if (current.player.lastAttackTime > lastAttack) { lastAttack = current.player.lastAttackTime; playerRig.triggerAttack(); }
        if (current.player.lastDodgeTime > lastDodge) { lastDodge = current.player.lastDodgeTime; playerRig.triggerDash(); }
        playerRig.update(delta);
      }

      if (boss) {
        if (bossRig) {
          bossRig.root.position.set(bossX, 0, bossZ);
          bossRig.root.rotation.y = Math.atan2(playerX - bossX, playerZ - bossZ);
          bossRig.setMoving(boss.state === 'chase' && Math.hypot(boss.vx, boss.vy) > 0.05);
          if (boss.lastAttackTime > lastBossAttack) { lastBossAttack = boss.lastAttackTime; bossRig.triggerAttack(); }
          bossRig.update(delta, now);
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 430);
          bossRig.root.scale.setScalar(2.05 + attackPulse * 0.09);
        }
        if (fallbackBoss) {
          fallbackBoss.position.set(bossX, Math.sin(now * 0.003) * 0.035, bossZ);
          fallbackBoss.rotation.y = Math.atan2(playerX - bossX, playerZ - bossZ);
          fallbackBoss.scale.setScalar(1.46);
        }
        if (bossAura) {
          bossAura.position.set(bossX, 0, bossZ);
          bossAura.userData.ring.rotation.z = now * 0.00045;
          bossAura.userData.ring.material.opacity = 0.29 + Math.sin(now * 0.003) * 0.1;
        }
        if (bossLight) {
          bossLight.position.set(bossX - 3.5, 9.5, bossZ + 4.2);
          bossLight.target.position.set(bossX, 1.1, bossZ);
        }
      }

      if (architecture?.userData?.seal) {
        architecture.userData.seal.rotation.z = now * 0.00022;
        architecture.userData.seal.material.opacity = 0.42 + Math.sin(now * 0.0024) * 0.12;
      }
      syncProjectiles(now);
      syncTelegraph();
      syncEmbers(now, bossX, bossZ);
      updateCamera(delta, playerX, playerZ, bossX, bossZ);
      renderer.render(scene, camera);
      updatePerformance(now);
      if (!renderedOnce) {
        renderedOnce = true;
        readyRaf = requestAnimationFrame(() => { if (!disposed) readyRef.current(); });
      }
    };

    const boot = async () => {
      if (!state()) return;
      await Promise.all([loadKayKitManifest(), preloadKayKitDungeonRoom(VISUAL_ROOM), preloadKayKitRoomTheme(VISUAL_ROOM)]);
      if (disposed || !state()) return;
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed || !state()) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x151116);
      scene.fog = new THREE.Fog(0x151116, 22, 54);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_ANDROID, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = !IS_MOBILE;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_ANDROID ? 1.14 : 1.08;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);
      camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(0, 12.8, 17.6);
      cameraGoal = new THREE.Vector3();
      cameraLook = new THREE.Vector3();

      scene.add(new THREE.AmbientLight(0xd6c9bd, IS_ANDROID ? 0.72 : 0.62));
      scene.add(new THREE.HemisphereLight(0xd8bd9e, 0x17131c, IS_ANDROID ? 1.08 : 0.92));
      const key = new THREE.DirectionalLight(0xffbf83, IS_ANDROID ? 1.5 : 1.72);
      key.position.set(-7, 13, 8);
      key.castShadow = !IS_MOBILE;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x7f82c8, 0.54);
      fill.position.set(6, 8, -7);
      scene.add(fill);
      bossLight = new THREE.SpotLight(0xff8a52, IS_MOBILE ? 2.8 : 4, 25, Math.PI / 5, 0.7, 1.8);
      scene.add(bossLight, bossLight.target);

      const current = state();
      if (!current) return;
      roomRoot = new THREE.Group();
      roomRoot.name = 'KayKitWorldBossPerspectiveRoom';
      const shell = buildKayKitDungeonRoom(THREE, VISUAL_ROOM, current.map.width, current.map.height);
      const theme = buildKayKitRoomTheme(THREE, VISUAL_ROOM);
      roomRoot.add(shell, theme);
      roomRoot.userData.shell = shell;
      roomRoot.userData.theme = theme;
      scene.add(roomRoot);
      void cleanBossFloorLane(shell, current);
      const architecturePromise = loadArchitecture(GLTFLoader);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(0.98);
      scene.add(playerRig.root);
      try {
        bossRig = await loadWorldBossMobileRig(THREE, GLTFLoader);
        if (disposed) return;
        scene.add(bossRig.root);
      } catch (error) {
        console.warn('Ash King rig unavailable; using perspective fallback', error);
        fallbackBoss = buildFallbackBoss();
      }

      bossAura = buildBossAura();
      buildProjectilePool();
      telegraph = new THREE.Mesh(
        keepGeometry(new THREE.RingGeometry(0.82, 1, 40)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0xff7247, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
      );
      telegraph.rotation.x = -Math.PI / 2;
      telegraph.visible = false;
      scene.add(telegraph);
      embers = buildEmbers();

      await Promise.all([shell.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve(), architecturePromise]);
      if (disposed || !playerRig || (!bossRig && !fallbackBoss)) return;
      clock = new THREE.Clock();
      resize();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const viewport = window.visualViewport;
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    void boot().catch(error => console.error('World boss perspective renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(readyRaf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      playerRig?.stop();
      bossRig?.stop();
      roomRoot?.userData?.shell?.userData?.dispose?.();
      roomRoot?.userData?.theme?.userData?.dispose?.();
      if (roomRoot) disposeObject(roomRoot);
      if (architecture) disposeObject(architecture);
      if (playerRig?.root) disposeObject(playerRig.root);
      if (bossRig?.root) disposeObject(bossRig.root);
      if (fallbackBoss) disposeObject(fallbackBoss);
      ownedGeometries.forEach(geometry => geometry?.dispose?.());
      ownedMaterials.forEach(material => material?.dispose?.());
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, [engineRef]);

  return <div ref={hostRef} data-testid="ash-king-perspective-stage" data-camera="perspective-run-camera" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ width: '100vw', height: '100dvh' }} />;
}
