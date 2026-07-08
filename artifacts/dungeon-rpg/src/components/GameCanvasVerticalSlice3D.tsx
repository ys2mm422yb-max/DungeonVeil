import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { composeFullRanger } from './rangerCharacterRig';
import { attachBowToRanger } from './bowRig';
import { buildChapterRoomDecor } from './roomDecor3D';
import { createMonsterVisual, loadMonsterLibrary, updateMonsterVisual, type MonsterLibrary, type MonsterVisual } from './monsterVisual3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ROOT = '/assets/3d/';
const WEAPON_ROOT = '/assets/3d/library/weapons/';
const TILE = 40;

export function GameCanvasVerticalSlice3D({ gameState }: { gameState: GameState }) {
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
    let rangerRig: ReturnType<typeof composeFullRanger> | null = null;
    let bowRig: ReturnType<typeof attachBowToRanger> | null = null;
    let arrowProto: any = null;
    let monsterLibrary: MonsterLibrary = {};
    let roomRoot: any = null;
    let portal: any = null;
    let playerLight: any = null;
    let lastRoomKey = '';
    let lastAttack = 0;
    let attackPulse = 0;

    const enemyVisuals = new Map<string, MonsterVisual>();
    const enemyLoading = new Set<string>();
    const arrowVisuals = new Map<string, any>();
    const itemVisuals = new Map<string, any>();

    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const normalize = (object: any, targetSize: number) => {
      object.position.set(0, 0, 0);
      object.scale.setScalar(1);
      object.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.0001));
      object.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(object);
      const center = new THREE.Vector3();
      box.getCenter(center);
      object.position.x -= center.x;
      object.position.z -= center.z;
      object.position.y -= box.min.y;
      object.traverse((node: any) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
      });
      return object;
    };

    const makeGround = (state: GameState) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const palettes = [
        ['#342a20', '#413429', '#4c3d30'],
        ['#2d2b31', '#3a3740', '#46424c'],
        ['#30291e', '#403626', '#4d402c'],
        ['#32252a', '#422f35', '#503740'],
      ];
      const palette = palettes[(Math.max(1, state.floor) - 1) % palettes.length];
      ctx.fillStyle = palette[0];
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 32) {
        for (let x = 0; x < 256; x += 32) {
          ctx.fillStyle = ((x / 32 + y / 32) % 2 === 0) ? palette[1] : palette[2];
          ctx.globalAlpha = 0.48;
          ctx.fillRect(x + 1, y + 1, 30, 30);
          ctx.globalAlpha = 1;
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 4);
      texture.colorSpace = THREE.SRGBColorSpace;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(state.map.width, state.map.height),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, color: 0xffffff }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.04;
      ground.receiveShadow = true;
      return ground;
    };

    const buildRoom = (state: GameState) => {
      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
      if (key === lastRoomKey) return;
      lastRoomKey = key;
      if (roomRoot) {
        scene.remove(roomRoot);
        roomRoot.userData?.decor?.userData?.dispose?.();
        disposeObject(roomRoot);
      }
      const root = new THREE.Group();
      root.add(makeGround(state));
      const room = Math.max(1, Math.min(4, state.floor));
      const decor = buildChapterRoomDecor(THREE, room);
      root.add(decor);
      root.userData.decor = decor;
      roomRoot = root;
      scene.add(root);
    };

    const syncEnemies = (state: GameState, now: number, delta: number) => {
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
          createMonsterVisual(THREE, monsterLibrary, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            console.warn('Monster visual failed', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));
        visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        updateMonsterVisual(visual, enemy, delta, now);
      }
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const active = new Set(shots.map(effect => effect.id));
      for (const [id, mesh] of arrowVisuals) {
        if (active.has(id)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        arrowVisuals.delete(id);
      }
      for (const shot of shots) {
        let arrow = arrowVisuals.get(shot.id);
        if (!arrow && arrowProto) {
          arrow = arrowProto.clone(true);
          scene.add(arrow);
          arrowVisuals.set(shot.id, arrow);
        }
        if (!arrow) continue;
        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(
          mapX(state, shot.x) + Math.cos(angle) * travel * progress,
          0.9,
          mapZ(state, shot.y) + Math.sin(angle) * travel * progress,
        );
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
      }
    };

    const syncItems = (state: GameState, now: number) => {
      const active = new Set(state.items.map(item => item.id));
      for (const [id, mesh] of itemVisuals) {
        if (active.has(id)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        itemVisuals.delete(id);
      }
      for (const item of state.items) {
        let mesh = itemVisuals.get(item.id);
        if (!mesh) {
          const xp = item.itemType === 'xp_orb';
          mesh = new THREE.Mesh(
            xp ? new THREE.OctahedronGeometry(0.15, 0) : new THREE.IcosahedronGeometry(0.16, 0),
            new THREE.MeshStandardMaterial({ color: xp ? 0x78ddff : 0xdb3952, emissive: xp ? 0x147da5 : 0x6b1323, emissiveIntensity: xp ? 1.8 : 0.75 }),
          );
          scene.add(mesh);
          itemVisuals.set(item.id, mesh);
        }
        mesh.position.set(mapX(state, item.x + item.width / 2), 0.24 + Math.sin((now - item.spawnTime) * 0.005) * 0.06, mapZ(state, item.y + item.height / 2));
        mesh.rotation.y += 0.035;
      }
    };

    const syncPortal = (state: GameState, now: number) => {
      const clear = state.enemies.every(enemy => enemy.hp <= 0 || enemy.isDead) && state.status === 'playing';
      if (!clear) {
        if (portal) { scene.remove(portal); disposeObject(portal); portal = null; }
        return;
      }
      if (!portal) {
        portal = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0xb693ff, transparent: true, opacity: 0.95 }));
        ring.rotation.x = Math.PI / 2;
        portal.add(ring);
        const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.25, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8c62ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
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
      roomRoot?.userData?.decor?.userData?.update?.(now);

      if (rangerRig) {
        rangerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(state.player.facing.x, state.player.facing.y) > 0.1) rangerRig.root.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        rangerRig.setMoving(state.player.state === 'moving');
        if (state.player.lastAttackTime > lastAttack) {
          lastAttack = state.player.lastAttackTime;
          attackPulse = 1;
          rangerRig.triggerAttack();
        }
        attackPulse = Math.max(0, attackPulse - delta * 6.8);
        bowRig?.updateShotPose(attackPulse);
        rangerRig.update(delta);
      }

      if (playerLight) playerLight.position.set(playerX, 4.2, playerZ + 1.2);
      syncEnemies(state, now, delta);
      syncArrows(state);
      syncItems(state, now);
      syncPortal(state, now);
      updateRunCamera(camera, cameraGoal, playerX, playerZ);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const [{ GLTFLoader }, { OBJLoader }, { MTLLoader }] = await Promise.all([
        import(/* @vite-ignore */ GLTF_URL),
        import(/* @vite-ignore */ OBJ_URL),
        import(/* @vite-ignore */ MTL_URL),
      ]) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x17151b);
      scene.fog = new THREE.Fog(0x17151b, 38, 72);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 150);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();
      scene.add(new THREE.AmbientLight(0xfff0dc, 1.45));
      scene.add(new THREE.HemisphereLight(0xffe6c7, 0x2b2230, 2.05));
      const keyLight = new THREE.DirectionalLight(0xffc982, 3.3);
      keyLight.position.set(-7, 14, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x8f76ff, 8.5, 30, 1.7);
      fillLight.position.set(0, 6.5, -8);
      scene.add(fillLight);
      playerLight = new THREE.PointLight(0xffd6a0, 5.5, 18, 1.6);
      scene.add(playerLight);

      const loader = new GLTFLoader();
      const loadGltf = (name: string) => loader.loadAsync(`${ROOT}${name}`);
      const [base, outfit, animations, loadedMonsters] = await Promise.all([
        loadGltf('base-male.glb'),
        loadGltf('ranger.glb'),
        loadGltf('animations.glb'),
        loadMonsterLibrary(THREE),
      ]);
      if (disposed) return;
      monsterLibrary = loadedMonsters;

      rangerRig = composeFullRanger(THREE, base.scene, outfit.scene, animations.animations ?? []);
      rangerRig.root.scale.setScalar(1.04);
      scene.add(rangerRig.root);

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${WEAPON_ROOT}${name}.mtl`);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        return objLoader.loadAsync(`${WEAPON_ROOT}${name}.obj`);
      };
      const [bow, arrow] = await Promise.all([loadObj('Bow_Wooden2'), loadObj('Arrow')]);
      bowRig = attachBowToRanger(THREE, rangerRig.root, normalize(bow, 1.02));
      arrowProto = normalize(arrow, 0.78);
      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Vertical slice renderer failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      rangerRig?.stop();
      for (const visual of enemyVisuals.values()) { visual.mixer?.stopAllAction?.(); disposeObject(visual.root); }
      for (const mesh of arrowVisuals.values()) disposeObject(mesh);
      for (const mesh of itemVisuals.values()) disposeObject(mesh);
      if (roomRoot) disposeObject(roomRoot);
      if (portal) disposeObject(portal);
      if (rangerRig?.root) disposeObject(rangerRig.root);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
