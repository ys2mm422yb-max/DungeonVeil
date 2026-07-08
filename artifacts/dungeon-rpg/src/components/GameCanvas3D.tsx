import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TILE_SIZE, TileType } from '../game/dungeon';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ASSET_ROOT = '/assets/3d/';

export function GameCanvas3D({ gameState }: { gameState: GameState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let THREE: any;
    let renderer: any;
    let scene: any;
    let camera: any;
    let hero: any;
    let mixer: any;
    let idleAction: any;
    let runAction: any;
    let attackAction: any;
    let activeAction: any;
    let clock: any;
    let desiredCamera: any;
    let portalMesh: any;
    let lastAttackTime = 0;
    const enemyMeshes = new Map<string, any>();
    const arrowMeshes = new Map<string, any>();
    const itemMeshes = new Map<string, any>();

    const disposeObject = (object: any) => {
      object?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const fadeTo = (next: any, duration = 0.12) => {
      if (!next || next === activeAction) return;
      next.reset().fadeIn(duration).play();
      activeAction?.fadeOut(duration);
      activeAction = next;
    };

    const makeMaterial = (color: string | number, roughness = 0.72, emissive?: string | number, emissiveIntensity = 0.18) => (
      new THREE.MeshStandardMaterial({ color, roughness, emissive: emissive ?? color, emissiveIntensity })
    );

    const addMesh = (group: any, geometry: any, color: string | number, position: [number, number, number], scale: [number, number, number], roughness = 0.72) => {
      const mesh = new THREE.Mesh(geometry, makeMaterial(color, roughness));
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const createEnemyMesh = (enemy: GameState['enemies'][number]) => {
      const group = new THREE.Group();
      const color = enemy.color;
      const dark = enemy.enemyType === 'skeleton' ? 0x6f6a58 : enemy.enemyType === 'spider' ? 0x16121f : 0x2d351f;

      if (enemy.enemyType === 'slime') {
        addMesh(group, new THREE.SphereGeometry(0.42, 8, 6), color, [0, 0.34, 0], [1.2, 0.62, 1.08], 0.5);
        addMesh(group, new THREE.SphereGeometry(0.08, 6, 4), 0xdffff0, [-0.14, 0.42, -0.34], [1, 1, 1], 0.35);
        addMesh(group, new THREE.SphereGeometry(0.08, 6, 4), 0xdffff0, [0.14, 0.42, -0.34], [1, 1, 1], 0.35);
      } else if (enemy.enemyType === 'goblin') {
        addMesh(group, new THREE.CapsuleGeometry(0.26, 0.38, 3, 6), color, [0, 0.56, 0], [0.9, 1, 0.72], 0.72);
        addMesh(group, new THREE.ConeGeometry(0.16, 0.45, 4), color, [-0.28, 0.8, 0], [0.75, 1, 0.75], 0.75).rotation.z = 0.85;
        addMesh(group, new THREE.ConeGeometry(0.16, 0.45, 4), color, [0.28, 0.8, 0], [0.75, 1, 0.75], 0.75).rotation.z = -0.85;
      } else if (enemy.enemyType === 'skeleton') {
        addMesh(group, new THREE.BoxGeometry(0.46, 0.58, 0.28), color, [0, 0.54, 0], [1, 1, 1], 0.86);
        addMesh(group, new THREE.DodecahedronGeometry(0.24, 0), color, [0, 0.98, 0], [1, 0.9, 0.92], 0.86);
        addMesh(group, new THREE.CylinderGeometry(0.035, 0.035, 0.58, 5), dark, [-0.22, 0.3, 0], [1, 1, 1], 0.78);
        addMesh(group, new THREE.CylinderGeometry(0.035, 0.035, 0.58, 5), dark, [0.22, 0.3, 0], [1, 1, 1], 0.78);
      } else if (enemy.enemyType === 'spider') {
        addMesh(group, new THREE.SphereGeometry(0.34, 8, 6), color, [0, 0.28, 0], [1.2, 0.55, 0.85], 0.64);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            const leg = addMesh(group, new THREE.CylinderGeometry(0.025, 0.025, 0.58, 5), dark, [side * (0.26 + i * 0.06), 0.24, -0.27 + i * 0.18], [1, 1, 1], 0.7);
            leg.rotation.z = side * 1.1;
            leg.rotation.x = 0.35 - i * 0.16;
          }
        }
      } else if (enemy.enemyType === 'orc') {
        addMesh(group, new THREE.CapsuleGeometry(0.34, 0.58, 4, 7), color, [0, 0.7, 0], [1.05, 1.15, 0.9], 0.78);
        addMesh(group, new THREE.BoxGeometry(0.62, 0.28, 0.18), dark, [0, 0.78, -0.16], [1, 1, 1], 0.82);
        addMesh(group, new THREE.CylinderGeometry(0.05, 0.05, 0.78, 5), 0x3b2b22, [0.42, 0.55, 0], [1, 1, 1], 0.82).rotation.z = 0.45;
      } else if (enemy.enemyType === 'vampire') {
        addMesh(group, new THREE.ConeGeometry(0.42, 0.9, 5), color, [0, 0.7, 0], [0.78, 1.08, 0.72], 0.74);
        addMesh(group, new THREE.DodecahedronGeometry(0.22, 0), 0xe8d2c1, [0, 1.16, 0], [1, 0.92, 1], 0.72);
        addMesh(group, new THREE.ConeGeometry(0.4, 0.56, 3), 0x321129, [0, 0.78, 0.1], [1.1, 1, 0.75], 0.8).rotation.y = Math.PI;
      } else if (enemy.enemyType === 'demon' || enemy.enemyType === 'boss') {
        const boss = enemy.enemyType === 'boss';
        addMesh(group, new THREE.CapsuleGeometry(boss ? 0.52 : 0.38, boss ? 0.9 : 0.62, 4, 7), color, [0, boss ? 1.02 : 0.78, 0], [1.05, 1.08, 0.92], 0.68);
        addMesh(group, new THREE.ConeGeometry(boss ? 0.22 : 0.16, boss ? 0.65 : 0.48, 5), 0x1f1520, [-0.3, boss ? 1.65 : 1.26, 0], [0.75, 1, 0.75], 0.75).rotation.z = 0.6;
        addMesh(group, new THREE.ConeGeometry(boss ? 0.22 : 0.16, boss ? 0.65 : 0.48, 5), 0x1f1520, [0.3, boss ? 1.65 : 1.26, 0], [0.75, 1, 0.75], 0.75).rotation.z = -0.6;
        addMesh(group, new THREE.SphereGeometry(boss ? 0.1 : 0.07, 6, 4), 0xfff0b0, [-0.14, boss ? 1.23 : 0.93, -0.36], [1, 1, 1], 0.38);
        addMesh(group, new THREE.SphereGeometry(boss ? 0.1 : 0.07, 6, 4), 0xfff0b0, [0.14, boss ? 1.23 : 0.93, -0.36], [1, 1, 1], 0.38);
      } else {
        addMesh(group, new THREE.DodecahedronGeometry(0.5, 0), color, [0, 0.55, 0], [1, 1, 1], 0.82);
        addMesh(group, new THREE.BoxGeometry(0.66, 0.22, 0.66), 0x4d4d60, [0, 0.28, 0], [1, 1, 1], 0.86);
      }

      scene.add(group);
      enemyMeshes.set(enemy.id, group);
      return group;
    };

    const syncEnemies = (state: GameState) => {
      const aliveIds = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, mesh] of enemyMeshes) {
        if (!aliveIds.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          enemyMeshes.delete(id);
        }
      }

      const now = Date.now();
      for (const enemy of state.enemies) {
        const mesh = enemyMeshes.get(enemy.id) ?? createEnemyMesh(enemy);
        const x = enemy.x / 40 - 8.5;
        const z = enemy.y / 40 - 11.5;
        const pulse = Math.sin((now - enemy.spawnTime) / 180) * 0.025;
        mesh.position.set(x, 0, z);
        mesh.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        mesh.scale.setScalar((enemy.flashUntil > now ? 1.14 : 1) + pulse);
      }
    };

    const createArrow = (effect: any) => {
      const group = new THREE.Group();
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5),
        new THREE.MeshStandardMaterial({ color: effect.color, emissive: effect.color, emissiveIntensity: 0.75, transparent: true, opacity: 0.55 }),
      );
      trail.rotation.z = Math.PI / 2;
      trail.position.x = -0.28;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.78, 6),
        new THREE.MeshStandardMaterial({ color: effect.color, emissive: effect.color, emissiveIntensity: 0.7 }),
      );
      shaft.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: effect.color, emissive: effect.color, emissiveIntensity: 0.85 }),
      );
      head.rotation.z = -Math.PI / 2;
      head.position.x = 0.48;
      group.add(trail, shaft, head);
      scene.add(group);
      arrowMeshes.set(effect.id, group);
      return group;
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const activeIds = new Set(shots.map(effect => effect.id));
      for (const [id, group] of arrowMeshes) {
        if (!activeIds.has(id)) {
          scene.remove(group);
          disposeObject(group);
          arrowMeshes.delete(id);
        }
      }

      for (const effect of shots) {
        const arrow = arrowMeshes.get(effect.id) ?? createArrow(effect);
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const startX = effect.x / 40 - 8.5;
        const startZ = effect.y / 40 - 11.5;
        const travel = effect.maxRadius / 40;
        const angle = effect.angle ?? 0;
        arrow.position.set(startX + Math.cos(angle) * travel * progress, 0.82, startZ + Math.sin(angle) * travel * progress);
        arrow.rotation.y = -angle;
        arrow.scale.setScalar(1 + (1 - progress) * 0.18);
      }
    };

    const createItemMesh = (item: GameState['items'][number]) => {
      const group = new THREE.Group();
      if (item.itemType === 'xp_orb') {
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x2a9fd8, emissiveIntensity: 1.15, roughness: 0.2 }),
        );
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.22, 0.012, 5, 12),
          new THREE.MeshStandardMaterial({ color: 0x9fe9ff, emissive: 0x5fd0ff, emissiveIntensity: 0.7, roughness: 0.35 }),
        );
        halo.rotation.x = Math.PI / 2;
        group.add(orb, halo);
      } else {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, 0.32, 8),
          new THREE.MeshStandardMaterial({ color: 0xff5e64, emissive: 0x7c1b20, emissiveIntensity: 0.5, roughness: 0.35 }),
        );
        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8),
          new THREE.MeshStandardMaterial({ color: 0xe8c28f, roughness: 0.8 }),
        );
        const cork = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.07, 0.09),
          new THREE.MeshStandardMaterial({ color: 0x7b4d2b, roughness: 0.9 }),
        );
        neck.position.y = 0.22;
        cork.position.y = 0.31;
        group.add(bottle, neck, cork);
      }
      group.traverse((node: any) => { if (node.isMesh) node.castShadow = true; });
      scene.add(group);
      itemMeshes.set(item.id, group);
      return group;
    };

    const syncItems = (state: GameState, now: number) => {
      const activeIds = new Set(state.items.map(item => item.id));
      for (const [id, group] of itemMeshes) {
        if (!activeIds.has(id)) {
          scene.remove(group);
          disposeObject(group);
          itemMeshes.delete(id);
        }
      }
      for (const item of state.items) {
        const group = itemMeshes.get(item.id) ?? createItemMesh(item);
        const bob = Math.sin((now - item.spawnTime) / 220) * 0.08;
        group.position.set(item.x / 40 - 8.5, 0.34 + bob, item.y / 40 - 11.5);
        group.rotation.y += 0.035;
      }
    };

    const syncPortal = (state: GameState, now: number) => {
      if (!portalMesh) return;
      const isClear = state.enemies.every(enemy => enemy.hp <= 0 || enemy.isDead);
      portalMesh.visible = isClear && state.status === 'playing';
      if (!portalMesh.visible) return;

      let stairX = state.map.startX;
      let stairY = state.map.startY;
      for (let y = 0; y < state.map.tiles.length; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { stairX = x; stairY = y; break; }
      }
      portalMesh.position.set(stairX * TILE_SIZE / 40 - 8.1, 0.06, stairY * TILE_SIZE / 40 - 11.1);
      portalMesh.rotation.y += 0.025;
      portalMesh.scale.setScalar(1 + Math.sin(now / 260) * 0.055);
    };

    const renderLoop = () => {
      if (disposed || !renderer || !scene || !camera || !THREE) return;
      const state = stateRef.current;
      const player = state.player;
      const px = player.x / 40 - 8.5;
      const pz = player.y / 40 - 11.5;

      if (hero) {
        hero.position.set(px, 0, pz);
        if (Math.hypot(player.facing.x, player.facing.y) > 0.1) hero.rotation.y = Math.atan2(player.facing.x, player.facing.y);
        if (player.lastAttackTime > lastAttackTime) {
          lastAttackTime = player.lastAttackTime;
          if (attackAction) {
            attackAction.reset().setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
            attackAction.fadeIn(0.05).play();
            activeAction?.fadeOut(0.05);
            activeAction = attackAction;
          }
        } else if (activeAction === attackAction && !attackAction?.isRunning?.()) {
          fadeTo(player.state === 'moving' ? runAction : idleAction);
        } else if (activeAction !== attackAction) {
          fadeTo(player.state === 'moving' ? runAction : idleAction);
        }
      }

      const now = Date.now();
      syncEnemies(state);
      syncArrows(state);
      syncItems(state, now);
      syncPortal(state, now);
      mixer?.update(Math.min(clock?.getDelta?.() ?? 0.016, 0.05));
      desiredCamera.set(px, 14.5, pz + 12.5);
      camera.position.lerp(desiredCamera, 0.08);
      camera.lookAt(px, 0, pz - 1.7);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule: any = await import(/* @vite-ignore */ GLTF_URL);
      if (disposed) return;

      const GLTFLoader = loaderModule.GLTFLoader;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x162317);
      scene.fog = new THREE.Fog(0x162317, 24, 48);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 15, 13);
      desiredCamera = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x243019, 2.2));
      const sun = new THREE.DirectionalLight(0xfff1d0, 3.2);
      sun.position.set(-8, 16, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -18;
      sun.shadow.camera.right = 18;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -18;
      scene.add(sun);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), new THREE.MeshStandardMaterial({ color: 0x53783c, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      portalMesh = new THREE.Group();
      const portalBase = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.035, 8, 28),
        new THREE.MeshStandardMaterial({ color: 0xd9b8ff, emissive: 0x9c5cff, emissiveIntensity: 1.25, roughness: 0.35 }),
      );
      portalBase.rotation.x = Math.PI / 2;
      const portalGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.7, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0x7c4dff, emissive: 0x7c4dff, emissiveIntensity: 0.9, transparent: true, opacity: 0.6, roughness: 0.4 }),
      );
      portalMesh.add(portalGlow, portalBase);
      portalMesh.visible = false;
      scene.add(portalMesh);

      const loader = new GLTFLoader();
      const load = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ASSET_ROOT}${name}`, resolve, undefined, reject));
      const [heroGltf, animationsGltf, treeGltf, pineGltf, rockGltf, bushGltf] = await Promise.all([
        load('ranger.glb'), load('animations.glb'), load('tree.glb'), load('pine.glb'), load('rock.glb'), load('bush.glb'),
      ]);
      if (disposed) return;

      hero = heroGltf.scene;
      hero.scale.setScalar(1.18);
      hero.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      scene.add(hero);

      mixer = new THREE.AnimationMixer(hero);
      const clips = animationsGltf.animations ?? [];
      const findClip = (terms: string[]) => clips.find((clip: any) => terms.some(term => clip.name.toLowerCase().includes(term)));
      const idleClip = findClip(['idle']);
      const runClip = findClip(['jog', 'run']);
      const attackClip = findClip(['bow', 'archery', 'shoot', 'ranged attack', 'attack']);
      if (idleClip) idleAction = mixer.clipAction(idleClip);
      if (runClip) runAction = mixer.clipAction(runClip);
      if (attackClip) attackAction = mixer.clipAction(attackClip);
      activeAction = idleAction ?? runAction;
      activeAction?.play();

      const prototypes = [treeGltf.scene, pineGltf.scene, rockGltf.scene, bushGltf.scene];
      const placements = [
        [-7.7, -10.2, 0], [-5.8, -10.7, 1], [-3.6, -11, 0], [3.5, -11, 1], [5.8, -10.6, 0], [7.5, -9.8, 1],
        [-7.8, 10.3, 1], [-5.3, 10.7, 0], [-2.6, 11, 1], [2.4, 11, 0], [5.1, 10.7, 1], [7.5, 10.1, 0],
        [-8.2, -5.7, 2], [-8.2, -1.5, 3], [-8.2, 3, 2], [-8.1, 6.7, 3],
        [8.2, -6.5, 3], [8.2, -2.2, 2], [8.2, 2.8, 3], [8.2, 6.8, 2],
      ] as const;
      for (const [x, z, prototypeIndex] of placements) {
        const object = prototypes[prototypeIndex].clone(true);
        object.position.set(x, 0, z);
        object.rotation.y = ((x * 13 + z * 7) % 10) * 0.17;
        object.scale.setScalar(prototypeIndex < 2 ? 1.4 : prototypeIndex === 2 ? 1.2 : 0.9);
        object.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        scene.add(object);
      }

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Dungeon Veil 3D renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      mixer?.stopAllAction?.();
      for (const mesh of enemyMeshes.values()) disposeObject(mesh);
      for (const group of arrowMeshes.values()) disposeObject(group);
      for (const group of itemMeshes.values()) disposeObject(group);
      disposeObject(portalMesh);
      enemyMeshes.clear();
      arrowMeshes.clear();
      itemMeshes.clear();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
