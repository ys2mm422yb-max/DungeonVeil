import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const OBJ_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/OBJLoader.js';
const MTL_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/MTLLoader.js';
const ROOT = '/assets/3d/';
const TILE = 40;
const OX = 8.5;
const OZ = 11.5;
const SLIME_COLORS = [0x43b86b, 0x4fa8ff, 0xb866ff, 0xff9b45, 0xff5d7a, 0xe8d84f];

const wx = (x: number) => x / TILE - OX;
const wz = (y: number) => y / TILE - OZ;

export function GameCanvasCentered3D({ gameState }: { gameState: GameState }) {
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
    let clock: any;
    let cameraGoal: any;
    let hero: any;
    let mixer: any;
    let idleAction: any;
    let runAction: any;
    let activeAction: any;
    let bow: any;
    let bowBasePosition: any;
    let bowBaseRotation: any;
    let arrowProto: any;
    let wallGroup: any;
    let lastMapKey = '';
    let lastAttack = 0;
    let attackPulse = 0;
    let portal: any;

    const enemies = new Map<string, any>();
    const arrows = new Map<string, any>();
    const items = new Map<string, any>();
    const effects = new Map<string, any>();

    const mat = (color: number, roughness = 0.8, emissive = 0, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, emissive, emissiveIntensity });

    const add = (group: any, mesh: any) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((m: any) => m?.dispose?.());
      else node.material?.dispose?.();
    });

    const resize = () => {
      if (!renderer || !camera) return;
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const normalize = (object: any, target: number) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      object.position.sub(center);
      object.scale.setScalar(target / Math.max(size.x, size.y, size.z, 0.0001));
      object.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      return object;
    };

    const attachBow = () => {
      let hand: any = null;
      hero?.traverse?.((node: any) => {
        const name = String(node.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!hand && (name.includes('righthand') || name.includes('handr') || name.endsWith('rhand'))) hand = node;
      });
      (hand ?? hero).add(bow);
      if (hand) {
        bow.position.set(0.015, 0.015, 0.015);
        bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
      } else {
        bow.position.set(0.38, 1.02, 0.04);
        bow.rotation.set(0, 0, Math.PI / 2);
      }
      bowBasePosition = bow.position.clone();
      bowBaseRotation = bow.rotation.clone();
    };

    const slimeVariant = (enemy: GameState['enemies'][number]) => {
      let hash = 0;
      for (let i = 0; i < enemy.id.length; i++) hash = (hash * 31 + enemy.id.charCodeAt(i)) >>> 0;
      return {
        color: SLIME_COLORS[hash % SLIME_COLORS.length],
        size: 0.78 + ((hash >>> 3) % 5) * 0.12,
        squash: 0.52 + ((hash >>> 7) % 4) * 0.06,
      };
    };

    const makeSlime = (enemy: GameState['enemies'][number]) => {
      const { color, size, squash } = slimeVariant(enemy);
      const group = new THREE.Group();
      const body = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8), mat(color, 0.48, color, 0.13)));
      body.scale.set(1.12, squash, 1);
      body.position.y = 0.26;
      body.userData.baseY = 0.26;
      body.userData.baseScaleY = squash;
      const eyeMat = mat(0x140d0a, 0.3);
      for (const x of [-0.13, 0.13]) {
        const eye = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.052, 6, 5), eyeMat));
        eye.position.set(x, 0.32, 0.35);
      }
      group.scale.setScalar(size * (enemy.enemyType === 'boss' ? 1.8 : 1));
      group.userData.body = body;
      group.userData.seed = size * 17.3;
      return group;
    };

    const syncEnemies = (state: GameState, now: number) => {
      const alive = new Set(state.enemies.map(e => e.id));
      for (const [id, mesh] of enemies) {
        if (!alive.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          enemies.delete(id);
        }
      }
      for (const enemy of state.enemies) {
        let mesh = enemies.get(enemy.id);
        if (!mesh) {
          mesh = makeSlime(enemy);
          scene.add(mesh);
          enemies.set(enemy.id, mesh);
        }
        mesh.position.set(wx(enemy.x + enemy.width / 2), 0, wz(enemy.y + enemy.height / 2));
        mesh.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        const body = mesh.userData.body;
        const bob = Math.sin(now * 0.006 + mesh.userData.seed) * 0.045;
        body.position.y = body.userData.baseY + bob;
        body.scale.y = body.userData.baseScaleY * (1 - bob * 1.8);
        const { size } = slimeVariant(enemy);
        mesh.scale.setScalar(size * (enemy.enemyType === 'boss' ? 1.8 : 1) * (enemy.flashUntil > now ? 1.08 : 1));
      }
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(e => e.type === 'beam');
      const active = new Set(shots.map(e => e.id));
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
        const p = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(wx(shot.x) + Math.cos(angle) * travel * p, 0.82, wz(shot.y) + Math.sin(angle) * travel * p);
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
      }
    };

    const makeItem = (type: string) => {
      const group = new THREE.Group();
      if (type === 'xp_orb') {
        const gem = add(group, new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat(0x69d9ff, 0.2, 0x1d8ccb, 1.3)));
        gem.rotation.z = 0.35;
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.012, 5, 14), new THREE.MeshBasicMaterial({ color: 0x8be5ff, transparent: true, opacity: 0.35 }));
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
      } else {
        add(group, new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), mat(0xa52c40, 0.35, 0x5d1322, 0.4)));
        const neck = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 7), mat(0xa52c40, 0.4)));
        neck.position.y = 0.16;
        const cork = add(group, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 7), mat(0x6b4326, 1)));
        cork.position.y = 0.27;
      }
      return group;
    };

    const syncItems = (state: GameState, now: number) => {
      const active = new Set(state.items.map(i => i.id));
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
          mesh = makeItem(item.itemType);
          scene.add(mesh);
          items.set(item.id, mesh);
        }
        mesh.position.set(wx(item.x + item.width / 2), 0.2 + Math.sin((now - item.spawnTime) / 260) * 0.04, wz(item.y + item.height / 2));
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
      const rockMat = mat(0x65594a, 0.98);
      const mossMat = mat(0x526a37, 1);
      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;
          const edge = x < 2 || x >= state.map.width - 2 || y < 2 || y >= state.map.height - 2;
          const seed = (x * 928371 + y * 1237) % 1000;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(edge ? 0.42 : 0.34, 0), rockMat);
          rock.position.set(x + 0.5 - OX, edge ? 0.38 : 0.28, y + 0.5 - OZ);
          rock.scale.set(0.9 + (seed % 5) * 0.05, 0.68 + (seed % 7) * 0.035, 0.82 + (seed % 3) * 0.07);
          rock.rotation.set((seed % 9) * 0.04, (seed % 11) * 0.17, (seed % 5) * 0.05);
          rock.castShadow = true;
          rock.receiveShadow = true;
          wallGroup.add(rock);
          if (seed % 5 === 0) {
            const moss = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 4), mossMat);
            moss.scale.set(1.4, 0.3, 1.1);
            moss.position.set(rock.position.x, rock.position.y + 0.27, rock.position.z);
            wallGroup.add(moss);
          }
        }
      }
      scene.add(wallGroup);
    };

    const syncPortal = (state: GameState, now: number) => {
      const clear = state.enemies.every(e => e.hp <= 0 || e.isDead) && state.status === 'playing';
      if (!clear) {
        if (portal) {
          scene.remove(portal);
          disposeObject(portal);
          portal = null;
        }
        return;
      }
      if (!portal) {
        const g = new THREE.Group();
        const stone = mat(0x40365a, 0.9);
        const left = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.8, 7), stone));
        left.position.set(-0.58, 0.9, 0);
        const right = left.clone();
        right.position.x = 0.58;
        g.add(right);
        const top = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.09, 7, 20, Math.PI), stone));
        top.rotation.z = Math.PI;
        top.position.y = 1.8;
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.45), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.9;
        g.add(veil);
        const rune = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), new THREE.MeshBasicMaterial({ color: 0x9b76ff }));
        rune.rotation.x = Math.PI / 2;
        rune.position.y = 0.035;
        g.add(rune);
        g.userData.veil = veil;
        g.userData.rune = rune;
        portal = g;
        scene.add(g);
      }
      let sx = Math.floor(state.map.width / 2);
      let sy = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { sx = x; sy = y; break; }
      }
      portal.position.set(sx + 0.5 - OX, 0, sy + 0.5 - OZ);
      const t = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(t * 1.7) * 0.06;
      portal.userData.rune.rotation.z = t * 0.3;
    };

    const syncEffects = (state: GameState) => {
      const visible = state.effects.filter(e => e.type === 'pickup' || e.type === 'dash');
      const active = new Set(visible.map(e => e.id));
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
        const p = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        mesh.position.set(wx(effect.x), 0.08 + p * 0.18, wz(effect.y));
        mesh.scale.setScalar(0.7 + p * 1.7);
        mesh.material.opacity = 0.65 * (1 - p);
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
          bow.position.z += attackPulse * 0.045;
          bow.rotation.x += attackPulse * -0.1;
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

      // Keep the player in the visual center of the phone viewport.
      cameraGoal.set(px, 18.2, pz + 14.8);
      camera.position.lerp(cameraGoal, 0.08);
      camera.lookAt(px, 0.35, pz);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(41, 1, 0.1, 120);
      camera.position.set(0, 18.2, 14.8);
      cameraGoal = new THREE.Vector3();

      scene.add(new THREE.HemisphereLight(0xf1f4df, 0x24391f, 2.5));
      const sun = new THREE.DirectionalLight(0xffefd2, 3);
      sun.position.set(-7, 15, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -15;
      sun.shadow.camera.right = 15;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -18;
      scene.add(sun);

      const makeTexture = (base: string, dark: string, light: string, dots: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        let seed = base.length * 1337;
        const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (let i = 0; i < dots; i++) {
          const radius = 1.5 + rand() * 8;
          ctx.fillStyle = rand() > 0.5 ? dark : light;
          ctx.beginPath();
          ctx.arc(rand() * 256, rand() * 256, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };

      const worldTexture = makeTexture('#315739', 'rgba(20,58,31,0.18)', 'rgba(94,133,68,0.1)', 850);
      worldTexture.repeat.set(10, 12);
      const worldFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 72), new THREE.MeshStandardMaterial({ map: worldTexture, roughness: 1 }));
      worldFloor.rotation.x = -Math.PI / 2;
      worldFloor.position.y = -0.06;
      worldFloor.receiveShadow = true;
      scene.add(worldFloor);

      const arenaTexture = makeTexture('#527f3c', 'rgba(39,80,38,0.22)', 'rgba(160,177,82,0.13)', 1500);
      arenaTexture.repeat.set(5.5, 7);
      const arenaFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), new THREE.MeshStandardMaterial({ map: arenaTexture, roughness: 1 }));
      arenaFloor.rotation.x = -Math.PI / 2;
      arenaFloor.position.y = -0.01;
      arenaFloor.receiveShadow = true;
      scene.add(arenaFloor);

      // Visual-only details inside the arena: no collision objects.
      const arenaDetails = new THREE.Group();
      let detailSeed = 92831;
      const randDetail = () => { detailSeed = (detailSeed * 1664525 + 1013904223) >>> 0; return detailSeed / 4294967296; };
      const grassMat = mat(0x5f8d42, 1);
      const darkGrassMat = mat(0x3c6a36, 1);
      const flowerMat = mat(0xd3b95f, 0.9, 0x9f7c2c, 0.08);
      for (let i = 0; i < 86; i++) {
        const x = -7.6 + randDetail() * 15.2;
        const z = -10.4 + randDetail() * 20.8;
        const clump = new THREE.Group();
        const blades = 2 + Math.floor(randDetail() * 3);
        for (let b = 0; b < blades; b++) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22 + randDetail() * 0.12, 4), randDetail() > 0.45 ? grassMat : darkGrassMat);
          blade.position.set((randDetail() - 0.5) * 0.15, 0.1, (randDetail() - 0.5) * 0.15);
          blade.rotation.z = (randDetail() - 0.5) * 0.45;
          clump.add(blade);
        }
        if (i % 17 === 0) {
          const flower = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), flowerMat);
          flower.position.y = 0.16;
          clump.add(flower);
        }
        clump.position.set(x, 0, z);
        arenaDetails.add(clump);
      }
      for (let i = 0; i < 18; i++) {
        const patch = new THREE.Mesh(new THREE.CircleGeometry(0.18 + randDetail() * 0.28, 10), new THREE.MeshBasicMaterial({ color: randDetail() > 0.5 ? 0x456d36 : 0x64854a, transparent: true, opacity: 0.22, depthWrite: false }));
        patch.rotation.x = -Math.PI / 2;
        patch.position.set(-7 + randDetail() * 14, 0.003, -10 + randDetail() * 20);
        arenaDetails.add(patch);
      }
      scene.add(arenaDetails);

      const gltfLoader = new GLTFLoader();
      const loadGltf = (name: string) => new Promise<any>((resolve, reject) => gltfLoader.load(`${ROOT}${name}`, resolve, undefined, reject));
      const [heroGltf, animationsGltf, rockGltf, bushGltf] = await Promise.all([
        loadGltf('ranger.glb'),
        loadGltf('animations.glb'),
        loadGltf('rock.glb'),
        loadGltf('bush.glb'),
      ]);
      if (disposed) return;

      const loadObj = async (name: string) => {
        const materials = await new MTLLoader().loadAsync(`${ROOT}${name}.mtl`);
        materials.preload();
        const loader = new OBJLoader();
        loader.setMaterials(materials);
        return loader.loadAsync(`${ROOT}${name}.obj`);
      };
      const [bowObject, arrowObject] = await Promise.all([loadObj('Bow_Wooden2'), loadObj('Arrow')]);
      if (disposed) return;

      hero = heroGltf.scene;
      hero.scale.setScalar(1.18);
      hero.traverse((node: any) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      bow = normalize(bowObject, 1.25);
      arrowProto = normalize(arrowObject, 0.82);
      attachBow();
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
      const outerWorld = new THREE.Group();
      let decorSeed = 41827;
      const randDecor = () => { decorSeed = (decorSeed * 1664525 + 1013904223) >>> 0; return decorSeed / 4294967296; };
      for (let i = 0; i < 58; i++) {
        const side = i % 4;
        let x = 0;
        let z = 0;
        if (side === 0) { x = -10.4 - randDecor() * 5; z = -13 + randDecor() * 28; }
        else if (side === 1) { x = 10.4 + randDecor() * 5; z = -13 + randDecor() * 28; }
        else if (side === 2) { x = -9 + randDecor() * 18; z = -14.5 - randDecor() * 5; }
        else { x = -9 + randDecor() * 18; z = 14.5 + randDecor() * 5; }
        const useRock = randDecor() > 0.62;
        const object = (useRock ? rockProto : bushProto).clone(true);
        object.position.set(x, 0, z);
        object.rotation.y = randDecor() * Math.PI * 2;
        object.scale.setScalar(useRock ? 0.55 + randDecor() * 0.65 : 0.42 + randDecor() * 0.58);
        object.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        outerWorld.add(object);
      }
      scene.add(outerWorld);

      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('Centered 3D renderer failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mixer?.stopAllAction?.();
      for (const collection of [enemies, arrows, items, effects]) {
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
