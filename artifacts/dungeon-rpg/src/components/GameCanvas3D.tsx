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
    let lastAttackTime = 0;
    const enemyMeshes = new Map<string, any>();
    const arrowMeshes = new Map<string, any>();

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

    const syncEnemies = (state: GameState) => {
      const aliveIds = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, mesh] of enemyMeshes) {
        if (!aliveIds.has(id)) {
          scene.remove(mesh);
          mesh.geometry?.dispose?.();
          mesh.material?.dispose?.();
          enemyMeshes.delete(id);
        }
      }

      const now = Date.now();
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
        mesh.position.set(enemy.x / 40 - 8.5, enemy.enemyType === 'boss' ? 0.82 : 0.48, enemy.y / 40 - 11.5);
        mesh.scale.setScalar(enemy.flashUntil > now ? 1.15 : 1);
      }
    };

    const createArrow = (effect: any) => {
      const group = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6),
        new THREE.MeshStandardMaterial({ color: effect.color, emissive: effect.color, emissiveIntensity: 0.45 }),
      );
      shaft.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.2, 6),
        new THREE.MeshStandardMaterial({ color: effect.color, emissive: effect.color, emissiveIntensity: 0.55 }),
      );
      head.rotation.z = -Math.PI / 2;
      head.position.x = 0.38;
      group.add(shaft, head);
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
          group.traverse((node: any) => {
            node.geometry?.dispose?.();
            node.material?.dispose?.();
          });
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
        arrow.position.set(startX + Math.cos(angle) * travel * progress, 0.72, startZ + Math.sin(angle) * travel * progress);
        arrow.rotation.y = -angle;
      }
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

      syncEnemies(state);
      syncArrows(state);
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
      for (const mesh of enemyMeshes.values()) {
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      }
      for (const group of arrowMeshes.values()) group.traverse((node: any) => { node.geometry?.dispose?.(); node.material?.dispose?.(); });
      enemyMeshes.clear();
      arrowMeshes.clear();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
