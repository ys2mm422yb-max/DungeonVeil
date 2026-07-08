import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { composeFullRanger } from './rangerCharacterRig';
import { attachBowToRanger } from './bowRig';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ROOT = '/assets/3d/';
const TILE = 40;
const OX = 8.5;
const OZ = 11.5;
const COLORS = [0x43b86b, 0x4fa8ff, 0xb866ff, 0xff9b45, 0xff5d7a, 0xe8d84f];
const wx = (x: number) => x / TILE - OX;
const wz = (y: number) => y / TILE - OZ;

export function GameCanvasWeapon3D({ gameState }: { gameState: GameState }) {
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
    let wallGroup: any = null;
    let lastMapKey = '';
    let lastAttack = 0;
    let attackPulse = 0;

    const enemyMeshes = new Map<string, any>();
    const arrowMeshes = new Map<string, any>();
    const itemMeshes = new Map<string, any>();
    const fxMeshes = new Map<string, any>();

    const mat = (color: number, roughness = 0.8, emissive = 0, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, emissive, emissiveIntensity });

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

    const slimeVariant = (enemy: GameState['enemies'][number]) => {
      let hash = 0;
      for (let i = 0; i < enemy.id.length; i++) hash = (hash * 31 + enemy.id.charCodeAt(i)) >>> 0;
      return {
        color: COLORS[hash % COLORS.length],
        size: 0.8 + ((hash >>> 3) % 5) * 0.12,
        squash: 0.52 + ((hash >>> 7) % 4) * 0.06,
      };
    };

    const makeSlime = (enemy: GameState['enemies'][number]) => {
      const variant = slimeVariant(enemy);
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 9), mat(variant.color, 0.46, variant.color, 0.12));
      body.scale.set(1.12, variant.squash, 1);
      body.position.y = 0.26;
      body.castShadow = body.receiveShadow = true;
      body.userData.baseY = 0.26;
      body.userData.baseScaleY = variant.squash;
      group.add(body);
      const eyeMaterial = mat(0x140d0a, 0.3);
      for (const x of [-0.13, 0.13]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 5), eyeMaterial);
        eye.position.set(x, 0.32, 0.35);
        group.add(eye);
      }
      group.userData.body = body;
      group.userData.seed = variant.size * 17.3;
      return group;
    };

    const syncEnemies = (state: GameState, now: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, mesh] of enemyMeshes) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          enemyMeshes.delete(id);
        }
      }
      for (const enemy of state.enemies) {
        let mesh = enemyMeshes.get(enemy.id);
        if (!mesh) {
          mesh = makeSlime(enemy);
          scene.add(mesh);
          enemyMeshes.set(enemy.id, mesh);
        }
        const variant = slimeVariant(enemy);
        mesh.position.set(wx(enemy.x + enemy.width / 2), 0, wz(enemy.y + enemy.height / 2));
        mesh.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        const bob = Math.sin(now * 0.006 + mesh.userData.seed) * 0.045;
        mesh.userData.body.position.y = mesh.userData.body.userData.baseY + bob;
        mesh.userData.body.scale.y = mesh.userData.body.userData.baseScaleY * (1 - bob * 1.8);
        mesh.scale.setScalar(variant.size * (enemy.enemyType === 'boss' ? 1.8 : 1) * (enemy.flashUntil > now ? 1.08 : 1));
      }
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const active = new Set(shots.map(shot => shot.id));
      for (const [id, mesh] of arrowMeshes) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          arrowMeshes.delete(id);
        }
      }
      for (const shot of shots) {
        let arrow = arrowMeshes.get(shot.id);
        if (!arrow) {
          arrow = arrowProto?.clone(true);
          if (!arrow) continue;
          scene.add(arrow);
          arrowMeshes.set(shot.id, arrow);
        }
        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(wx(shot.x) + Math.cos(angle) * travel * progress, 0.9, wz(shot.y) + Math.sin(angle) * travel * progress);
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
      }
    };

    const makeItem = (type: string) => {
      if (type === 'xp_orb') return new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat(0x69d9ff, 0.2, 0x1d8ccb, 1.3));
      return new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat(0xa52c40, 0.35, 0x5d1322, 0.4));
    };

    const syncItems = (state: GameState, now: number) => {
      const active = new Set(state.items.map(item => item.id));
      for (const [id, mesh] of itemMeshes) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          itemMeshes.delete(id);
        }
      }
      for (const item of state.items) {
        let mesh = itemMeshes.get(item.id);
        if (!mesh) {
          mesh = makeItem(item.itemType);
          scene.add(mesh);
          itemMeshes.set(item.id, mesh);
        }
        mesh.position.set(wx(item.x + item.width / 2), 0.2 + Math.sin((now - item.spawnTime) / 260) * 0.04, wz(item.y + item.height / 2));
        mesh.rotation.y += 0.025;
      }
    };

    const syncWalls = (state: GameState) => {
      const key = state.map.tiles.map(row => row.join('')).join('');
      if (key === lastMapKey) return;
      lastMapKey = key;
      if (wallGroup) {
        scene.remove(wallGroup);
        disposeObject(wallGroup);
      }
      wallGroup = new THREE.Group();
      const rockMaterial = mat(0x65594a, 0.98);
      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;
          const seed = (x * 928371 + y * 1237) % 1000;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38 + (seed % 5) * 0.015, 0), rockMaterial);
          rock.position.set(x + 0.5 - OX, 0.34, y + 0.5 - OZ);
          rock.scale.set(0.9 + (seed % 5) * 0.05, 0.7 + (seed % 7) * 0.03, 0.82 + (seed % 3) * 0.07);
          rock.rotation.y = (seed % 11) * 0.17;
          rock.castShadow = rock.receiveShadow = true;
          wallGroup.add(rock);
        }
      }
      scene.add(wallGroup);
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
        const group = new THREE.Group();
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.6), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.9;
        group.add(veil);
        const rune = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: 0x9b76ff }));
        rune.rotation.x = Math.PI / 2;
        rune.position.y = 0.035;
        group.add(rune);
        group.userData.veil = veil;
        group.userData.rune = rune;
        portal = group;
        scene.add(group);
      }
      let sx = Math.floor(state.map.width / 2);
      let sy = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { sx = x; sy = y; break; }
      }
      portal.position.set(sx + 0.5 - OX, 0, sy + 0.5 - OZ);
      const time = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(time * 1.7) * 0.06;
      portal.userData.rune.rotation.z = time * 0.3;
    };

    const syncEffects = (state: GameState) => {
      const visible = state.effects.filter(effect => effect.type === 'pickup' || effect.type === 'dash');
      const active = new Set(visible.map(effect => effect.id));
      for (const [id, mesh] of fxMeshes) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          fxMeshes.delete(id);
        }
      }
      for (const effect of visible) {
        let mesh = fxMeshes.get(effect.id);
        if (!mesh) {
          mesh = new THREE.Mesh(new THREE.TorusGeometry(effect.type === 'dash' ? 0.35 : 0.18, 0.025, 5, 18), new THREE.MeshBasicMaterial({ color: effect.type === 'dash' ? 0x8fd8ff : 0x8be5ff, transparent: true, opacity: 0.65 }));
          mesh.rotation.x = Math.PI / 2;
          scene.add(mesh);
          fxMeshes.set(effect.id, mesh);
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

      syncEnemies(state, now);
      syncArrows(state);
      syncItems(state, now);
      syncWalls(state);
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
      scene.background = new THREE.Color(0x29452d);
      scene.fog = new THREE.Fog(0x29452d, 30, 62);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 120);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xf1f4df, 0x24391f, 2.5));
      const sun = new THREE.DirectionalLight(0xffefd2, 3);
      sun.position.set(-7, 15, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 72), new THREE.MeshStandardMaterial({ color: 0x4d783a, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.02;
      floor.receiveShadow = true;
      scene.add(floor);

      const gltfLoader = new GLTFLoader();
      const loadGltf = (name: string) => new Promise<any>((resolve, reject) => gltfLoader.load(`${ROOT}${name}`, resolve, undefined, reject));
      const [baseGltf, outfitGltf, animationsGltf, rockGltf, bushGltf] = await Promise.all([
        loadGltf('base-male.glb'), loadGltf('ranger.glb'), loadGltf('animations.glb'), loadGltf('rock.glb'), loadGltf('bush.glb'),
      ]);
      if (disposed) return;

      rangerRig = composeFullRanger(THREE, baseGltf.scene, outfitGltf.scene, animationsGltf.animations ?? []);
      rangerRig.root.scale.setScalar(1.18);
      scene.add(rangerRig.root);

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${ROOT}${name}.mtl`);
        materials.preload();
        const loader = new OBJLoader();
        loader.setMaterials(materials);
        return loader.loadAsync(`${ROOT}${name}.obj`);
      };
      const [bowObject, arrowObject] = await Promise.all([loadObj('Bow_Wooden2'), loadObj('Arrow')]);
      const bow = normalize(bowObject, 1.25);
      arrowProto = normalize(arrowObject, 0.82);
      bowRig = attachBowToRanger(THREE, rangerRig.root, bow);

      const outerWorld = new THREE.Group();
      const rockProto = rockGltf.scene;
      const bushProto = bushGltf.scene;
      let seed = 41827;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 58; i++) {
        const side = i % 4;
        let x = 0;
        let z = 0;
        if (side === 0) { x = -10.4 - random() * 5; z = -13 + random() * 28; }
        else if (side === 1) { x = 10.4 + random() * 5; z = -13 + random() * 28; }
        else if (side === 2) { x = -9 + random() * 18; z = -14.5 - random() * 5; }
        else { x = -9 + random() * 18; z = 14.5 + random() * 5; }
        const useRock = random() > 0.62;
        const object = (useRock ? rockProto : bushProto).clone(true);
        object.position.set(x, 0, z);
        object.rotation.y = random() * Math.PI * 2;
        object.scale.setScalar(useRock ? 0.55 + random() * 0.65 : 0.42 + random() * 0.58);
        outerWorld.add(object);
      }
      scene.add(outerWorld);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Weapon-rig 3D renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      rangerRig?.stop();
      for (const collection of [enemyMeshes, arrowMeshes, itemMeshes, fxMeshes]) {
        for (const mesh of collection.values()) disposeObject(mesh);
        collection.clear();
      }
      if (rangerRig?.root) disposeObject(rangerRig.root);
      if (portal) disposeObject(portal);
      if (wallGroup) disposeObject(wallGroup);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
