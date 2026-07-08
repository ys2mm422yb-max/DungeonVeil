import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ASSET_ROOT = '/assets/3d/';
const TILE_WORLD = 40;
const OFFSET_X = 8.5;
const OFFSET_Z = 11.5;

const wx = (px: number) => px / TILE_WORLD - OFFSET_X;
const wz = (py: number) => py / TILE_WORLD - OFFSET_Z;

const SLIME_COLORS = [0x43b86b, 0x4fa8ff, 0xb866ff, 0xff9b45, 0xff5d7a, 0xe8d84f];

export function GameCanvasSlime3D({ gameState }: { gameState: GameState }) {
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
    let hero: any;
    let mixer: any;
    let idleAction: any;
    let runAction: any;
    let activeAction: any;
    let bow: any;
    let bowString: any;
    let bowAnchor: any;
    let bowBasePosition: any;
    let bowBaseRotation: any;
    let clock: any;
    let cameraTarget: any;
    let portal: any = null;
    let wallGroup: any = null;
    let lastMapKey = '';
    let lastAttack = 0;
    let attackPulse = 0;
    const enemyMeshes = new Map<string, any>();
    const arrowMeshes = new Map<string, any>();
    const itemMeshes = new Map<string, any>();
    const fxMeshes = new Map<string, any>();

    const disposeObject = (object: any) => {
      object?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((m: any) => m?.dispose?.());
        else node.material?.dispose?.();
      });
    };

    const mat = (color: number, roughness = 0.78, emissive = 0, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03, emissive, emissiveIntensity });

    const add = (group: any, mesh: any) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const makeBow = () => {
      const group = new THREE.Group();
      const wood = mat(0x754321, 0.7);
      const grip = mat(0x2a1a11, 0.92);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.72, 0),
        new THREE.Vector3(-0.18, 0.42, 0),
        new THREE.Vector3(-0.22, 0, 0),
        new THREE.Vector3(-0.18, -0.42, 0),
        new THREE.Vector3(0, -0.72, 0),
      ]);
      const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.035, 5, false), wood);
      const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), grip);
      bowString = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0.72, 0),
          new THREE.Vector3(0.02, 0, 0),
          new THREE.Vector3(0, -0.72, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xf1eadf }),
      );
      group.add(limb, gripMesh, bowString);
      return group;
    };

    const attachBowToHand = () => {
      if (!hero || !bow) return;
      let rightHand: any = null;
      hero.traverse((node: any) => {
        const name = String(node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!rightHand && (name.includes('righthand') || name.includes('handr') || name.endsWith('rhand'))) rightHand = node;
      });
      bowAnchor = rightHand ?? hero;
      bowAnchor.add(bow);
      if (rightHand) {
        bow.position.set(0.03, 0.02, 0.02);
        bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
        bow.scale.setScalar(0.7);
      } else {
        bow.position.set(0.42, 1.04, 0.08);
        bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
        bow.scale.setScalar(0.72);
      }
      bowBasePosition = bow.position.clone();
      bowBaseRotation = bow.rotation.clone();
    };

    const slimeVariant = (enemy: GameState['enemies'][number]) => {
      let hash = 0;
      for (let i = 0; i < enemy.id.length; i++) hash = (hash * 31 + enemy.id.charCodeAt(i)) >>> 0;
      const color = SLIME_COLORS[hash % SLIME_COLORS.length];
      const size = 0.78 + ((hash >>> 3) % 5) * 0.12;
      const squash = 0.52 + ((hash >>> 7) % 4) * 0.06;
      return { color, size, squash };
    };

    const makeSlime = (enemy: GameState['enemies'][number]) => {
      const { color, size, squash } = slimeVariant(enemy);
      const group = new THREE.Group();
      const body = add(group, new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 12, 8),
        mat(color, 0.5, color, 0.12),
      ));
      body.scale.set(1.1, squash, 1);
      body.position.y = 0.26;
      body.userData.baseY = body.position.y;
      body.userData.baseScaleY = squash;
      const eyeMat = mat(0x130d0a, 0.35);
      for (const x of [-0.13, 0.13]) {
        const eye = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 5), eyeMat));
        eye.position.set(x, 0.32, 0.35);
      }
      const mouth = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.012, 4, 8, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0x25161a }),
      );
      mouth.position.set(0, 0.22, 0.38);
      mouth.rotation.z = Math.PI;
      group.add(mouth);
      group.scale.setScalar(size * (enemy.enemyType === 'boss' ? 1.75 : 1));
      group.userData.body = body;
      group.userData.seed = size * 13.7;
      return group;
    };

    const syncEnemies = (state: GameState, now: number) => {
      const alive = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, mesh] of enemyMeshes) {
        if (!alive.has(id)) {
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
        mesh.position.set(wx(enemy.x + enemy.width / 2), 0, wz(enemy.y + enemy.height / 2));
        mesh.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        const body = mesh.userData.body;
        if (body) {
          const bob = Math.sin(now * 0.006 + mesh.userData.seed) * 0.045;
          body.position.y = body.userData.baseY + bob;
          body.scale.y = body.userData.baseScaleY * (1 - bob * 1.8);
        }
        mesh.scale.multiplyScalar(enemy.flashUntil > now ? 1.06 : 1);
        if (enemy.flashUntil <= now && mesh.userData.lastFlash) {
          const { size } = slimeVariant(enemy);
          mesh.scale.setScalar(size * (enemy.enemyType === 'boss' ? 1.75 : 1));
          mesh.userData.lastFlash = false;
        } else if (enemy.flashUntil > now) {
          mesh.userData.lastFlash = true;
        }
      }
    };

    const makeArrow = (color: number) => {
      const group = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), mat(0x7a4825, 0.8));
      shaft.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 6), mat(color, 0.3, color, 0.9));
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.55;
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.02), mat(0xeee0c6, 0.75));
      feather.position.x = -0.42;
      group.add(shaft, tip, feather);
      return group;
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const active = new Set(shots.map(effect => effect.id));
      for (const [id, mesh] of arrowMeshes) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          arrowMeshes.delete(id);
        }
      }
      for (const effect of shots) {
        let arrow = arrowMeshes.get(effect.id);
        if (!arrow) {
          const color = typeof effect.color === 'string' ? parseInt(effect.color.replace('#', ''), 16) : 0xffcc55;
          arrow = makeArrow(color);
          scene.add(arrow);
          arrowMeshes.set(effect.id, arrow);
        }
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const angle = effect.angle ?? 0;
        const travel = effect.maxRadius / TILE_WORLD;
        arrow.position.set(wx(effect.x) + Math.cos(angle) * travel * progress, 0.82, wz(effect.y) + Math.sin(angle) * travel * progress);
        arrow.rotation.y = -angle;
      }
    };

    const makeItem = (type: string) => {
      const group = new THREE.Group();
      if (type === 'xp_orb') {
        const gem = add(group, new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat(0x69d9ff, 0.25, 0x1d8ccb, 1.4)));
        gem.rotation.z = 0.35;
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 5, 14), new THREE.MeshBasicMaterial({ color: 0x8be5ff, transparent: true, opacity: 0.4 }));
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
      } else {
        add(group, new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), mat(0x9a2437, 0.35, 0x54121f, 0.35)));
        const neck = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 7), mat(0x9a2437, 0.35)));
        neck.position.y = 0.18;
        const cork = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 7), mat(0x6b4326, 1)));
        cork.position.y = 0.3;
      }
      return group;
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
        mesh.position.set(wx(item.x + item.width / 2), 0.22 + Math.sin((now - item.spawnTime) / 260) * 0.04, wz(item.y + item.height / 2));
        mesh.rotation.y += 0.025;
      }
    };

    const syncWalls = (state: GameState) => {
      const key = `${state.map.width}x${state.map.height}|${state.map.tiles.map(row => row.join('')).join('')}`;
      if (key === lastMapKey) return;
      lastMapKey = key;
      if (wallGroup) {
        scene.remove(wallGroup);
        disposeObject(wallGroup);
      }
      wallGroup = new THREE.Group();
      const rockMat = mat(0x675b49, 0.98);
      const mossMat = mat(0x526a37, 1);
      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;
          const edge = x < 2 || x >= state.map.width - 2 || y < 2 || y >= state.map.height - 2;
          const seed = (x * 928371 + y * 1237) % 1000;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(edge ? 0.48 : 0.38, 0), rockMat);
          rock.position.set(x + 0.5 - OFFSET_X, edge ? 0.45 : 0.32, y + 0.5 - OFFSET_Z);
          rock.scale.set(1.05 + (seed % 5) * 0.04, 0.8 + (seed % 7) * 0.035, 0.9 + (seed % 3) * 0.06);
          rock.rotation.set((seed % 9) * 0.035, (seed % 11) * 0.17, (seed % 5) * 0.04);
          rock.castShadow = true;
          rock.receiveShadow = true;
          wallGroup.add(rock);
          if (seed % 4 === 0) {
            const moss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), mossMat);
            moss.scale.set(1.5, 0.35, 1.1);
            moss.position.set(rock.position.x, rock.position.y + 0.31, rock.position.z);
            wallGroup.add(moss);
          }
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
        const stone = mat(0x40365a, 0.9);
        const glow = mat(0x8f65ff, 0.25, 0x6331ff, 1.6);
        const left = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.8, 7), stone));
        left.position.set(-0.58, 0.9, 0);
        const right = left.clone();
        right.position.x = 0.58;
        group.add(right);
        const top = add(group, new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.09, 7, 20, Math.PI), stone));
        top.rotation.z = Math.PI;
        top.position.y = 1.8;
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.45), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.9;
        group.add(veil);
        const rune = add(group, new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), glow));
        rune.rotation.x = Math.PI / 2;
        rune.position.y = 0.035;
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
      portal.position.set(sx + 0.5 - OFFSET_X, 0, sy + 0.5 - OFFSET_Z);
      const t = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(t * 1.7) * 0.06;
      portal.userData.rune.rotation.z = t * 0.3;
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
          mesh = new THREE.Mesh(
            new THREE.TorusGeometry(effect.type === 'dash' ? 0.35 : 0.18, 0.025, 5, 18),
            new THREE.MeshBasicMaterial({ color: effect.type === 'dash' ? 0x8fd8ff : 0x8be5ff, transparent: true, opacity: 0.65 }),
          );
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
      const dt = Math.min(clock.getDelta(), 0.05);
      const player = state.player;
      const px = wx(player.x);
      const pz = wz(player.y);

      if (hero) {
        hero.position.set(px, 0, pz);
        if (Math.hypot(player.facing.x, player.facing.y) > 0.1) hero.rotation.y = Math.atan2(player.facing.x, player.facing.y);
        if (player.lastAttackTime > lastAttack) {
          lastAttack = player.lastAttackTime;
          attackPulse = 1;
        }
        attackPulse = Math.max(0, attackPulse - dt * 5.5);
        if (bow && bowBasePosition && bowBaseRotation) {
          bow.position.copy(bowBasePosition);
          bow.rotation.copy(bowBaseRotation);
          bow.position.z += attackPulse * 0.08;
          bow.rotation.x += attackPulse * -0.2;
        }
        if (bowString) {
          bowString.geometry.setFromPoints([
            new THREE.Vector3(0, 0.72, 0),
            new THREE.Vector3(0.02 - attackPulse * 0.12, 0, attackPulse * 0.08),
            new THREE.Vector3(0, -0.72, 0),
          ]);
        }
        const next = player.state === 'moving' ? runAction : idleAction;
        if (next && next !== activeAction) {
          next.reset().fadeIn(0.12).play();
          activeAction?.fadeOut(0.12);
          activeAction = next;
        }
      }

      syncEnemies(state, now);
      syncArrows(state);
      syncItems(state, now);
      syncWalls(state);
      syncPortal(state, now);
      syncEffects(state);
      mixer?.update(dt);
      cameraTarget.set(px, 14.2, pz + 12.3);
      camera.position.lerp(cameraTarget, 0.075);
      camera.lookAt(px, 0.3, pz - 1.7);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const loaderModule: any = await import(/* @vite-ignore */ GLTF_URL);
      if (disposed) return;
      const GLTFLoader = loaderModule.GLTFLoader;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x182318);
      scene.fog = new THREE.Fog(0x182318, 24, 44);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(39, 1, 0.1, 90);
      camera.position.set(0, 14.2, 12.3);
      cameraTarget = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xe9f2dc, 0x21331d, 2.4));
      const sun = new THREE.DirectionalLight(0xffefd0, 3.1);
      sun.position.set(-7, 15, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -12;
      sun.shadow.camera.right = 12;
      sun.shadow.camera.top = 15;
      sun.shadow.camera.bottom = -15;
      scene.add(sun);

      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = 256;
      floorCanvas.height = 256;
      const ctx = floorCanvas.getContext('2d')!;
      ctx.fillStyle = '#4f773a';
      ctx.fillRect(0, 0, 256, 256);
      let seed = 1337;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 850; i++) {
        const radius = 2 + rand() * 9;
        ctx.fillStyle = rand() > 0.5 ? 'rgba(44,82,39,0.16)' : 'rgba(137,158,72,0.11)';
        ctx.beginPath();
        ctx.arc(rand() * 256, rand() * 256, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      const floorTexture = new THREE.CanvasTexture(floorCanvas);
      floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
      floorTexture.repeat.set(4.5, 6);
      floorTexture.colorSpace = THREE.SRGBColorSpace;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const loader = new GLTFLoader();
      const load = (name: string) => new Promise<any>((resolve, reject) => loader.load(`${ASSET_ROOT}${name}`, resolve, undefined, reject));
      const [heroGltf, animationsGltf, rockGltf, bushGltf] = await Promise.all([
        load('ranger.glb'), load('animations.glb'), load('rock.glb'), load('bush.glb'),
      ]);
      if (disposed) return;

      hero = heroGltf.scene;
      hero.scale.setScalar(1.18);
      hero.traverse((node: any) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
      bow = makeBow();
      attachBowToHand();
      scene.add(hero);

      mixer = new THREE.AnimationMixer(hero);
      const clips = animationsGltf.animations ?? [];
      const exact = (name: string) => clips.find((clip: any) => clip.name.toLowerCase() === name.toLowerCase());
      const idleClip = exact('Idle_Loop') ?? clips.find((clip: any) => clip.name.toLowerCase().includes('idle') && !clip.name.toLowerCase().includes('crouch'));
      const runClip = exact('Jog_Fwd_Loop') ?? clips.find((clip: any) => clip.name.toLowerCase().includes('jog'));
      if (idleClip) idleAction = mixer.clipAction(idleClip);
      if (runClip) runAction = mixer.clipAction(runClip);
      activeAction = idleAction ?? runAction;
      activeAction?.play();

      const rockProto = rockGltf.scene;
      const bushProto = bushGltf.scene;
      const decor = new THREE.Group();
      const placements = [
        [-7.7, -9.5, 0], [-6.9, -6.1, 1], [7.5, -8.1, 0], [7.3, -4.6, 1],
        [-7.4, 5.8, 0], [-7.2, 8.4, 1], [7.5, 5.9, 1], [7.2, 8.6, 0],
      ] as const;
      for (const [x, z, kind] of placements) {
        const obj = (kind === 0 ? rockProto : bushProto).clone(true);
        obj.position.set(x, 0, z);
        obj.rotation.y = ((x * 17 + z * 11) % 10) * 0.2;
        obj.scale.setScalar(kind === 0 ? 0.9 : 0.62);
        obj.traverse((node: any) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
        decor.add(obj);
      }
      scene.add(decor);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Slime 3D renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mixer?.stopAllAction?.();
      for (const collection of [enemyMeshes, arrowMeshes, itemMeshes, fxMeshes]) {
        for (const mesh of collection.values()) disposeObject(mesh);
        collection.clear();
      }
      if (portal) disposeObject(portal);
      if (wallGroup) disposeObject(wallGroup);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
