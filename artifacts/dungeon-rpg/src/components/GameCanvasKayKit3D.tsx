import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { buildKayKitDungeonRoom } from './kaykitRoom3D';
import { buildKayKitRoomTheme } from './kaykitRoomThemes3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';
import { createKayKitLootVisual } from './kaykitLoot3D';
import { loadKayKitManifest } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;

export function GameCanvasKayKit3D({ gameState }: { gameState: GameState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

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
    let arrowPrototype: any = null;
    let roomRoot: any = null;
    let portal: any = null;
    let playerLight: any = null;
    let lastRoomKey = '';
    let lastAttack = 0;
    let lastDodge = 0;

    const enemyVisuals = new Map<string, KayKitEnemyVisual>();
    const enemyLoading = new Set<string>();
    const arrowVisuals = new Map<string, any>();
    const lootVisuals = new Map<string, any>();
    const lootLoading = new Set<string>();

    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const buildRoom = (state: GameState) => {
      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
      if (key === lastRoomKey) return;
      lastRoomKey = key;
      if (roomRoot) {
        scene.remove(roomRoot);
        roomRoot.userData?.room?.userData?.dispose?.();
        roomRoot.userData?.theme?.userData?.dispose?.();
        disposeObject(roomRoot);
      }

      const root = new THREE.Group();
      root.name = `KayKitRunRoom_${state.floor}`;
      const room = buildKayKitDungeonRoom(THREE, state.floor, state.map.width, state.map.height);
      const theme = buildKayKitRoomTheme(THREE, state.floor);
      root.add(room);
      root.add(theme);
      root.userData.room = room;
      root.userData.theme = theme;
      roomRoot = root;
      scene.add(root);
    };

    const syncEnemies = (state: GameState, delta: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, visual] of enemyVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual.root);
        visual.mixer?.stopAllAction?.();
        disposeObject(visual.root);
        enemyVisuals.delete(id);
      }

      for (const enemy of state.enemies) {
        let visual = enemyVisuals.get(enemy.id);
        if (!visual && !enemyLoading.has(enemy.id)) {
          enemyLoading.add(enemy.id);
          createKayKitEnemyVisual(THREE, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            console.error('KayKit enemy failed', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));
        visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        updateKayKitEnemyVisual(visual, enemy, delta);
      }
    };

    const addElementVisual = (arrow: any, color: string) => {
      const normalized = color.toLowerCase();
      const isFire = normalized === '#ff642c';
      const isIce = normalized === '#62d9ff';
      if (!isFire && !isIce) return;

      const positions = [0, -0.22, -0.44, -0.68];
      const scales = [0.11, 0.085, 0.06, 0.04];
      const glows: any[] = [];
      positions.forEach((y, index) => {
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), material);
        glow.position.set(0, y, 0);
        glow.scale.setScalar(scales[index]);
        arrow.add(glow);
        glows.push(glow);
      });

      const light = new THREE.PointLight(color, isFire ? 4.2 : 3.6, 3.6, 2);
      light.position.set(0, -0.08, 0);
      arrow.add(light);
      arrow.userData.elementGlows = glows;
      arrow.userData.elementLight = light;
    };

    const syncArrows = (state: GameState, now: number) => {
      const shots = state.effects.filter(effect => effect.type === 'beam' && effect.id.startsWith('shot-'));
      const active = new Set(shots.map(effect => effect.id));
      for (const [id, mesh] of arrowVisuals) {
        if (active.has(id)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        arrowVisuals.delete(id);
      }

      for (const shot of shots) {
        let arrow = arrowVisuals.get(shot.id);
        if (!arrow && arrowPrototype) {
          arrow = arrowPrototype.clone(true);
          arrow.scale.setScalar(1.14);
          arrow.traverse((node: any) => {
            if (node.isLine && node.material) node.material = node.material.clone();
            if (!node.isMesh && !node.isLine) return;
            node.castShadow = false;
            node.frustumCulled = true;
          });
          addElementVisual(arrow, shot.color);
          scene.add(arrow);
          arrowVisuals.set(shot.id, arrow);
        }
        if (!arrow) continue;

        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(
          mapX(state, shot.x) + Math.cos(angle) * travel * progress,
          0.88,
          mapZ(state, shot.y) + Math.sin(angle) * travel * progress,
        );
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
        arrow.traverse((node: any) => {
          if (!node.isLine || !node.material?.color) return;
          node.material.color.set(shot.color);
          node.material.opacity = Math.max(0.22, 0.92 * (1 - progress * 0.28));
        });

        const pulse = 0.82 + Math.sin(now * 0.025 + progress * 8) * 0.18;
        const glows = arrow.userData.elementGlows as any[] | undefined;
        glows?.forEach((glow, index) => {
          glow.material.opacity = Math.max(0.25, pulse - index * 0.12);
          glow.scale.setScalar((0.11 - index * 0.02) * (0.85 + pulse * 0.3));
        });
        if (arrow.userData.elementLight) arrow.userData.elementLight.intensity = 3.3 + pulse * 1.9;
      }
    };

    const syncLoot = (state: GameState, now: number) => {
      const active = new Set(state.items.map(item => item.id));
      for (const [id, visual] of lootVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual);
        disposeObject(visual);
        lootVisuals.delete(id);
      }

      for (const item of state.items) {
        let visual = lootVisuals.get(item.id);
        if (!visual && !lootLoading.has(item.id)) {
          lootLoading.add(item.id);
          createKayKitLootVisual(item).then(created => {
            lootLoading.delete(item.id);
            if (!created || disposed || !stateRef.current.items.some(current => current.id === item.id)) return;
            lootVisuals.set(item.id, created);
            scene.add(created);
          }).catch(error => {
            lootLoading.delete(item.id);
            console.error('KayKit loot failed', error);
          });
          continue;
        }
        visual = lootVisuals.get(item.id);
        if (!visual) continue;
        visual.position.set(
          mapX(state, item.x + item.width / 2),
          0.18 + Math.sin((now - item.spawnTime) * 0.005) * 0.05,
          mapZ(state, item.y + item.height / 2),
        );
        visual.rotation.y += 0.028;
      }
    };

    const syncPortal = (state: GameState, now: number) => {
      const clear = state.enemies.every(enemy => enemy.hp <= 0 || enemy.isDead) && state.status === 'playing';
      if (!clear) {
        if (portal) {
          scene.remove(portal);
          disposeObject(portal);
          portal = null;
        }
        return;
      }

      if (!portal) {
        portal = new THREE.Group();
        portal.name = 'RunExitEffect';
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.7, 0.045, 8, 32),
          new THREE.MeshBasicMaterial({ color: 0xb693ff, transparent: true, opacity: 0.95 }),
        );
        ring.rotation.x = Math.PI / 2;
        portal.add(ring);
        const veil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.58, 1.25, 24, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x8c62ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
        );
        veil.position.y = 0.62;
        portal.add(veil);
        portal.userData.ring = ring;
        portal.userData.veil = veil;
        scene.add(portal);
      }

      let exitX = Math.floor(state.map.width / 2);
      let exitY = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { exitX = x; exitY = y; break; }
      }
      portal.position.set(exitX + 0.5 - state.map.width / 2, 0.02, exitY + 0.5 - state.map.height / 2);
      portal.userData.ring.rotation.z = now * 0.0007;
      portal.userData.veil.material.opacity = 0.16 + Math.sin(now * 0.004) * 0.06;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || innerWidth;
      const height = host.clientHeight || innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const renderLoop = () => {
      if (disposed || !renderer || !scene || !camera || !clock) return;
      const state = stateRef.current;
      const now = Date.now();
      const delta = Math.min(clock.getDelta(), 0.05);
      const playerX = mapX(state, state.player.x);
      const playerZ = mapZ(state, state.player.y);

      buildRoom(state);
      if (playerRig) {
        playerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(state.player.facing.x, state.player.facing.y) > 0.1) playerRig.root.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        playerRig.setMoving(state.player.state === 'moving');
        if (state.player.lastAttackTime > lastAttack) { lastAttack = state.player.lastAttackTime; playerRig.triggerAttack(); }
        if (state.player.lastDodgeTime > lastDodge) { lastDodge = state.player.lastDodgeTime; playerRig.triggerDash(); }
        playerRig.update(delta);
      }

      if (playerLight) playerLight.position.set(playerX, 4.2, playerZ + 1.2);
      syncEnemies(state, delta);
      syncArrows(state, now);
      syncLoot(state, now);
      syncPortal(state, now);
      updateRunCamera(camera, cameraGoal, playerX, playerZ);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      await loadKayKitManifest();
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x171512);
      scene.fog = new THREE.Fog(0x171512, 30, 58);

      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 150);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.AmbientLight(0xd8d1c5, 0.74));
      scene.add(new THREE.HemisphereLight(0xd9c7aa, 0x171512, 1.05));
      const keyLight = new THREE.DirectionalLight(0xffc98b, 1.85);
      keyLight.position.set(-7, 14, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x6f61c8, 2.2, 22, 1.8);
      fillLight.position.set(0, 6.5, -8);
      scene.add(fillLight);
      playerLight = new THREE.PointLight(0xffd29b, 2.5, 13, 1.7);
      scene.add(playerLight);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(1.08);
      arrowPrototype = playerRig.arrowPrototype;
      scene.add(playerRig.root);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('KayKit run renderer failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      playerRig?.stop();
      for (const visual of enemyVisuals.values()) { visual.mixer?.stopAllAction?.(); disposeObject(visual.root); }
      for (const mesh of arrowVisuals.values()) disposeObject(mesh);
      for (const mesh of lootVisuals.values()) disposeObject(mesh);
      if (roomRoot) disposeObject(roomRoot);
      if (portal) disposeObject(portal);
      if (playerRig?.root) disposeObject(playerRig.root);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
