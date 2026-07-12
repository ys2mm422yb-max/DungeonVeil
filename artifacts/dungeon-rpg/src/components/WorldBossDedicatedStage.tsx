import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const ARENA_WIDTH = 9.2;
const ARENA_DEPTH = 13.6;
const ARENA_INNER_X = 3.5;
const ARENA_INNER_Z = 3.6;
const ARENA_Z_OFFSET = 0.3;
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
    let mobileBoss: any = null;
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
      if (!current) return { x: 0, z: ARENA_Z_OFFSET };
      const mapWidth = Math.max(1, current.map.width * TILE);
      const mapDepth = Math.max(1, current.map.height * TILE);
      const normalizedX = worldX / mapWidth - 0.5;
      const normalizedZ = worldY / mapDepth - 0.5;
      return {
        x: clamp(normalizedX * ARENA_INNER_X * 2, -ARENA_INNER_X, ARENA_INNER_X),
        z: clamp(normalizedZ * ARENA_INNER_Z * 2 + ARENA_Z_OFFSET, -ARENA_INNER_Z + ARENA_Z_OFFSET, ARENA_INNER_Z + ARENA_Z_OFFSET),
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
      if (!IS_MOBILE) return Math.min(window.devicePixelRatio || 1, 1.1);
      if (qualityLevel >= 2) return 0.4;
      if (qualityLevel >= 1) return 0.47;
      return IS_ANDROID ? 0.5 : 0.55;
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
      const portrait = aspect < 0.72;
      camera.aspect = aspect;
      camera.fov = portrait ? 54 : 46;
      camera.position.set(0, portrait ? 18.5 : 16.4, portrait ? 14.4 : 12.6);
      camera.lookAt(0, 0.62, portrait ? -0.9 : -0.55);
      camera.updateProjectionMatrix();
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, host.clientWidth || window.innerWidth);
      const height = Math.max(1, host.clientHeight || window.innerHeight);
      renderer.setPixelRatio(pixelRatioForQuality());
      renderer.setSize(width, height, false);
      frameCamera(width, height);
    };

    const buildArena = () => {
      if (!scene || !THREE) return;
      const root = new THREE.Group();
      root.name = 'WorldBossDedicatedArena';

      const ashGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH + 0.72, ARENA_DEPTH + 0.72));
      const ashMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x0c0807 }));
      const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
      ashBed.rotation.x = -Math.PI / 2;
      ashBed.position.y = -0.07;
      root.add(ashBed);

      const floorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_DEPTH));
      const floorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x271b16 }));
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      root.add(floor);

      const innerFloorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH - 0.72, ARENA_DEPTH - 0.72));
      const innerFloorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x34231b, transparent: true, opacity: 0.72 }));
      const innerFloor = new THREE.Mesh(innerFloorGeometry, innerFloorMaterial);
      innerFloor.rotation.x = -Math.PI / 2;
      innerFloor.position.y = -0.012;
      root.add(innerFloor);

      const runeGeometry = rememberGeometry(new THREE.RingGeometry(1.58, 1.72, 32));
      const runeMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xd35124, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false }));
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(0, 0.018, -0.15);
      root.add(rune);

      const innerRuneGeometry = rememberGeometry(new THREE.RingGeometry(0.72, 0.78, 24));
      const innerRune = new THREE.Mesh(innerRuneGeometry, runeMaterial);
      innerRune.rotation.x = -Math.PI / 2;
      innerRune.position.set(0, 0.02, -0.15);
      root.add(innerRune);

      const sigilGeometry = rememberGeometry(new THREE.BoxGeometry(0.1, 0.018, 3.55));
      const sigilMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x9f321a, transparent: true, opacity: 0.45, depthWrite: false }));
      const sigilA = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilA.position.set(0, 0.018, -0.15);
      root.add(sigilA);
      const sigilB = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilB.position.set(0, 0.019, -0.15);
      sigilB.rotation.y = Math.PI / 2;
      root.add(sigilB);

      const wallGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1, 1));
      const wallMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x17110f }));
      const sideWallHeight = 0.72;
      const wallTransforms: Array<[number, number, number, number, number]> = [
        [0, -ARENA_DEPTH / 2, ARENA_WIDTH + 0.34, sideWallHeight, 0.34],
        [-ARENA_WIDTH / 2, 0, 0.34, sideWallHeight, ARENA_DEPTH],
        [ARENA_WIDTH / 2, 0, 0.34, sideWallHeight, ARENA_DEPTH],
        [0, ARENA_DEPTH / 2, ARENA_WIDTH + 0.34, 0.18, 0.3],
      ];
      for (const [x, z, sx, sy, sz] of wallTransforms) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, sy / 2, z);
        wall.scale.set(sx, sy, sz);
        root.add(wall);
      }

      const pillarGeometry = rememberGeometry(new THREE.CylinderGeometry(0.36, 0.52, 1.72, 6));
      const pillarMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x3d2c24 }));
      const pillarPositions: Array<[number, number]> = [
        [-3.82, -4.62],
        [3.82, -4.62],
        [-3.82, 4.56],
        [3.82, 4.56],
      ];
      for (const [x, z] of pillarPositions) {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 0.86, z);
        root.add(pillar);
      }

      scene.add(root);
    };

    const buildMobileBoss = () => {
      if (!scene || !THREE) return null;
      const root = new THREE.Group();
      root.name = 'AshKingMobileBoss';

      const darkMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x241612 }));
      const armorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x7d321c }));
      const emberMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff6a25 }));
      const goldMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0xc2913f }));

      const body = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.62, 0.86, 1.65, 7)), darkMaterial);
      body.position.y = 0.9;
      root.add(body);

      const armor = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.78, 1.15, 7, 1, true)), armorMaterial);
      armor.position.y = 1.12;
      armor.rotation.x = Math.PI;
      root.add(armor);

      const head = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.38, 10, 8)), armorMaterial);
      head.position.y = 1.86;
      root.add(head);

      const crown = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.48, 0.58, 5, 1, true)), goldMaterial);
      crown.position.y = 2.32;
      root.add(crown);

      const core = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.17, 8, 6)), emberMaterial);
      core.position.set(0, 1.26, 0.63);
      root.add(core);

      const shadow = new THREE.Mesh(
        rememberGeometry(new THREE.CircleGeometry(0.92, 18)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      root.add(shadow);

      scene.add(root);
      return root;
    };

    const buildProjectilePool = () => {
      if (!scene || !THREE) return;
      const geometry = rememberGeometry(new THREE.BoxGeometry(0.08, 0.08, 0.72));
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
        slot.mesh.position.set(start.x + dx * progress, effect.id.startsWith('boss-shot-') ? 1.12 : 0.9, start.z + dz * progress);
        slot.mesh.rotation.y = Math.atan2(dx, dz);
        slot.material.color.set(effect.color);
        slot.material.opacity = Math.max(0.32, 0.94 - progress * 0.42);
        const pulse = 0.92 + Math.sin(now * 0.018 + slotIndex) * 0.08;
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
      telegraph.position.set(point.x, 0.04, point.z);
      telegraph.scale.setScalar(Math.max(0.12, effect.maxRadius * arenaUnitsPerPixel() * Math.max(0.2, progress)));
      telegraph.material.color.set(effect.color);
      telegraph.material.opacity = Math.max(0.14, 0.72 * (1 - progress));
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
        if (mobileBoss) {
          mobileBoss.position.set(bossPoint.x, Math.sin(now * 0.003) * 0.035, bossPoint.z);
          mobileBoss.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          if (boss.lastAttackTime > lastBossAttack) lastBossAttack = boss.lastAttackTime;
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          mobileBoss.scale.setScalar(1.36 + attackPulse * 0.1);
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
      scene.background = new THREE.Color(0x080504);
      scene.fog = new THREE.Fog(0x080504, 19, 34);
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(54, 1, 0.1, 70);
      scene.add(new THREE.AmbientLight(0xd9c7b1, 1.14));
      const keyLight = new THREE.DirectionalLight(0xffad68, 1.42);
      keyLight.position.set(-5, 12, 7);
      keyLight.castShadow = false;
      scene.add(keyLight);

      buildArena();
      buildProjectilePool();
      telegraph = new THREE.Mesh(
        rememberGeometry(new THREE.RingGeometry(0.72, 1, 20)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff7247, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })),
      );
      telegraph.rotation.x = -Math.PI / 2;
      telegraph.visible = false;
      scene.add(telegraph);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(IS_MOBILE ? 1.18 : 1.06);
      scene.add(playerRig.root);

      const boss = state()?.enemies.find(enemy => enemy.enemyType === 'boss');
      if (!boss) throw new Error('World boss entity missing');
      if (IS_MOBILE) {
        mobileBoss = buildMobileBoss();
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
      if (!current || !playerRig || (!mobileBoss && !desktopBoss)) throw new Error('World boss stage incomplete');
      const bossEntity = current.enemies.find(enemy => enemy.enemyType === 'boss');
      if (!bossEntity) throw new Error('World boss entity disappeared during load');
      const playerPoint = mapPoint(current.player.x + current.player.width / 2, current.player.y + current.player.height / 2);
      const bossPoint = mapPoint(bossEntity.x + bossEntity.width / 2, bossEntity.y + bossEntity.height / 2);
      playerRig.root.position.set(playerPoint.x, 0, playerPoint.z);
      if (mobileBoss) {
        mobileBoss.position.set(bossPoint.x, 0, bossPoint.z);
        mobileBoss.scale.setScalar(1.36);
      }
      if (desktopBoss) desktopBoss.root.position.set(bossPoint.x, 0, bossPoint.z);
      renderer.render(scene, camera);
      readyRaf = requestAnimationFrame(() => {
        if (!disposed) readyRef.current();
      });
      raf = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('resize', resize);
    void boot().catch(error => console.error('World boss dedicated renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(readyRaf);
      window.removeEventListener('resize', resize);
      playerRig?.stop();
      desktopBoss?.mixer?.stopAllAction?.();
      if (playerRig?.root) disposeModel(playerRig.root);
      if (desktopBoss?.root) disposeModel(desktopBoss.root);
      ownedGeometries.forEach(geometry => geometry?.dispose?.());
      ownedMaterials.forEach(material => material?.dispose?.());
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
      projectileSlots.length = 0;
      playerRig = null;
      desktopBoss = null;
      mobileBoss = null;
      telegraph = null;
      scene = null;
      camera = null;
      renderer = null;
    };
  }, [engineRef]);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
