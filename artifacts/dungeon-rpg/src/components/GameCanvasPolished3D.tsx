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

export function GameCanvasPolished3D({ gameState }: { gameState: GameState }) {
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
    let clock: any;
    let cameraTarget: any;
    let lastAttack = 0;
    let attackPulse = 0;
    let portal: any = null;
    let wallGroup: any = null;
    let lastMapKey = '';
    const enemies = new Map<string, any>();
    const arrows = new Map<string, any>();
    const items = new Map<string, any>();
    const effects = new Map<string, any>();

    const disposeObject = (object: any) => {
      object?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((m: any) => m?.dispose?.());
        else node.material?.dispose?.();
      });
    };

    const material = (color: number, roughness = 0.78, emissive = 0, emissiveIntensity = 0) =>
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

    const createBow = () => {
      const group = new THREE.Group();
      const wood = material(0x6f3d20, 0.72);
      const grip = material(0x2b1d14, 0.9);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.72, 0),
        new THREE.Vector3(-0.16, 0.42, 0),
        new THREE.Vector3(-0.20, 0, 0),
        new THREE.Vector3(-0.16, -0.42, 0),
        new THREE.Vector3(0, -0.72, 0),
      ]);
      const limb = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.035, 5, false), wood);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), grip);
      bowString = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0.72, 0),
          new THREE.Vector3(0.03, 0, 0),
          new THREE.Vector3(0, -0.72, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xe7dcc9 }),
      );
      group.add(limb, handle, bowString);
      group.rotation.set(0, Math.PI / 2, Math.PI / 2);
      group.position.set(0.42, 1.04, 0.08);
      group.scale.setScalar(0.72);
      return group;
    };

    const makeEnemy = (type: string) => {
      const g = new THREE.Group();
      const eyeMat = material(0x130d0a, 0.4);
      const bone = material(0xd8cfb2, 0.86);
      const green = material(0x587a32, 0.84);
      const red = material(0x742f2c, 0.82);
      const purple = material(0x543564, 0.78);
      const stone = material(0x716d62, 1);

      if (type === 'slime') {
        const body = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), material(0x43b86b, 0.55, 0x0b411f, 0.15)));
        body.scale.set(1.12, 0.6, 1);
        body.position.y = 0.25;
        for (const x of [-0.14, 0.14]) {
          const eye = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), eyeMat));
          eye.position.set(x, 0.32, 0.34);
        }
      } else if (type === 'goblin') {
        const torso = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.5, 7), material(0x6d4d2d, 0.95)));
        torso.position.y = 0.4;
        const head = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), green));
        head.position.y = 0.78;
        for (const x of [-0.2, 0.2]) {
          const ear = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 5), green));
          ear.position.set(x, 0.81, 0);
          ear.rotation.z = x < 0 ? 0.8 : -0.8;
        }
        const club = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.62, 6), material(0x4a2e1b, 1)));
        club.position.set(0.3, 0.48, 0);
        club.rotation.z = -0.35;
      } else if (type === 'skeleton') {
        const skull = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), bone));
        skull.position.y = 0.92;
        const spine = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 6), bone));
        spine.position.y = 0.55;
        for (let i = 0; i < 4; i++) {
          const rib = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.018, 0.025, 4, 10, Math.PI), bone));
          rib.rotation.x = Math.PI / 2;
          rib.position.y = 0.7 - i * 0.08;
        }
        for (const x of [-0.16, 0.16]) {
          const leg = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.46, 5), bone));
          leg.position.set(x, 0.24, 0);
        }
      } else if (type === 'spider') {
        const body = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.27, 9, 7), purple));
        body.scale.set(1.15, 0.7, 1.35);
        body.position.y = 0.25;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const leg = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 5), material(0x2c1f35, 0.95)));
          leg.position.set(Math.cos(a) * 0.28, 0.14, Math.sin(a) * 0.28);
          leg.rotation.z = Math.cos(a) * 1.05;
          leg.rotation.x = Math.sin(a) * 1.05;
        }
      } else if (type === 'orc') {
        const torso = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.4), green));
        torso.position.y = 0.62;
        const head = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), green));
        head.position.y = 1.08;
        const belt = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.43), material(0x2f241b, 1)));
        belt.position.y = 0.42;
        for (const x of [-0.42, 0.42]) {
          const arm = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.56, 6), green));
          arm.position.set(x, 0.62, 0);
        }
      } else if (type === 'vampire') {
        const robe = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.05, 8), purple));
        robe.position.y = 0.52;
        const head = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), material(0xd9c9c5, 0.75)));
        head.position.y = 1.1;
        const cape = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.07), red));
        cape.position.set(0, 0.7, -0.2);
      } else {
        const torso = add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(type === 'boss' ? 0.58 : 0.42, 0), stone));
        torso.position.y = type === 'boss' ? 0.78 : 0.46;
        const core = add(g, new THREE.Mesh(new THREE.OctahedronGeometry(type === 'boss' ? 0.24 : 0.14, 0), material(0xff8b50, 0.3, 0xff4d20, 1.2)));
        core.position.set(0, torso.position.y, 0.35);
      }
      return g;
    };

    const syncEnemies = (state: GameState) => {
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
          mesh = makeEnemy(enemy.enemyType);
          scene.add(mesh);
          enemies.set(enemy.id, mesh);
        }
        mesh.position.set(wx(enemy.x + enemy.width / 2), 0, wz(enemy.y + enemy.height / 2));
        mesh.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        const hitScale = enemy.flashUntil > Date.now() ? 1.14 : 1;
        mesh.scale.setScalar((enemy.enemyType === 'boss' ? 1.45 : 1) * hitScale);
      }
    };

    const makeArrow = (color: number) => {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), material(0x7b4b27, 0.8));
      shaft.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 6), material(color, 0.3, color, 0.9));
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.55;
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.02), material(0xe8d8bb, 0.7));
      feather.position.x = -0.42;
      g.add(shaft, tip, feather);
      return g;
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
      for (const effect of shots) {
        let arrow = arrows.get(effect.id);
        if (!arrow) {
          arrow = makeArrow(typeof effect.color === 'string' ? parseInt(effect.color.replace('#', ''), 16) : 0xffcc55);
          scene.add(arrow);
          arrows.set(effect.id, arrow);
        }
        const p = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const a = effect.angle ?? 0;
        const travel = effect.maxRadius / TILE_WORLD;
        arrow.position.set(wx(effect.x) + Math.cos(a) * travel * p, 0.82, wz(effect.y) + Math.sin(a) * travel * p);
        arrow.rotation.y = -a;
      }
    };

    const makeItem = (type: string) => {
      const g = new THREE.Group();
      if (type === 'xp_orb') {
        const gem = add(g, new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), material(0x69d9ff, 0.25, 0x1d8ccb, 1.4)));
        gem.rotation.z = 0.35;
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 5, 14), new THREE.MeshBasicMaterial({ color: 0x8be5ff, transparent: true, opacity: 0.45 }));
        halo.rotation.x = Math.PI / 2;
        g.add(halo);
      } else {
        const glass = new THREE.MeshStandardMaterial({ color: 0x9a2437, emissive: 0x54121f, emissiveIntensity: 0.35, roughness: 0.3, transparent: true, opacity: 0.92 });
        add(g, new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), glass));
        const neck = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 7), material(0x9a2437, 0.35)));
        neck.position.y = 0.18;
        const cork = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 7), material(0x6b4326, 1)));
        cork.position.y = 0.3;
      }
      return g;
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
        mesh.position.set(wx(item.x + item.width / 2), 0.24 + Math.sin((now - item.spawnTime) / 260) * 0.045, wz(item.y + item.height / 2));
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
      const wallMat = material(0x675b49, 0.98);
      const mossMat = material(0x526a37, 1);
      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (state.map.tiles[y][x] !== TileType.WALL) continue;
          const edge = x < 2 || x >= state.map.width - 2 || y < 2 || y >= state.map.height - 2;
          const seed = (x * 928371 + y * 1237) % 1000;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(edge ? 0.48 : 0.38, 0), wallMat);
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
        const glow = material(0x8f65ff, 0.25, 0x6331ff, 1.6);
        const left = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.8, 7), material(0x40365a, 0.9)));
        left.position.set(-0.58, 0.9, 0);
        const right = left.clone();
        right.position.x = 0.58;
        g.add(right);
        const top = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.09, 7, 20, Math.PI), material(0x40365a, 0.9)));
        top.rotation.z = Math.PI;
        top.position.y = 1.8;
        const veil = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.45), new THREE.MeshBasicMaterial({ color: 0x8f65ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.9;
        g.add(veil);
        const rune = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 28), glow));
        rune.rotation.x = Math.PI / 2;
        rune.position.y = 0.035;
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
      portal.position.set(sx + 0.5 - OFFSET_X, 0, sy + 0.5 - OFFSET_Z);
      const t = now * 0.002;
      portal.userData.veil.material.opacity = 0.22 + Math.sin(t * 1.7) * 0.06;
      portal.userData.rune.rotation.z = t * 0.3;
    };

    const syncBurstEffects = (state: GameState) => {
      const pickups = state.effects.filter(e => e.type === 'pickup' || e.type === 'dash');
      const active = new Set(pickups.map(e => e.id));
      for (const [id, mesh] of effects) {
        if (!active.has(id)) {
          scene.remove(mesh);
          disposeObject(mesh);
          effects.delete(id);
        }
      }
      for (const effect of pickups) {
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
        if (bow) {
          bow.position.z = 0.08 + attackPulse * 0.11;
          bow.rotation.x = attackPulse * -0.18;
          bow.scale.setScalar(0.72 + attackPulse * 0.05);
        }
        if (bowString) {
          const points = [
            new THREE.Vector3(0, 0.72, 0),
            new THREE.Vector3(0.03 - attackPulse * 0.12, 0, attackPulse * 0.08),
            new THREE.Vector3(0, -0.72, 0),
          ];
          bowString.geometry.setFromPoints(points);
        }
        const next = player.state === 'moving' ? runAction : idleAction;
        if (next && next !== activeAction) {
          next.reset().fadeIn(0.12).play();
          activeAction?.fadeOut(0.12);
          activeAction = next;
        }
      }

      syncEnemies(state);
      syncArrows(state);
      syncItems(state, now);
      syncWalls(state);
      syncPortal(state, now);
      syncBurstEffects(state);
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
        const r = 2 + rand() * 9;
        ctx.fillStyle = rand() > 0.5 ? 'rgba(44,82,39,0.16)' : 'rgba(137,158,72,0.11)';
        ctx.beginPath();
        ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const floorTex = new THREE.CanvasTexture(floorCanvas);
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.repeat.set(4.5, 6);
      floorTex.colorSpace = THREE.SRGBColorSpace;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 1 }));
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
      bow = createBow();
      hero.add(bow);
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
    boot().catch(error => console.error('Polished 3D renderer failed', error));

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
