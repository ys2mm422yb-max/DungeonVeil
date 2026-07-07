import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';

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
    let renderer: any;
    let scene: any;
    let camera: any;
    let hero: any;
    let mixer: any;
    let idleAction: any;
    let runAction: any;
    let activeAction: any;
    let clock: any;
    const enemyMeshes = new Map<string, any>();
    const natureObjects: any[] = [];

    const boot = async () => {
      const THREE: any = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule: any = await import(/* @vite-ignore */ GLTF_URL);
      if (disposed) return;

      const GLTFLoader = loaderModule.GLTFLoader;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x162317);
      scene.fog = new THREE.Fog(0x162317, 24, 48);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 15, 13);

      const hemi = new THREE.HemisphereLight(0xe6f2ff, 0x243019, 2.2);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff1d0, 3.2);
      sun.position.set(-8, 16, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -18;
      sun.shadow.camera.right = 18;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -18;
      scene.add(sun);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 24),
        new THREE.MeshStandardMaterial({ color: 0x53783c, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const loader = new GLTFLoader();
      const load = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ASSET_ROOT}${name}`, resolve, undefined, reject));

      const [heroGltf, animationsGltf, treeGltf, pineGltf, rockGltf, bushGltf] = await Promise.all([
        load('ranger.glb'),
        load('animations.glb'),
        load('tree.glb'),
        load('pine.glb'),
        load('rock.glb'),
        load('bush.glb'),
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
      if (idleClip) idleAction = mixer.clipAction(idleClip);
      if (runClip) runAction = mixer.clipAction(runClip);
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
        natureObjects.push(object);
        scene.add(object);
      }

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const setAnimation = (moving: boolean) => {
      const next = moving ? runAction : idleAction;
      if (!next || next === activeAction) return;
      next.reset().fadeIn(0.15).play();
      activeAction?.fadeOut(0.15);
      activeAction = next;
    };

    const syncEnemies = (THREE: any, state: GameState) => {
      const aliveIds = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, mesh] of enemyMeshes) {
        if (!aliveIds.has(id)) {
          scene.remove(mesh);
          enemyMeshes.delete(id);
        }
      }
      for (const enemy of state.enemies) {
        let mesh = enemyMeshes.get(enemy.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(enemy.enemyType === 'boss' ? 0.8 : 0.45, 1),
            new THREE.MeshStandardMaterial({ color: enemy.color, roughness: 0.72 }),
          );
          mesh.castShadow = true;
          scene.add(mesh);
          enemyMeshes.set(enemy.id, mesh);
        }
        mesh.position.set((enemy.x / 40) - 9 + 0.5, enemy.enemyType === 'boss' ? 0.82 : 0.48, (enemy.y / 40) - 12 + 0.5);
        mesh.scale.setScalar(enemy.flashUntil > Date.now() ? 1.15 : 1);
      }
    };

    const renderLoop = async () => {
      if (disposed || !renderer || !scene || !camera) return;
      const THREE: any = await import(/* @vite-ignore */ THREE_URL);
      const state = stateRef.current;
      const player = state.player;
      const px = (player.x / 40) - 9 + 0.5;
      const pz = (player.y / 40) - 12 + 0.5;

      if (hero) {
        hero.position.set(px, 0, pz);
        const moving = player.state === 'moving';
        setAnimation(moving);
        const facingLength = Math.hypot(player.facing.x, player.facing.y);
        if (facingLength > 0.1) hero.rotation.y = Math.atan2(player.facing.x, player.facing.y);
      }

      syncEnemies(THREE, state);
      mixer?.update(Math.min(clock?.getDelta?.() ?? 0.016, 0.05));

      const desired = new THREE.Vector3(px, 14.5, pz + 12.5);
      camera.position.lerp(desired, 0.08);
      camera.lookAt(px, 0, pz - 1.7);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Dungeon Veil 3D renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      mixer?.stopAllAction?.();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
      enemyMeshes.clear();
      natureObjects.length = 0;
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
