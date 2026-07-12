import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const ARENA_WIDTH = 10.4;
const ARENA_DEPTH = 14.4;
const ARENA_INNER_X = 4.25;
const ARENA_INNER_Z = 5.7;
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
      const viewWidth = portrait ? 11.55 : 15.4;
      const viewHeight = viewWidth / Math.max(0.25, aspect);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(0, portrait ? 15.8 : 14.8, portrait ? 11.8 : 12.6);
      camera.lookAt(0, 0.62, portrait ? 1.75 : 0.8);
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

      const ashGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH + 0.9, ARENA_DEPTH + 0.9));
      const ashMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x1a0e0b }));
      const ashBed = new THREE.Mesh(ashGeometry, ashMaterial);
      ashBed.rotation.x = -Math.PI / 2;
      ashBed.position.y = -0.08;
      root.add(ashBed);

      const floorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_DEPTH));
      const floorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x513326 }));
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      root.add(floor);

      const innerFloorGeometry = rememberGeometry(new THREE.PlaneGeometry(ARENA_WIDTH - 0.68, ARENA_DEPTH - 0.68));
      const innerFloorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x68412f, transparent: true, opacity: 0.78 }));
      const innerFloor = new THREE.Mesh(innerFloorGeometry, innerFloorMaterial);
      innerFloor.rotation.x = -Math.PI / 2;
      innerFloor.position.y = -0.012;
      root.add(innerFloor);

      const grid = new THREE.GridHelper(ARENA_DEPTH - 0.9, 6, 0x7f4933, 0x7f4933);
      grid.scale.x = (ARENA_WIDTH - 0.9) / (ARENA_DEPTH - 0.9);
      grid.position.y = 0.006;
      grid.material.transparent = true;
      grid.material.opacity = 0.22;
      grid.material.depthWrite = false;
      rememberGeometry(grid.geometry);
      if (Array.isArray(grid.material)) grid.material.forEach((material: any) => rememberMaterial(material));
      else rememberMaterial(grid.material);
      root.add(grid);

      const runeGeometry = rememberGeometry(new THREE.RingGeometry(1.7, 1.88, 32));
      const runeMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff6a2d, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }));
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(0, 0.025, -0.35);
      root.add(rune);

      const innerRuneGeometry = rememberGeometry(new THREE.RingGeometry(0.72, 0.82, 24));
      const innerRune = new THREE.Mesh(innerRuneGeometry, runeMaterial);
      innerRune.rotation.x = -Math.PI / 2;
      innerRune.position.set(0, 0.027, -0.35);
      root.add(innerRune);

      const sigilGeometry = rememberGeometry(new THREE.BoxGeometry(0.12, 0.02, 3.8));
      const sigilMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xe24f24, transparent: true, opacity: 0.58, depthWrite: false }));
      const sigilA = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilA.position.set(0, 0.026, -0.35);
      root.add(sigilA);
      const sigilB = new THREE.Mesh(sigilGeometry, sigilMaterial);
      sigilB.position.set(0, 0.028, -0.35);
      sigilB.rotation.y = Math.PI / 2;
      root.add(sigilB);

      const wallGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1, 1));
      const wallMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x2b1b16 }));
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

      const pillarGeometry = rememberGeometry(new THREE.CylinderGeometry(0.42, 0.58, 1.9, 6));
      const pillarMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x694938 }));
      const pillarPositions: Array<[number, number]> = [
        [-4.35, -4.95],
        [4.35, -4.95],
        [-4.35, 4.92],
        [4.35, 4.92],
      ];
      for (const [x, z] of pillarPositions) {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 0.95, z);
        root.add(pillar);
      }

      scene.add(root);
    };

    const buildMobileBoss = () => {
      if (!scene || !THREE) return null;
      const root = new THREE.Group();
      root.name = 'AshKingMobileBoss';

      const darkMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x321c17 }));
      const armorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0xa54422 }));
      const emberMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff8a3d }));
      const goldMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0xe0b25a }));
      const capeMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x551d16 }));

      const shadow = new THREE.Mesh(
        rememberGeometry(new THREE.CircleGeometry(1.08, 18)),
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      root.add(shadow);

      const cape = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.72, 1.02, 1.9, 7)), capeMaterial);
      cape.position.set(0, 0.96, -0.26);
      root.add(cape);

      const body = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.64, 0.9, 1.72, 7)), darkMaterial);
      body.position.y = 0.94;
      root.add(body);

      const armor = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.86, 1.22, 7, 1, true)), armorMaterial);
      armor.position.y = 1.18;
      armor.rotation.x = Math.PI;
      root.add(armor);

      const shoulderGeometry = rememberGeometry(new THREE.SphereGeometry(0.34, 8, 6));
      const armGeometry = rememberGeometry(new THREE.CylinderGeometry(0.19, 0.25, 1.15, 6));
      const gauntletGeometry = rememberGeometry(new THREE.SphereGeometry(0.23, 7, 5));
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        shoulder.position.set(side * 0.78, 1.5, 0);
        shoulder.scale.set(1.2, 0.78, 1.05);
        root.add(shoulder);

        const arm = new THREE.Mesh(armGeometry, darkMaterial);
        arm.position.set(side * 0.93, 1.03, 0.02);
        arm.rotation.z = side * -0.42;
        root.add(arm);

        const gauntlet = new THREE.Mesh(gauntletGeometry, goldMaterial);
        gauntlet.position.set(side * 1.1, 0.55, 0.04);
        root.add(gauntlet);
      }

      const head = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.42, 10, 8)), armorMaterial);
      head.position.y = 2.02;
      root.add(head);

      const crownBand = new THREE.Mesh(rememberGeometry(new THREE.CylinderGeometry(0.46, 0.5, 0.22, 7)), goldMaterial);
      crownBand.position.y = 2.35;
      root.add(crownBand);

      const crownSpikeGeometry = rememberGeometry(new THREE.ConeGeometry(0.15, 0.58, 5));
      for (const x of [-0.3, 0, 0.3]) {
        const spike = new THREE.Mesh(crownSpikeGeometry, goldMaterial);
        spike.position.set(x, x === 0 ? 2.72 : 2.63, 0);
        root.add(spike);
      }

      const core = new THREE.Mesh(rememberGeometry(new THREE.SphereGeometry(0.2, 8, 6)), emberMaterial);
      core.position.set(0, 1.3, 0.72);
      root.add(core);

      const collar = new THREE.Mesh(rememberGeometry(new THREE.TorusGeometry(0.53, 0.08, 6, 14)), emberMaterial);
      collar.position.set(0, 1.73, 0.08);
      collar.rotation.x = Math.PI / 2;
      root.add(collar);

      const weaponShaft = new THREE.Mesh(rememberGeometry(new THREE.BoxGeometry(0.12, 1.85, 0.12)), goldMaterial);
      weaponShaft.position.set(1.28, 1.14, 0.02);
      weaponShaft.rotation.z = -0.12;
      root.add(weaponShaft);

      const weaponHead = new THREE.Mesh(rememberGeometry(new THREE.ConeGeometry(0.34, 0.78, 5)), emberMaterial);
      weaponHead.position.set(1.39, 2.1, 0.02);
      weaponHead.rotation.z = -0.12;
      root.add(weaponHead);

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
          mobileBoss.position.set(bossPoint.x, Math.sin(now * 0.003) * 0.04, bossPoint.z);
          mobileBoss.rotation.y = Math.atan2(playerPoint.x - bossPoint.x, playerPoint.z - bossPoint.z);
          if (boss.lastAttackTime > lastBossAttack) lastBossAttack = boss.lastAttackTime;
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          mobileBoss.scale.setScalar(1.48 + attackPulse * 0.1);
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
      scene.background = new THREE.Color(0x100806);
      scene.fog = new THREE.Fog(0x100806, 26, 45);
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      camera = new THREE.OrthographicCamera(-5.75, 5.75, 12, -12, 0.1, 70);
      scene.add(new THREE.AmbientLight(0xf0d6bd, 1.72));
      scene.add(new THREE.HemisphereLight(0xffc58f, 0x3b2018, 1.05));
      const keyLight = new THREE.DirectionalLight(0xffb06d, 2.15);
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
      playerRig.root.scale.setScalar(IS_MOBILE ? 1.28 : 1.1);
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
        mobileBoss.scale.setScalar(1.48);
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

  return <div ref={hostRef} className="pointer-events-none fixed inset-0 overflow-hidden" style={{ width: '100vw', height: '100dvh' }} />;
}
