import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { loadWorldBossMobileRig, type WorldBossMobileRig } from './worldBossMobileVisual3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (IS_ANDROID || IS_IOS || navigator.maxTouchPoints > 1);
const MAX_PROJECTILES = IS_MOBILE ? 3 : 8;
const EMBER_COUNT = IS_MOBILE ? 6 : 20;
const PERF_KEY = 'dungeon-veil-worldboss-performance';
const DUNGEON = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';

const ARENA_MODELS = {
  wall: `${DUNGEON}/wall.gltf`,
  arch: `${DUNGEON}/wall_arched.gltf`,
  pillar: `${DUNGEON}/pillar_decorated.gltf`,
  torch: `${DUNGEON}/torch_lit.gltf`,
} as const;

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type ProjectileSlot = { mesh: any; material: any; fireCore: any; fireGlow: any; fireMaterial: any; glowMaterial: any };

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
    let arena: any;
    let playerRig: KayKitPlayerRig | null = null;
    let bossRig: WorldBossMobileRig | null = null;
    let fallbackBoss: any;
    let bossShadow: any;
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
    const ownedTextures: any[] = [];

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

    const disposeObject = (root: any) => root?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const pixelRatio = () => {
      const ratio = window.devicePixelRatio || 1;
      if (!IS_MOBILE) return Math.min(ratio, qualityLevel ? 1.1 : 1.35);
      if (qualityLevel >= 2) return IS_ANDROID ? 0.56 : 0.64;
      if (qualityLevel >= 1) return IS_ANDROID ? 0.66 : 0.76;
      return Math.min(ratio, IS_ANDROID ? 0.76 : 0.9);
    };

    const frameInterval = () => {
      if (!IS_MOBILE || qualityLevel === 0) return 0;
      return qualityLevel >= 2 ? 42 : 33;
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
      camera.fov = camera.aspect < 0.7 ? 49 : 44;
      camera.updateProjectionMatrix();
    };

    const buildStoneFloorTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      if (!context) return null;

      context.fillStyle = '#5d493f';
      context.fillRect(0, 0, 1024, 1024);
      const columns = 6;
      const rows = 8;
      const cellWidth = 1024 / columns;
      const cellHeight = 1024 / rows;

      for (let row = 0; row < rows; row++) {
        for (let column = -1; column <= columns; column++) {
          const offset = row % 2 ? cellWidth * 0.5 : 0;
          const x = column * cellWidth - offset;
          const y = row * cellHeight;
          const seed = row * 17 + column * 29;
          const insetA = 7 + Math.abs(seed % 6);
          const insetB = 6 + Math.abs((seed * 3) % 7);
          context.beginPath();
          context.moveTo(x + insetA, y + 7);
          context.lineTo(x + cellWidth - insetB, y + 4 + Math.abs(seed % 5));
          context.lineTo(x + cellWidth - 6, y + cellHeight - 8);
          context.lineTo(x + 8 + Math.abs((seed * 5) % 5), y + cellHeight - 4);
          context.closePath();
          context.fillStyle = (row + column) % 3 === 0 ? '#765c4c' : (row + column) % 3 === 1 ? '#6b5347' : '#806451';
          context.fill();
          context.strokeStyle = '#352923';
          context.lineWidth = 7;
          context.stroke();

          context.strokeStyle = 'rgba(37, 26, 22, 0.45)';
          context.lineWidth = 3;
          context.beginPath();
          const crackX = x + cellWidth * (0.32 + (Math.abs(seed % 19) / 100));
          const crackY = y + cellHeight * 0.28;
          context.moveTo(crackX, crackY);
          context.lineTo(crackX + 18, crackY + 20);
          context.lineTo(crackX + 7, crackY + 42);
          context.stroke();
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() ?? 1, 2);
      texture.needsUpdate = true;
      ownedTextures.push(texture);
      return texture;
    };

    const loadArena = async (GLTFLoader: any) => {
      if (!scene) return;
      const manifest = await loadKayKitManifest();
      const loader = new GLTFLoader();
      const entries = await Promise.all(Object.entries(ARENA_MODELS).map(async ([key, path]) => {
        try { return [key, (await loader.loadAsync(modelUrl(manifest, path))).scene] as const; }
        catch (error) { console.warn(`World boss asset unavailable: ${path}`, error); return [key, null] as const; }
      }));
      if (disposed) return;

      const models = Object.fromEntries(entries) as Record<keyof typeof ARENA_MODELS, any>;
      const root = new THREE.Group();
      root.name = 'AshKingLowCostKayKitHall';
      const backZ = -12;
      const daisZ = -8.35;
      const stone = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x493f43, roughness: 0.88, metalness: 0.03 }));
      const trim = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x70594c, roughness: 0.76, metalness: 0.08 }));

      const floor = new THREE.Mesh(
        keepGeometry(new THREE.PlaneGeometry(24, 32, 1, 1)),
        keepMaterial(new THREE.MeshStandardMaterial({ map: buildStoneFloorTexture(), color: 0xffffff, roughness: 0.96, metalness: 0.01 })),
      );
      floor.name = 'AshKingDetailedSingleFloor';
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.015, 0);
      floor.receiveShadow = !IS_MOBILE;
      root.add(floor);

      const addModel = (prototype: any, x: number, y: number, z: number, scale: number, rotation = 0, name = '') => {
        if (!prototype) return;
        const object = prototype.clone(true);
        object.position.set(x, y, z);
        object.rotation.y = rotation;
        object.scale.setScalar(scale);
        if (name) object.name = name;
        object.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = false;
          node.receiveShadow = !IS_MOBILE;
          node.frustumCulled = true;
        });
        root.add(object);
      };

      for (const x of [-8, -4, 0, 4, 8]) addModel(models.wall, x, 0, backZ, 2, 0, `BossBackWall_${x}`);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(0.52, 0.54, 20)), stone);
        rail.name = `BossSideBoundary_${side}`;
        rail.position.set(side * 10.25, 0.25, -1.5);
        root.add(rail);
      }

      const lower = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(10.2, 0.36, 4.2)), stone);
      lower.name = 'AshKingRaisedDais';
      lower.position.set(0, 0.16, daisZ);
      root.add(lower);
      const upper = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(7.2, 0.34, 2.35)), trim);
      upper.position.set(0, 0.47, daisZ - 0.72);
      root.add(upper);
      for (let index = 0; index < 2; index++) {
        const step = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(6.3 + index * 0.75, 0.16, 0.68)), index ? stone : trim);
        step.position.set(0, 0.08 + index * 0.13, daisZ + 1.45 - index * 0.45);
        root.add(step);
      }

      addModel(models.arch, 0, 0, backZ + 0.15, 1.8, Math.PI, 'VeilGateArch');
      for (const side of [-1, 1]) {
        addModel(models.pillar, side * 5.0, 0, daisZ - 0.85, 1.48, 0, `BossPillar_${side}`);
        addModel(models.torch, side * 3.15, 1.0, daisZ - 0.1, 1.22, Math.PI, `BossTorch_${side}`);
      }

      scene.add(root);
      arena = root;
    };

    const buildFallbackBoss = () => {
      const root = new THREE.Group();
      root.name = 'AshKingVeilFallback';
      const dark = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x23191f, roughness: 0.8, metalness: 0.12 }));
      const bone = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xa99b83, roughness: 0.7, metalness: 0.08 }));
      const body = new THREE.Mesh(keepGeometry(new THREE.ConeGeometry(0.95, 2.6, 10)), dark);
      body.position.y = 1.3;
      root.add(body);
      const shoulders = new THREE.Mesh(keepGeometry(new THREE.BoxGeometry(2.3, 0.5, 0.84)), dark);
      shoulders.position.y = 2.1;
      root.add(shoulders);
      const head = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(0.42, 12, 8)), bone);
      head.position.y = 2.65;
      root.add(head);
      scene.add(root);
      return root;
    };

    const buildBossShadow = () => {
      const shadow = new THREE.Mesh(
        keepGeometry(new THREE.CircleGeometry(2.0, 24)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false })),
      );
      shadow.name = 'AshKingGroundShadow';
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.018;
      scene.add(shadow);
      return shadow;
    };

    const buildProjectilePool = () => {
      const arrowGeometry = keepGeometry(new THREE.CapsuleGeometry(0.05, 0.5, 3, 6));
      const fireCoreGeometry = keepGeometry(new THREE.IcosahedronGeometry(0.42, 1));
      const fireGlowGeometry = keepGeometry(new THREE.SphereGeometry(0.72, 14, 10));
      for (let index = 0; index < MAX_PROJECTILES; index++) {
        const material = keepMaterial(new THREE.MeshBasicMaterial({ color: 0xf4d7a3, transparent: true, opacity: 0.9, depthWrite: false }));
        const mesh = new THREE.Mesh(arrowGeometry, material);
        const fireMaterial = keepMaterial(new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.98, depthWrite: false }));
        const glowMaterial = keepMaterial(new THREE.MeshBasicMaterial({ color: 0xff2f0a, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending }));
        const fireCore = new THREE.Mesh(fireCoreGeometry, fireMaterial);
        const fireGlow = new THREE.Mesh(fireGlowGeometry, glowMaterial);
        mesh.visible = false;
        fireCore.visible = false;
        fireGlow.visible = false;
        scene.add(mesh, fireGlow, fireCore);
        projectileSlots.push({ mesh, material, fireCore, fireGlow, fireMaterial, glowMaterial });
      }
    };

    const buildEmbers = () => {
      const positions = new Float32Array(EMBER_COUNT * 3);
      const seeds = new Float32Array(EMBER_COUNT * 4);
      for (let index = 0; index < EMBER_COUNT; index++) {
        seeds[index * 4] = (Math.random() - 0.5) * 6;
        seeds[index * 4 + 1] = Math.random() * 3.2;
        seeds[index * 4 + 2] = (Math.random() - 0.5) * 4.4;
        seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
      }
      const geometry = keepGeometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(
        geometry,
        keepMaterial(new THREE.PointsMaterial({ color: 0xff9a55, size: 0.07, transparent: true, opacity: 0.52, depthWrite: false, sizeAttenuation: true })),
      );
      points.userData.seeds = seeds;
      scene.add(points);
      return points;
    };

    const syncProjectiles = (now: number) => {
      const current = state();
      if (!current) return;
      projectileSlots.forEach(slot => { slot.mesh.visible = false; slot.fireCore.visible = false; slot.fireGlow.visible = false; });
      let slotIndex = 0;
      for (let index = current.effects.length - 1; index >= 0 && slotIndex < projectileSlots.length; index--) {
        const effect = current.effects[index];
        if (effect.type !== 'beam' || !/^(shot-|pierce-|rico-|boss-shot-)/.test(effect.id)) continue;
        const slot = projectileSlots[slotIndex++];
        const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
        const angle = effect.angle ?? 0;
        const travel = effect.maxRadius / TILE;
        const bossShot = effect.id.startsWith('boss-shot-');
        const projectileX = mapX(effect.x) + Math.cos(angle) * travel * progress;
        const projectileZ = mapZ(effect.y) + Math.sin(angle) * travel * progress;
        if (bossShot) {
          const pulse = 1 + Math.sin(now * 0.024 + slotIndex) * 0.14;
          slot.fireCore.visible = true;
          slot.fireGlow.visible = true;
          slot.fireCore.position.set(projectileX, 1.72, projectileZ);
          slot.fireGlow.position.copy(slot.fireCore.position);
          slot.fireCore.rotation.set(now * 0.003, -angle, now * 0.004);
          slot.fireCore.scale.setScalar(1.55 * pulse);
          slot.fireGlow.scale.setScalar(1.72 + pulse * 0.28);
          slot.fireMaterial.color.set('#ff9a32');
          slot.fireMaterial.opacity = Math.max(0.68, 1 - progress * 0.24);
          slot.glowMaterial.opacity = Math.max(0.16, 0.42 - progress * 0.16);
        } else {
          slot.mesh.visible = true;
          slot.mesh.position.set(projectileX, 1.0, projectileZ);
          slot.mesh.rotation.set(Math.PI / 2, -angle, 0);
          slot.material.color.set('#d8b77a');
          slot.material.opacity = Math.max(0.25, 0.9 - progress * 0.48);
          slot.mesh.scale.setScalar(0.88 + Math.sin(now * 0.018 + slotIndex) * 0.08);
        }
      }
    };

    const syncTelegraph = () => {
      const current = state();
      if (!current || !telegraph) return;
      const effect = [...current.effects].reverse().find(item => item.type === 'circle');
      if (!effect) { telegraph.visible = false; return; }
      const progress = clamp(effect.lifeTime / Math.max(1, effect.maxLifeTime), 0, 1);
      telegraph.visible = true;
      telegraph.position.set(mapX(effect.x), 0.055, mapZ(effect.y));
      telegraph.scale.setScalar(Math.max(0.18, effect.maxRadius / TILE * Math.max(0.22, progress)));
      telegraph.material.opacity = Math.max(0.035, 0.14 * (1 - progress));
    };

    const syncEmbers = (now: number, bossX: number, bossZ: number) => {
      if (!embers || qualityLevel >= 2) return;
      const positions = embers.geometry.attributes.position.array as Float32Array;
      const seeds = embers.userData.seeds as Float32Array;
      for (let index = 0; index < EMBER_COUNT; index++) {
        const offset = index * 3;
        const seed = index * 4;
        const rise = (seeds[seed + 1] + now * (0.00018 + (index % 4) * 0.000012)) % 3.2;
        positions[offset] = bossX + seeds[seed] + Math.sin(now * 0.0008 + seeds[seed + 3]) * 0.12;
        positions[offset + 1] = 0.18 + rise;
        positions[offset + 2] = bossZ + seeds[seed + 2] + Math.cos(now * 0.0009 + seeds[seed + 3]) * 0.1;
      }
      embers.geometry.attributes.position.needsUpdate = true;
    };

    const updateCamera = (delta: number, playerX: number, playerZ: number) => {
      const portrait = camera.aspect < 0.72;
      const focusX = clamp(playerX * 0.12, -0.75, 0.75);
      const focusZ = clamp(playerZ * 0.06, -0.42, 0.42);
      cameraGoal.set(focusX, portrait ? 14.0 : 12.1, focusZ + (portrait ? 19.8 : 16.9));
      camera.position.x = damp(camera.position.x, cameraGoal.x, 1.5, delta);
      camera.position.y = damp(camera.position.y, cameraGoal.y, 1.4, delta);
      camera.position.z = damp(camera.position.z, cameraGoal.z, 1.5, delta);
      cameraLook.set(focusX * 0.25, portrait ? 0.95 : 1.05, -1.65 + focusZ * 0.15);
      camera.lookAt(cameraLook);
      camera.userData.dungeonPlayerX = playerX;
      camera.userData.dungeonPlayerZ = playerZ;
    };

    const updatePerformance = (now: number) => {
      perfFrames += 1;
      const elapsed = now - perfStarted;
      if (elapsed < 2800) return;
      const fps = Math.round(perfFrames * 1000 / elapsed);
      const nextLevel = fps < 24 ? 2 : fps < 44 ? Math.max(qualityLevel, 1) : qualityLevel;
      if (nextLevel !== qualityLevel) {
        qualityLevel = nextLevel;
        resize();
        if (embers) embers.visible = qualityLevel < 2;
      }
      try {
        localStorage.setItem(PERF_KEY, JSON.stringify({
          fps,
          qualityLevel,
          targetFps: qualityLevel >= 2 ? 24 : qualityLevel >= 1 ? 30 : IS_MOBILE ? 60 : 0,
          pixelRatio: pixelRatio(),
          calls: renderer.info?.render?.calls ?? 0,
          triangles: renderer.info?.render?.triangles ?? 0,
          mobileBoss: IS_MOBILE,
          mobileBossSource: bossRig ? 'ash-warden-skeleton' : fallbackBoss ? 'veil-fallback' : 'loading',
          arena: 'single-floor-low-call-kaykit-hall',
          camera: 'calm-perspective-camera',
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
          bossRig.root.scale.setScalar(2.0 + attackPulse * 0.07);
        }
        if (fallbackBoss) {
          fallbackBoss.position.set(bossX, 0, bossZ);
          fallbackBoss.rotation.y = Math.atan2(playerX - bossX, playerZ - bossZ);
          fallbackBoss.scale.setScalar(1.44);
        }
        if (bossShadow) bossShadow.position.set(bossX, 0.018, bossZ);
        if (bossLight) {
          bossLight.position.set(bossX - 3.2, 8.8, bossZ + 3.8);
          bossLight.target.position.set(bossX, 1.15, bossZ);
        }
      }

      syncProjectiles(now);
      syncTelegraph();
      syncEmbers(now, bossX, bossZ);
      updateCamera(delta, playerX, playerZ);
      renderer.render(scene, camera);
      updatePerformance(now);
      if (!renderedOnce) {
        renderedOnce = true;
        readyRaf = requestAnimationFrame(() => { if (!disposed) readyRef.current(); });
      }
    };

    const boot = async () => {
      if (!state()) return;
      await loadKayKitManifest();
      if (disposed || !state()) return;
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed || !state()) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x151116);
      scene.fog = new THREE.Fog(0x151116, 24, 50);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = !IS_MOBILE;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_ANDROID ? 1.08 : 1.04;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(0, 14.0, 19.8);
      cameraGoal = new THREE.Vector3();
      cameraLook = new THREE.Vector3();

      scene.add(new THREE.AmbientLight(0xd6c9bd, IS_ANDROID ? 0.44 : 0.38));
      scene.add(new THREE.HemisphereLight(0xd8bd9e, 0x17131c, IS_ANDROID ? 0.68 : 0.62));
      const key = new THREE.DirectionalLight(0xffbf83, IS_ANDROID ? 1.2 : 1.34);
      key.position.set(-7, 13, 8);
      key.castShadow = !IS_MOBILE;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x777eb8, 0.3);
      fill.position.set(6, 8, -7);
      scene.add(fill);
      bossLight = new THREE.SpotLight(0xff8a52, IS_MOBILE ? 2.0 : 2.9, 23, Math.PI / 5, 0.75, 1.8);
      scene.add(bossLight, bossLight.target);

      const arenaPromise = loadArena(GLTFLoader);
      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(0.98);
      scene.add(playerRig.root);

      try {
        bossRig = await loadWorldBossMobileRig(THREE, GLTFLoader);
        if (disposed) return;
        scene.add(bossRig.root);
      } catch (error) {
        console.warn('Ash King rig unavailable; using simplified fallback', error);
        fallbackBoss = buildFallbackBoss();
      }

      bossShadow = buildBossShadow();
      buildProjectilePool();
      telegraph = new THREE.Mesh(
        keepGeometry(new THREE.CircleGeometry(1, 24)),
        keepMaterial(new THREE.MeshBasicMaterial({ color: 0xb75a35, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
      );
      telegraph.name = 'AshKingSoftTelegraph';
      telegraph.rotation.x = -Math.PI / 2;
      telegraph.visible = false;
      scene.add(telegraph);
      embers = buildEmbers();

      await arenaPromise;
      if (disposed || !arena || !playerRig || (!bossRig && !fallbackBoss)) return;
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
    void boot().catch(error => console.error('World boss low-cost renderer failed', error));

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
      if (arena) disposeObject(arena);
      if (playerRig?.root) disposeObject(playerRig.root);
      if (bossRig?.root) disposeObject(bossRig.root);
      if (fallbackBoss) disposeObject(fallbackBoss);
      ownedTextures.forEach(texture => texture?.dispose?.());
      ownedGeometries.forEach(geometry => geometry?.dispose?.());
      ownedMaterials.forEach(material => material?.dispose?.());
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, [engineRef]);

  return <div ref={hostRef} data-testid="ash-king-perspective-stage" data-camera="calm-perspective-camera" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ width: '100vw', height: '100dvh' }} />;
}
