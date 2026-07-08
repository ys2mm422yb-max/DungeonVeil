import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { composeFullRanger } from './rangerCharacterRig';
import { attachBowToRanger } from './bowRig';
import { createSlimeVisual, updateSlimeVisual } from './slimeVisual';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ROOT = '/assets/3d/';
const TILE = 40;
const OX = 8.5;
const OZ = 11.5;
const wx = (value: number) => value / TILE - OX;
const wz = (value: number) => value / TILE - OZ;

function hash2(x: number, y: number, salt = 0) {
  let value = ((x + 31) * 73856093) ^ ((y + 17) * 19349663) ^ (salt * 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function GameCanvasSlimeArena3D({ gameState }: { gameState: GameState }) {
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
    let arrowProto: any;
    let portal: any = null;
    let arenaGroup: any = null;
    let lastMapKey = '';
    let lastAttack = 0;
    let attackPulse = 0;
    let natureAssets: Record<string, any> | null = null;

    const enemyVisuals = new Map<string, ReturnType<typeof createSlimeVisual>>();
    const arrows = new Map<string, any>();
    const items = new Map<string, any>();
    const effects = new Map<string, any>();

    const mat = (color: number, roughness = 0.8, emissive = 0, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, emissive, emissiveIntensity });

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const normalize = (object: any, targetSize: number) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      object.position.sub(center);
      object.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z, 0.0001));
      object.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      return object;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || innerWidth;
      const height = host.clientHeight || innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const makeGroundTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#4e7338';
      context.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) {
        for (let x = 0; x < 256; x += 8) {
          const noise = hash2(x, y, 51);
          context.fillStyle = noise > 0.58 ? 'rgba(142,160,82,.12)' : 'rgba(25,66,35,.11)';
          context.beginPath();
          context.ellipse(x + noise * 5, y + noise * 3, 2 + noise * 5, 1 + noise * 3, noise * 2, 0, Math.PI * 2);
          context.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 7);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const cloneNature = (name: string, x: number, z: number, scale: number, rotation: number) => {
      const source = natureAssets?.[name];
      if (!source) return null;
      const object = source.clone(true);
      object.position.set(x, 0, z);
      object.rotation.y = rotation;
      object.scale.setScalar(scale);
      object.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      return object;
    };

    const rebuildArena = (state: GameState) => {
      if (!natureAssets) return;
      const key = state.map.tiles.map(row => row.join('')).join('');
      if (key === lastMapKey) return;
      lastMapKey = key;
      if (arenaGroup) {
        scene.remove(arenaGroup);
        disposeObject(arenaGroup);
      }

      const group = new THREE.Group();
      group.name = 'ForestArena';

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(state.map.width, state.map.height),
        new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1, color: 0xf0f0e5 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(state.map.width / 2 - OX, -0.018, state.map.height / 2 - OZ);
      ground.receiveShadow = true;
      group.add(ground);

      const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x786845, roughness: 1, transparent: true, opacity: 0.34 });
      for (let y = 2; y < state.map.height - 2; y += 3) {
        for (let x = 2; x < state.map.width - 2; x += 3) {
          if (state.map.tiles[y][x] === TileType.WALL) continue;
          const chance = hash2(x, y, state.floor);
          if (chance < 0.72) continue;
          const patch = new THREE.Mesh(new THREE.CircleGeometry(0.45 + chance * 0.55, 12), pathMaterial);
          patch.rotation.x = -Math.PI / 2;
          patch.rotation.z = chance * Math.PI;
          patch.scale.set(1.5, 0.65 + chance * 0.25, 1);
          patch.position.set(x + 0.5 - OX, -0.006, y + 0.5 - OZ);
          group.add(patch);
        }
      }

      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          const tile = state.map.tiles[y][x];
          const px = x + 0.5 - OX;
          const pz = y + 0.5 - OZ;
          const seed = hash2(x, y, state.floor);

          if (tile === TileType.WALL) {
            const edge = x < 2 || y < 2 || x >= state.map.width - 2 || y >= state.map.height - 2;
            const choice = seed < 0.18 ? 'tree' : seed < 0.34 ? 'pine' : seed < 0.68 ? 'rock' : 'bush';
            const scaleBase = choice === 'tree' || choice === 'pine' ? (edge ? 1.25 : 0.92) : choice === 'rock' ? 0.62 : 0.68;
            const object = cloneNature(choice, px + (seed - 0.5) * 0.26, pz + (hash2(x, y, 12) - 0.5) * 0.22, scaleBase * (0.82 + hash2(x, y, 7) * 0.42), seed * Math.PI * 2);
            if (object) group.add(object);
            if (edge && seed > 0.58) {
              const companion = cloneNature(seed > 0.8 ? 'bush' : 'rock', px + 0.34, pz - 0.25, 0.38 + seed * 0.25, seed * 5.7);
              if (companion) group.add(companion);
            }
            continue;
          }

          const nearSpawn = Math.abs(x - state.map.startX) < 3 && Math.abs(y - state.map.startY) < 3;
          const isExit = tile === TileType.STAIRS_DOWN;
          if (nearSpawn || isExit) continue;

          if (seed > 0.9) {
            const bush = cloneNature('bush', px + (seed - 0.5) * 0.45, pz + (hash2(x, y, 91) - 0.5) * 0.45, 0.16 + seed * 0.1, seed * Math.PI * 2);
            if (bush) group.add(bush);
          } else if (seed > 0.84) {
            const pebble = cloneNature('rock', px + 0.25, pz - 0.2, 0.1 + seed * 0.07, seed * Math.PI);
            if (pebble) group.add(pebble);
          }
        }
      }

      arenaGroup = group;
      scene.add(group);
    };

    const syncEnemies = (state: GameState, now: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, visual] of enemyVisuals) {
        if (!active.has(id)) {
          scene.remove(visual.root);
          disposeObject(visual.root);
          enemyVisuals.delete(id);
        }
      }

      for (const enemy of state.enemies) {
        let visual = enemyVisuals.get(enemy.id);
        if (!visual) {
          visual = createSlimeVisual(THREE, enemy);
          scene.add(visual.root);
          enemyVisuals.set(enemy.id, visual);
        }
        visual.root.position.set(wx(enemy.x + enemy.width / 2), 0, wz(enemy.y + enemy.height / 2));
        visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        updateSlimeVisual(visual, enemy, now);
      }
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const active = new Set(shots.map(shot => shot.id));
      for (const [id, mesh] of arrows) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          arrows.delete(id);
        }
      }
      for (const shot of shots) {
        let arrow = arrows.get(shot.id);
        if (!arrow) {
          arrow = arrowProto?.clone(true);
          if (!arrow) continue;
          scene.add(arrow);
          arrows.set(shot.id, arrow);
        }
        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(wx(shot.x) + Math.cos(angle) * travel * progress, 0.9, wz(shot.y) + Math.sin(angle) * travel * progress);
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
      }
    };

    const syncItems = (state: GameState, now: number) => {
      const active = new Set(state.items.map(item => item.id));
      for (const [id, mesh] of items) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          items.delete(id);
        }
      }
      for (const item of state.items) {
        let mesh = items.get(item.id);
        if (!mesh) {
          mesh = item.itemType === 'xp_orb'
            ? new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat(0x69d9ff, 0.2, 0x1d8ccb, 1.3))
            : new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat(0xa52c40, 0.35, 0x5d1322, 0.4));
          scene.add(mesh);
          items.set(item.id, mesh);
        }
        mesh.position.set(wx(item.x + item.width / 2), 0.2 + Math.sin((now - item.spawnTime) / 260) * 0.04, wz(item.y + item.height / 2));
        mesh.rotation.y += 0.025;
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
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.6), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.9;
        portal.add(veil);
        const rune = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: 0x9b76ff }));
        rune.rotation.x = Math.PI / 2;
        rune.position.y = 0.035;
        portal.add(rune);
        portal.userData.veil = veil;
        portal.userData.rune = rune;
        scene.add(portal);
      }
      let exitX = Math.floor(state.map.width / 2);
      let exitY = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { exitX = x; exitY = y; break; }
      }
      portal.position.set(exitX + 0.5 - OX, 0, exitY + 0.5 - OZ);
      const time = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(time * 1.7) * 0.06;
      portal.userData.rune.rotation.z = time * 0.3;
    };

    const syncEffects = (state: GameState) => {
      const visible = state.effects.filter(effect => effect.type === 'pickup' || effect.type === 'dash');
      const active = new Set(visible.map(effect => effect.id));
      for (const [id, mesh] of effects) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          effects.delete(id);
        }
      }
      for (const effect of visible) {
        let mesh = effects.get(effect.id);
        if (!mesh) {
          mesh = new THREE.Mesh(new THREE.TorusGeometry(effect.type === 'dash' ? 0.35 : 0.18, 0.025, 5, 18), new THREE.MeshBasicMaterial({ color: effect.type === 'dash' ? 0x8fd8ff : 0x8be5ff, transparent: true, opacity: 0.65 }));
          mesh.rotation.x = Math.PI / 2;
          scene.add(mesh);
          effects.set(effect.id, mesh);
        }
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        mesh.position.set(wx(effect.x), 0.08 + progress * 0.18, wz(effect.y));
        mesh.scale.setScalar(0.7 + progress * 1.7);
        mesh.material.opacity = 0.65 * (1 - progress);
      }
    };

    const renderLoop = () => {
      if (disposed || !renderer || !scene || !camera) return;
      const state = stateRef.current;
      const now = Date.now();
      const delta = Math.min(clock.getDelta(), 0.05);
      const player = state.player;
      const playerX = wx(player.x);
      const playerZ = wz(player.y);

      if (rangerRig) {
        rangerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(player.facing.x, player.facing.y) > 0.1) rangerRig.root.rotation.y = Math.atan2(player.facing.x, player.facing.y);
        rangerRig.setMoving(player.state === 'moving');
        if (player.lastAttackTime > lastAttack) {
          lastAttack = player.lastAttackTime;
          attackPulse = 1;
        }
        attackPulse = Math.max(0, attackPulse - delta * 5.5);
        bowRig?.updateShotPose(attackPulse);
        rangerRig.update(delta);
      }

      rebuildArena(state);
      syncEnemies(state, now);
      syncArrows(state);
      syncItems(state, now);
      syncPortal(state, now);
      syncEffects(state);
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
      scene.background = new THREE.Color(0x203d2b);
      scene.fog = new THREE.Fog(0x203d2b, 24, 52);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 120);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xf2efda, 0x20341e, 2.25));
      const sun = new THREE.DirectionalLight(0xffe2a8, 2.7);
      sun.position.set(-8, 14, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      const loader = new GLTFLoader();
      const loadGltf = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ROOT}${name}`, resolve, undefined, reject));
      const [baseGltf, outfitGltf, animationsGltf, treeGltf, pineGltf, rockGltf, bushGltf] = await Promise.all([
        loadGltf('base-male.glb'), loadGltf('ranger.glb'), loadGltf('animations.glb'),
        loadGltf('tree.glb'), loadGltf('pine.glb'), loadGltf('rock.glb'), loadGltf('bush.glb'),
      ]);
      if (disposed) return;

      natureAssets = {
        tree: normalize(treeGltf.scene, 3.8),
        pine: normalize(pineGltf.scene, 4.2),
        rock: normalize(rockGltf.scene, 1.2),
        bush: normalize(bushGltf.scene, 1.1),
      };

      rangerRig = composeFullRanger(THREE, baseGltf.scene, outfitGltf.scene, animationsGltf.animations ?? []);
      rangerRig.root.scale.setScalar(1.08);
      scene.add(rangerRig.root);

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${ROOT}${name}.mtl`);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        return objLoader.loadAsync(`${ROOT}${name}.obj`);
      };
      const [bowObject, arrowObject] = await Promise.all([loadObj('Bow_Wooden2'), loadObj('Arrow')]);
      bowRig = attachBowToRanger(THREE, rangerRig.root, normalize(bowObject, 1.08));
      arrowProto = normalize(arrowObject, 0.82);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Slime arena renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      rangerRig?.stop();
      for (const visual of enemyVisuals.values()) disposeObject(visual.root);
      enemyVisuals.clear();
      for (const collection of [arrows, items, effects]) {
        for (const mesh of collection.values()) disposeObject(mesh);
        collection.clear();
      }
      if (arenaGroup) disposeObject(arenaGroup);
      if (portal) disposeObject(portal);
      if (rangerRig?.root) disposeObject(rangerRig.root);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
