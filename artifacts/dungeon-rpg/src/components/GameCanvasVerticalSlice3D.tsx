import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { composeFullRanger } from './rangerCharacterRig';
import { attachBowToRanger } from './bowRig';
import { createSlimeVisual, updateSlimeVisual } from './slimeVisual';
import { buildChapterRoomDecor } from './roomDecor3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ROOT = '/assets/3d/';
const TILE = 40;

function hash(seed: number) {
  const value = Math.sin(seed * 91.73) * 43758.5453;
  return value - Math.floor(value);
}

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
    let natureAssets: Record<string, any> = {};
    let roomRoot: any = null;
    let portal: any = null;
    let lastRoomKey = '';
    let lastAttack = 0;
    let attackPulse = 0;

    const enemyVisuals = new Map<string, ReturnType<typeof createSlimeVisual>>();
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

    const cloneNature = (name: string, x: number, z: number, scale: number, rotation: number) => {
      const source = natureAssets[name];
      if (!source) return null;
      const object = source.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.multiplyScalar(scale);
      return object;
    };

    const makeGround = (state: GameState) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const roomColors = ['#536e3d', '#65714a', '#505f39', '#475735'];
      ctx.fillStyle = roomColors[(Math.max(1, state.floor) - 1) % roomColors.length];
      ctx.fillRect(0, 0, 256, 256);
      for (let index = 0; index < 240; index++) {
        const x = hash(index + state.floor * 17) * 256;
        const y = hash(index * 3 + state.floor * 29) * 256;
        const r = 1 + hash(index * 7) * 5;
        ctx.fillStyle = index % 3 === 0 ? 'rgba(191,168,91,.11)' : 'rgba(25,50,29,.14)';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.7, r * 0.7, hash(index * 13) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(7, 9);
      texture.colorSpace = THREE.SRGBColorSpace;

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(state.map.width, state.map.height),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 1, color: 0xe9ead8 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.025;
      ground.receiveShadow = true;
      return ground;
    };

    const buildRoom = (state: GameState) => {
      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
      if (key === lastRoomKey) return;
      lastRoomKey = key;
      if (roomRoot) {
        scene.remove(roomRoot);
        disposeObject(roomRoot);
      }

      const root = new THREE.Group();
      root.add(makeGround(state));

      const room = Math.max(1, Math.min(4, state.floor));
      const decor = buildChapterRoomDecor(THREE, room);
      root.add(decor);
      root.userData.decor = decor;

      const halfW = state.map.width / 2;
      const halfH = state.map.height / 2;
      for (let index = 0; index < 44; index++) {
        const edge = index % 4;
        const t = hash(index * 17 + room * 101);
        let x = 0;
        let z = 0;
        if (edge === 0) { x = -halfW - 1.2 - hash(index) * 3; z = -halfH + t * state.map.height; }
        else if (edge === 1) { x = halfW + 1.2 + hash(index) * 3; z = -halfH + t * state.map.height; }
        else if (edge === 2) { x = -halfW + t * state.map.width; z = -halfH - 1.5 - hash(index) * 3; }
        else { x = -halfW + t * state.map.width; z = halfH + 1.5 + hash(index) * 3; }

        const n = hash(index * 29 + room * 11);
        const name = n < 0.42 ? 'rock' : n < 0.68 ? 'bush' : n < 0.84 ? 'tree' : 'pine';
        if (edge === 3 && Math.abs(x) < 5 && (name === 'tree' || name === 'pine')) continue;
        const scale = name === 'tree' || name === 'pine' ? 0.55 + n * 0.22 : 0.38 + n * 0.18;
        const object = cloneNature(name, x, z, scale, n * Math.PI * 2);
        if (object) root.add(object);
      }

      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;
          if (x !== 0 && y !== 0 && x !== state.map.width - 1 && y !== state.map.height - 1) continue;
          const px = x + 0.5 - state.map.width / 2;
          const pz = y + 0.5 - state.map.height / 2;
          const rock = cloneNature('rock', px, pz, 0.32 + hash(x * 31 + y * 17) * 0.12, hash(x + y) * Math.PI * 2);
          if (rock) root.add(rock);
        }
      }

      roomRoot = root;
      scene.add(root);
    };

    const syncEnemies = (state: GameState, now: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, visual] of enemyVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual.root);
        disposeObject(visual.root);
        enemyVisuals.delete(id);
      }

      for (const enemy of state.enemies) {
        let visual = enemyVisuals.get(enemy.id);
        if (!visual) {
          visual = createSlimeVisual(THREE, enemy);
          scene.add(visual.root);
          enemyVisuals.set(enemy.id, visual);
        }
        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));
        visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        updateSlimeVisual(visual, enemy, now);
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
            new THREE.MeshStandardMaterial({
              color: xp ? 0x78ddff : 0xdb3952,
              emissive: xp ? 0x147da5 : 0x6b1323,
              emissiveIntensity: xp ? 1.8 : 0.75,
            }),
          );
          scene.add(mesh);
          itemVisuals.set(item.id, mesh);
        }
        mesh.position.set(
          mapX(state, item.x + item.width / 2),
          0.24 + Math.sin((now - item.spawnTime) * 0.005) * 0.06,
          mapZ(state, item.y + item.height / 2),
        );
        mesh.rotation.y += 0.035;
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
      roomRoot?.userData?.decor?.userData?.update?.(now);

      if (rangerRig) {
        rangerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(state.player.facing.x, state.player.facing.y) > 0.1) {
          rangerRig.root.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        }
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

      syncEnemies(state, now);
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
      scene.background = new THREE.Color(0x172b20);
      scene.fog = new THREE.Fog(0x172b20, 34, 64);

      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 150);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xfff4db, 0x17271d, 2.0));
      const sun = new THREE.DirectionalLight(0xffd89a, 2.75);
      sun.position.set(-9, 16, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      const loader = new GLTFLoader();
      const loadGltf = (name: string) => loader.loadAsync(`${ROOT}${name}`);
      const [base, outfit, animations, tree, pine, rock, bush] = await Promise.all([
        loadGltf('base-male.glb'),
        loadGltf('ranger.glb'),
        loadGltf('animations.glb'),
        loadGltf('tree.glb'),
        loadGltf('pine.glb'),
        loadGltf('rock.glb'),
        loadGltf('bush.glb'),
      ]);
      if (disposed) return;

      natureAssets = {
        tree: normalize(tree.scene, 3.8),
        pine: normalize(pine.scene, 4.2),
        rock: normalize(rock.scene, 1.15),
        bush: normalize(bush.scene, 1.05),
      };

      rangerRig = composeFullRanger(THREE, base.scene, outfit.scene, animations.animations ?? []);
      rangerRig.root.scale.setScalar(1.04);
      scene.add(rangerRig.root);

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${ROOT}${name}.mtl`);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        return objLoader.loadAsync(`${ROOT}${name}.obj`);
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
      for (const visual of enemyVisuals.values()) disposeObject(visual.root);
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
