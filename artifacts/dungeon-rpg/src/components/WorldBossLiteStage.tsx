import React, { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { skillRank } from '../game/runSkills';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (IS_ANDROID || IS_IOS || navigator.maxTouchPoints > 1);
const PERF_KEY = 'dungeon-veil-worldboss-performance';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

export function WorldBossLiteStage({ engineRef, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let THREE: any;
    let renderer: any;
    let scene: any;
    let camera: any;
    let cameraGoal: any;
    let clock: any;
    let playerRig: KayKitPlayerRig | null = null;
    let bossVisual: KayKitEnemyVisual | null = null;
    let telegraph: any = null;
    let lastAttack = 0;
    let lastDodge = 0;
    let lastFrameAt = 0;
    let performanceWindowAt = performance.now();
    let performanceFrames = 0;
    let qualityLevel = 0;
    let animationFrameCounter = 0;
    const arrows = new Map<string, any>();

    const state = () => engineRef.current?.state ?? null;
    const mapX = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.width / 2 + 0.5 : 0;
    };
    const mapZ = (value: number) => {
      const current = state();
      return current ? value / TILE - current.map.height / 2 + 0.5 : 0;
    };

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const pixelRatioForQuality = () => {
      if (!IS_MOBILE) return Math.min(devicePixelRatio || 1, 1.1);
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
      const width = host.clientWidth || innerWidth;
      const height = host.clientHeight || innerHeight;
      renderer.setPixelRatio(pixelRatioForQuality());
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const buildArena = () => {
      const current = state();
      if (!current) return;
      const root = new THREE.Group();
      root.name = 'WorldBossLiteArena';
      const width = Math.max(12, current.map.width);
      const depth = Math.max(14, current.map.height);

      const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x7a5b3c });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.025;
      root.add(floor);

      const grid = new THREE.GridHelper(Math.max(width, depth), Math.max(10, Math.round(Math.max(width, depth))), 0x38271c, 0x5a402c);
      grid.position.y = 0.006;
      grid.material.transparent = true;
      grid.material.opacity = 0.24;
      root.add(grid);

      const wallGeometry = new THREE.BoxGeometry(1, 1.8, 1);
      const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x4d4436 });
      const addWall = (x: number, z: number, sx: number, sz: number) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, 0.9, z);
        wall.scale.set(sx, 1, sz);
        root.add(wall);
      };
      addWall(0, -depth / 2, width, 0.45);
      addWall(-width / 2, 0, 0.45, depth);
      addWall(width / 2, 0, 0.45, depth);

      const pillarGeometry = new THREE.CylinderGeometry(0.48, 0.62, 2.25, 6);
      const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x645846 });
      const pillarX = Math.max(3.6, width * 0.28);
      const pillarZ = Math.max(2.8, depth * 0.2);
      [[-pillarX, -pillarZ], [pillarX, -pillarZ], [-pillarX, pillarZ], [pillarX, pillarZ]].forEach(([x, z]) => {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(x, 1.12, z);
        root.add(pillar);
      });
      scene.add(root);
    };

    const maxArrowCount = () => qualityLevel >= 2 ? 1 : qualityLevel >= 1 ? 2 : IS_MOBILE ? 3 : 6;

    const syncArrows = (wallNow: number) => {
      const current = state();
      if (!current) return;
      const shots = current.effects
        .filter(effect => effect.type === 'beam' && (effect.id.startsWith('shot-') || effect.id.startsWith('pierce-') || effect.id.startsWith('rico-') || effect.id.startsWith('boss-shot-')))
        .slice(-maxArrowCount());
      const active = new Set(shots.map(effect => effect.id));
      for (const [id, mesh] of arrows) {
        if (active.has(id)) continue;
        scene.remove(mesh);
        mesh.material?.dispose?.();
        arrows.delete(id);
      }

      for (const shot of shots) {
        let arrow = arrows.get(shot.id);
        if (!arrow) {
          arrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.045, shot.id.startsWith('boss-shot-') ? 0.95 : 0.72),
            new THREE.MeshBasicMaterial({ color: shot.color, transparent: true, opacity: 0.92, depthWrite: false }),
          );
          scene.add(arrow);
          arrows.set(shot.id, arrow);
        }
        const progress = Math.max(0, Math.min(1, shot.lifeTime / Math.max(1, shot.maxLifeTime)));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(mapX(shot.x) + Math.cos(angle) * travel * progress, 0.82, mapZ(shot.y) + Math.sin(angle) * travel * progress);
        arrow.rotation.y = Math.PI / 2 - angle;
        arrow.material.color.set(shot.color);
        arrow.material.opacity = Math.max(0.28, 0.92 - progress * 0.35);
        const pulse = 0.92 + Math.sin(wallNow * 0.02) * 0.08;
        arrow.scale.setScalar(pulse);
      }
    };

    const syncTelegraph = () => {
      const current = state();
      if (!current || !telegraph) return;
      const effect = [...current.effects].reverse().find(candidate => candidate.type === 'circle');
      if (!effect) {
        telegraph.visible = false;
        return;
      }
      const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
      telegraph.visible = true;
      telegraph.position.set(mapX(effect.x), 0.04, mapZ(effect.y));
      telegraph.scale.setScalar(Math.max(0.08, effect.maxRadius / TILE * Math.max(0.2, progress)));
      telegraph.material.color.set(effect.color);
      telegraph.material.opacity = Math.max(0.12, 0.72 * (1 - progress));
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
        localStorage.setItem(PERF_KEY, JSON.stringify({ fps, qualityLevel, pixelRatio: pixelRatioForQuality(), calls: renderer.info?.render?.calls ?? 0, triangles: renderer.info?.render?.triangles ?? 0, at: Date.now() }));
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
        const moveRank = skillRank(current.runSkills, 'speed');
        const attackRank = skillRank(current.runSkills, 'attackSpeed');
        playerRig.setMotionSpeed([1, 1.12, 1.24, 1.34][moveRank], [1, 1.16, 1.3, 1.42][attackRank]);
        if (current.player.lastAttackTime > lastAttack) { lastAttack = current.player.lastAttackTime; playerRig.triggerAttack(); }
        if (current.player.lastDodgeTime > lastDodge) { lastDodge = current.player.lastDodgeTime; playerRig.triggerDash(); }
        if (qualityLevel < 2 || animationFrameCounter % 2 === 0) playerRig.update(delta);
      }

      const boss = current.enemies.find(enemy => enemy.enemyType === 'boss');
      if (boss && bossVisual) {
        const nextX = mapX(boss.x + boss.width / 2);
        const nextZ = mapZ(boss.y + boss.height / 2);
        bossVisual.root.position.set(nextX, 0, nextZ);
        bossVisual.root.rotation.y = Math.atan2(playerX - nextX, playerZ - nextZ);
        if (qualityLevel < 2 || animationFrameCounter % 2 === 0) updateKayKitEnemyVisual(bossVisual, boss, delta, now);
      }

      syncArrows(now);
      syncTelegraph();
      camera.userData.dungeonPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
      camera.userData.dungeonPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
      updateRunCamera(camera, cameraGoal, playerX, playerZ, false);
      renderer.render(scene, camera);
      adaptQuality(now);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed || !state()) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x120b07);
      scene.fog = new THREE.Fog(0x120b07, 24, 44);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', precision: IS_MOBILE ? 'mediump' : 'highp' });
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 90);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();
      scene.add(new THREE.AmbientLight(0xe6d6bd, 1.05));
      const key = new THREE.DirectionalLight(0xffc37c, 1.45);
      key.position.set(-6, 12, 8);
      scene.add(key);
      buildArena();

      telegraph = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 1, 20),
        new THREE.MeshBasicMaterial({ color: 0xff7247, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      );
      telegraph.rotation.x = -Math.PI / 2;
      telegraph.visible = false;
      scene.add(telegraph);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(0.94);
      scene.add(playerRig.root);

      const boss = state()?.enemies.find(enemy => enemy.enemyType === 'boss');
      if (boss) {
        bossVisual = await createKayKitEnemyVisual(THREE, boss);
        if (disposed) return;
        bossVisual.statusRoot.visible = false;
        if (bossVisual.bossAura) bossVisual.bossAura.visible = false;
        if (bossVisual.bossCore) bossVisual.bossCore.visible = false;
        bossVisual.root.traverse((node: any) => {
          if (!node.isMesh && !node.isSkinnedMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
        });
        scene.add(bossVisual.root);
      }

      clock = new THREE.Clock();
      resize();
      renderer.render(scene, camera);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!disposed) readyRef.current();
      }));
      raf = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('World boss lite renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      playerRig?.stop();
      bossVisual?.mixer?.stopAllAction?.();
      for (const arrow of arrows.values()) disposeObject(arrow);
      if (telegraph) disposeObject(telegraph);
      if (playerRig?.root) disposeObject(playerRig.root);
      if (bossVisual?.root) disposeObject(bossVisual.root);
      scene?.traverse?.((node: any) => {
        if (node === playerRig?.root || node === bossVisual?.root || node === telegraph) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, [engineRef]);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
