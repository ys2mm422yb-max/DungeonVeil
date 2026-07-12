import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
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
    const cameraTarget = { x: 0, y: 0.85, z: 0 };

    const state = () => engineRef.current?.state ?? null;
    const mapX = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.width / 2 + 0.5 : 0;
    };
    const mapZ = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.height / 2 + 0.5 : 0;
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

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, host.clientWidth || window.innerWidth);
      const height = Math.max(1, host.clientHeight || window.innerHeight);
      renderer.setPixelRatio(pixelRatioForQuality());
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const buildArena = () => {
      const current = state();
      if (!current || !scene || !THREE) return;
      const root = new THREE.Group();
      root.name = 'WorldBossDedicatedArena';
      const width = Math.max(12, current.map.width);
      const depth = Math.max(14, current.map.height);

      const floorGeometry = rememberGeometry(new THREE.PlaneGeometry(width, depth));
      const floorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x76563a }));
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      root.add(floor);

      const runeGeometry = rememberGeometry(new THREE.RingGeometry(Math.min(width, depth) * 0.22, Math.min(width, depth) * 0.225, 40));
      const runeMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xb54a20, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      rune.rotation.x = -Math.PI / 2;
      rune.position.y = 0.012;
      root.add(rune);

      const wallGeometry = rememberGeometry(new THREE.BoxGeometry(1, 1.75, 1));
      const wallMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x4b4236 }));
      const wallTransforms: Array<[number, number, number, number]> = [
        [0, -depth / 2, width, 0.45],
        [-width / 2, 0, 0.45, depth],
        [width / 2, 0, 0.45, depth],
      ];
      for (const [x, z, sx, sz] of wallTransforms) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, 0.875, z);
        wall.scale.set(sx, 1, sz);
        root.add(wall);
      }

      const pillarGeometry = rememberGeometry(new THREE.CylinderGeometry(0.45, 0.62, 2.2, 6));
      const pillarMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x655849 }));
      const pillarX = Math.max(3.6, width * 0.28);
      const pillarZ = Math.max(2.8, depth * 0.2);
      const pillarPositions: Array<[number, number]> = [[-pillarX, -pillarZ], [pillarX, -pillarZ], [-pillarX, pillarZ], [pillarX, pillarZ]];
      for (const [x, z] of pillarPositions) {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 1.1, z);
        root.add(pillar);
      }
      scene.add(root);
    };

    const buildMobileBoss = () => {
      if (!scene || !THREE) return null;
      const root = new THREE.Group();
      root.name = 'AshKingMobileBoss';

      const darkMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x241612 }));
      const armorMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0x6b2c18 }));
      const emberMaterial = rememberMaterial(new THREE.MeshBasicMaterial({ color: 0xff6a25 }));
      const goldMaterial = rememberMaterial(new THREE.MeshLambertMaterial({ color: 0xb78838 }));

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
        rememberMaterial(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.012;
      root.add(shadow);

      root.scale.setScalar(1.12);
      scene.add(root);
      return root;
    };

    const buildProjectilePool = () => {
      if (!scene || !THREE) return;
      const geometry = rememberGeometry(new THREE.BoxGeometry(0.07, 0.07, 0.8));
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
        const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
        const angle = effect.angle ?? 0;
        const travel = effect.maxRadius / TILE;
        slot.mesh.visible = true;
        slot.mesh.position.set(mapX(effect.x) + Math.cos(angle) * travel * progress, effect.id.startsWith('boss-shot-') ? 0.98 : 0.82, mapZ(effect.y) + Math.sin(angle) * travel * progress);
        slot.mesh.rotation.y = Math.PI / 2 - angle;
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
      const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
      telegraph.visible = true;
      telegraph.position.set(mapX(effect.x), 0.04, mapZ(effect.y));
      telegraph.scale.setScalar(Math.max(0.08, effect.maxRadius / TILE * Math.max(0.2, progress)));
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
      const playerX = mapX(current.player.x);
      const playerZ = mapZ(current.player.y);

      if (playerRig) {
        playerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(current.player.facing.x, current.player.facing.y) > 0.1) playerRig.root.rotation.y = Math.atan2(current.player.facing.x, current.player.facing.y);
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
        const bossX = mapX(boss.x + boss.width / 2);
        const bossZ = mapZ(boss.y + boss.height / 2);
        if (desktopBoss) {
          desktopBoss.root.position.set(bossX, 0, bossZ);
          desktopBoss.root.rotation.y = Math.atan2(playerX - bossX, playerZ - bossZ);
          if (qualityLevel < 2 || animationFrameCounter % 2 === 0) updateKayKitEnemyVisual(desktopBoss, boss, delta, now);
        }
        if (mobileBoss) {
          mobileBoss.position.set(bossX, 0, bossZ);
          mobileBoss.rotation.y = Math.atan2(playerX - bossX, playerZ - bossZ);
          mobileBoss.position.y = Math.sin(now * 0.003) * 0.035;
          if (boss.lastAttackTime > lastBossAttack) lastBossAttack = boss.lastAttackTime;
          const attackPulse = Math.max(0, 1 - (now - lastBossAttack) / 360);
          mobileBoss.scale.setScalar(1.12 + attackPulse * 0.08);
        }
      }

      syncProjectiles(now);
      syncTelegraph();

      cameraTarget.x = playerX;
      cameraTarget.z = playerZ;
      camera.position.x += (playerX - camera.position.x) * 0.12;
      camera.position.z += (playerZ + 9.6 - camera.position.z) * 0.12;
      camera.position.y += (10.6 - camera.position.y) * 0.12;
      camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      renderer.render(scene, camera);
      adaptQuality(now);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed || !state()) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x120b07);
      scene.fog = new THREE.Fog(0x120b07, 22, 40);
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(44, 1, 0.1, 70);
      camera.position.set(0, 10.6, 9.6);
      scene.add(new THREE.AmbientLight(0xe5d4bd, 1.08));
      const keyLight = new THREE.DirectionalLight(0xffc47c, 1.38);
      keyLight.position.set(-6, 12, 8);
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
      playerRig.root.scale.setScalar(0.94);
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
      playerRig.root.position.set(mapX(current.player.x), 0, mapZ(current.player.y));
      const bossX = mapX(bossEntity.x + bossEntity.width / 2);
      const bossZ = mapZ(bossEntity.y + bossEntity.height / 2);
      if (mobileBoss) mobileBoss.position.set(bossX, 0, bossZ);
      if (desktopBoss) desktopBoss.root.position.set(bossX, 0, bossZ);
      camera.position.set(mapX(current.player.x), 10.6, mapZ(current.player.y) + 9.6);
      camera.lookAt(mapX(current.player.x), 0.85, mapZ(current.player.y));
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
