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

function hash2(x: number, y: number, salt = 0) {
  let value = ((x + 31) * 73856093) ^ ((y + 17) * 19349663) ^ (salt * 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function GameCanvasClearForest3D({ gameState }: { gameState: GameState }) {
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
    let arenaGroup: any = null;
    let portal: any = null;
    let natureAssets: Record<string, any> | null = null;
    let lastMapKey = '';
    let lastAttack = 0;
    let attackPulse = 0;

    const enemies = new Map<string, ReturnType<typeof createSlimeVisual>>();
    const arrows = new Map<string, any>();
    const items = new Map<string, any>();
    const effects = new Map<string, any>();

    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((m: any) => m?.dispose?.());
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
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#557640';
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) {
        for (let x = 0; x < 256; x += 8) {
          const n = hash2(x, y, 51);
          ctx.fillStyle = n > 0.55 ? 'rgba(162,166,88,.13)' : 'rgba(24,70,36,.12)';
          ctx.beginPath();
          ctx.ellipse(x + n * 5, y + n * 3, 2 + n * 5, 1 + n * 3, n * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(7, 9);
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
      const key = `${state.map.width}x${state.map.height}:${state.floor}:${state.map.tiles.map(r => r.join('')).join('')}`;
      if (key === lastMapKey) return;
      lastMapKey = key;

      if (arenaGroup) {
        scene.remove(arenaGroup);
        disposeObject(arenaGroup);
      }

      const group = new THREE.Group();
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(state.map.width, state.map.height),
        new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1, color: 0xf0f0e5 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      ground.receiveShadow = true;
      group.add(ground);

      const dirtMaterial = new THREE.MeshStandardMaterial({ color: 0x7a6845, roughness: 1, transparent: true, opacity: 0.25 });
      for (let y = 4; y < state.map.height - 5; y += 4) {
        for (let x = 4; x < state.map.width - 4; x += 4) {
          if (state.map.tiles[y][x] === TileType.WALL) continue;
          const n = hash2(x, y, state.floor);
          if (n < 0.65) continue;
          const patch = new THREE.Mesh(new THREE.CircleGeometry(0.5 + n * 0.7, 14), dirtMaterial);
          patch.rotation.x = -Math.PI / 2;
          patch.rotation.z = n * Math.PI;
          patch.scale.set(1.7, 0.6 + n * 0.2, 1);
          patch.position.set(x + 0.5 - state.map.width / 2, -0.007, y + 0.5 - state.map.height / 2);
          group.add(patch);
        }
      }

      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;

          const px = x + 0.5 - state.map.width / 2;
          const pz = y + 0.5 - state.map.height / 2;
          const n = hash2(x, y, state.floor);
          const north = y <= 2;
          const south = y >= state.map.height - 3;
          const side = x <= 2 || x >= state.map.width - 3;
          const centerSightline = Math.abs(x - state.map.width / 2) < 5;

          let choice = 'rock';
          let scale = 0.55 + n * 0.22;

          if (north) {
            choice = n < 0.42 ? 'tree' : n < 0.7 ? 'pine' : n < 0.86 ? 'rock' : 'bush';
            scale = choice === 'tree' || choice === 'pine' ? 0.78 + n * 0.24 : 0.48 + n * 0.2;
          } else if (south) {
            choice = centerSightline ? 'rock' : n < 0.7 ? 'rock' : 'bush';
            scale = choice === 'rock' ? 0.46 + n * 0.18 : 0.3 + n * 0.12;
          } else if (side) {
            choice = n < 0.18 ? 'tree' : n < 0.3 ? 'pine' : n < 0.72 ? 'rock' : 'bush';
            scale = choice === 'tree' || choice === 'pine' ? 0.56 + n * 0.16 : 0.4 + n * 0.2;
          } else {
            choice = n < 0.76 ? 'rock' : 'bush';
            scale = choice === 'rock' ? 0.42 + n * 0.16 : 0.24 + n * 0.1;
          }

          const object = cloneNature(choice, px, pz, scale, n * Math.PI * 2);
          if (object) group.add(object);
        }
      }

      arenaGroup = group;
      scene.add(group);
    };

    const syncEnemies = (state: GameState, now: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, visual] of enemies) {
        if (!active.has(id)) {
          scene.remove(visual.root);
          disposeObject(visual.root);
          enemies.delete(id);
        }
      }
      for (const enemy of state.enemies) {
        let visual = enemies.get(enemy.id);
        if (!visual) {
          visual = createSlimeVisual(THREE, enemy);
          scene.add(visual.root);
          enemies.set(enemy.id, visual);
        }
        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));
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
        if (!arrow && arrowProto) {
          arrow = arrowProto.clone(true);
          scene.add(arrow);
          arrows.set(shot.id, arrow);
        }
        if (!arrow) continue;
        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(mapX(state, shot.x) + Math.cos(angle) * travel * progress, 0.9, mapZ(state, shot.y) + Math.sin(angle) * travel * progress);
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
          const material = item.itemType === 'xp_orb'
            ? new THREE.MeshStandardMaterial({ color: 0x69d9ff, emissive: 0x1d8ccb, emissiveIntensity: 1.2 })
            : new THREE.MeshStandardMaterial({ color: 0xb42f48, emissive: 0x66182a, emissiveIntensity: 0.4 });
          mesh = item.itemType === 'xp_orb'
            ? new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), material)
            : new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), material);
          scene.add(mesh);
          items.set(item.id, mesh);
        }
        mesh.position.set(mapX(state, item.x + item.width / 2), 0.22 + Math.sin((now - item.spawnTime) / 260) * 0.04, mapZ(state, item.y + item.height / 2));
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
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.6), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
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
      portal.position.set(exitX + 0.5 - state.map.width / 2, 0, exitY + 0.5 - state.map.height / 2);
      const t = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(t * 1.7) * 0.06;
      portal.userData.rune.rotation.z = t * 0.3;
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
          mesh = new THREE.Mesh(
            new THREE.TorusGeometry(effect.type === 'dash' ? 0.35 : 0.18, 0.025, 5, 18),
            new THREE.MeshBasicMaterial({ color: effect.type === 'dash' ? 0x8fd8ff : 0x8be5ff, transparent: true, opacity: 0.65 }),
          );
          mesh.rotation.x = Math.PI / 2;
          scene.add(mesh);
          effects.set(effect.id, mesh);
        }
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        mesh.position.set(mapX(state, effect.x), 0.08 + progress * 0.18, mapZ(state, effect.y));
        mesh.scale.setScalar(0.7 + progress * 1.7);
        mesh.material.opacity = 0.65 * (1 - progress);
      }
    };

    const renderLoop = () => {
      if (disposed || !renderer || !scene || !camera) return;
      const state = stateRef.current;
      const now = Date.now();
      const delta = Math.min(clock.getDelta(), 0.05);
      const playerX = mapX(state, state.player.x);
      const playerZ = mapZ(state, state.player.y);

      if (rangerRig) {
        rangerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(state.player.facing.x, state.player.facing.y) > 0.1) {
          rangerRig.root.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        }
        rangerRig.setMoving(state.player.state === 'moving');
        if (state.player.lastAttackTime > lastAttack) {
          lastAttack = state.player.lastAttackTime;
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
      scene.fog = new THREE.Fog(0x203d2b, 30, 58);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 140);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xf2efda, 0x20341e, 2.2));
      const sun = new THREE.DirectionalLight(0xffe2a8, 2.55);
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
      rangerRig.root.scale.setScalar(1.02);
      scene.add(rangerRig.root);

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${ROOT}${name}.mtl`);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        return objLoader.loadAsync(`${ROOT}${name}.obj`);
      };
      const [bowObject, arrowObject] = await Promise.all([loadObj('Bow_Wooden2'), loadObj('Arrow')]);
      bowRig = attachBowToRanger(THREE, rangerRig.root, normalize(bowObject, 1.02));
      arrowProto = normalize(arrowObject, 0.82);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Clear forest renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      rangerRig?.stop();
      for (const visual of enemies.values()) disposeObject(visual.root);
      enemies.clear();
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
