import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { skillRank } from '../game/runSkills';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { buildKayKitDungeonRoom } from './kaykitRoom3D';
import { buildKayKitRoomTheme } from './kaykitRoomThemes3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';
import { createKayKitLootVisual } from './kaykitLoot3D';
import { loadKayKitManifest } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const MAX_PARTICLES = IS_MOBILE ? 64 : 110;

export function GameCanvasKayKit3D({ gameState }: { gameState: GameState }) {
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
    let playerRig: KayKitPlayerRig | null = null;
    let arrowPrototype: any = null;
    let roomRoot: any = null;
    let portal: any = null;
    let playerLight: any = null;
    let playerPulse: any = null;
    let particlePoints: any = null;
    let particlePositions: Float32Array | null = null;
    let particleColors: Float32Array | null = null;
    let lastRoomKey = '';
    let lastAttack = 0;
    let lastDodge = 0;
    let lastGift = 0;
    let lastGuard = 0;

    const enemyVisuals = new Map<string, KayKitEnemyVisual>();
    const enemyLoading = new Set<string>();
    const arrowVisuals = new Map<string, any>();
    const lootVisuals = new Map<string, any>();
    const lootLoading = new Set<string>();
    const circleVisuals = new Map<string, any>();
    const damageVisuals = new Map<string, any>();
    const particleColorCache = new Map<string, [number, number, number]>();

    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const buildRoom = (state: GameState) => {
      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
      if (key === lastRoomKey) return;
      lastRoomKey = key;
      if (roomRoot) {
        scene.remove(roomRoot);
        roomRoot.userData?.room?.userData?.dispose?.();
        roomRoot.userData?.theme?.userData?.dispose?.();
        disposeObject(roomRoot);
      }
      const root = new THREE.Group();
      root.name = `KayKitRunRoom_${state.floor}`;
      const room = buildKayKitDungeonRoom(THREE, state.floor, state.map.width, state.map.height);
      const theme = buildKayKitRoomTheme(THREE, state.floor);
      root.add(room);
      root.add(theme);
      root.userData.room = room;
      root.userData.theme = theme;
      roomRoot = root;
      scene.add(root);
    };

    const syncEnemies = (state: GameState, delta: number, gameNow: number) => {
      const active = new Set(state.enemies.map(enemy => enemy.id));
      for (const [id, visual] of enemyVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual.root);
        visual.mixer?.stopAllAction?.();
        disposeObject(visual.root);
        enemyVisuals.delete(id);
      }

      for (const enemy of state.enemies) {
        let visual = enemyVisuals.get(enemy.id);
        if (!visual && !enemyLoading.has(enemy.id)) {
          enemyLoading.add(enemy.id);
          createKayKitEnemyVisual(THREE, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            console.error('KayKit enemy failed', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));
        if (!enemy.isDead) visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);
      }
    };

    const addElementVisual = (arrow: any, element: string | undefined, color: string) => {
      const isFire = element === 'fire';
      const isIce = element === 'ice';
      const isArcane = element === 'arcane';
      const isPiercing = element === 'piercing';
      if (!isFire && !isIce && !isArcane && !isPiercing) return;

      const positions = isArcane ? [0, -0.18, -0.36] : [0, -0.22, -0.44, -0.68];
      const scales = isPiercing ? [0.09, 0.06, 0.04, 0.025] : [0.11, 0.085, 0.06, 0.04];
      const glows: any[] = [];
      positions.forEach((y, index) => {
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), material);
        const baseScale = scales[index] ?? 0.04;
        glow.position.set(0, y, 0);
        glow.scale.setScalar(baseScale);
        glow.userData.baseScale = baseScale;
        arrow.add(glow);
        glows.push(glow);
      });
      const lightStrength = isFire ? 4.2 : isIce ? 3.6 : isArcane ? 3.2 : 2.5;
      const light = new THREE.PointLight(color, lightStrength, 3.6, 2);
      light.position.set(0, -0.08, 0);
      arrow.add(light);
      arrow.userData.elementGlows = glows;
      arrow.userData.elementLight = light;
      arrow.userData.elementKind = element;
    };

    const syncArrows = (state: GameState, wallNow: number) => {
      const shots = state.effects.filter(effect => effect.type === 'beam' && (effect.id.startsWith('shot-') || effect.id.startsWith('pierce-') || effect.id.startsWith('rico-')));
      const active = new Set(shots.map(effect => effect.id));
      for (const [id, mesh] of arrowVisuals) {
        if (active.has(id)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        arrowVisuals.delete(id);
      }

      for (const shot of shots) {
        let arrow = arrowVisuals.get(shot.id);
        if (!arrow && arrowPrototype) {
          arrow = arrowPrototype.clone(true);
          arrow.scale.setScalar(shot.element === 'piercing' ? 1.26 : 1.14);
          arrow.traverse((node: any) => {
            if (node.isLine && node.material) node.material = node.material.clone();
            if (!node.isMesh && !node.isLine) return;
            node.castShadow = false;
            node.frustumCulled = true;
          });
          addElementVisual(arrow, shot.element, shot.color);
          scene.add(arrow);
          arrowVisuals.set(shot.id, arrow);
        }
        if (!arrow) continue;

        const progress = Math.max(0, Math.min(1, shot.lifeTime / shot.maxLifeTime));
        const angle = shot.angle ?? 0;
        const travel = shot.maxRadius / TILE;
        arrow.position.set(mapX(state, shot.x) + Math.cos(angle) * travel * progress, 0.88, mapZ(state, shot.y) + Math.sin(angle) * travel * progress);
        arrow.rotation.set(Math.PI / 2, -angle - Math.PI / 2, 0);
        arrow.traverse((node: any) => {
          if (!node.isLine || !node.material?.color) return;
          node.material.color.set(shot.color);
          node.material.opacity = Math.max(0.22, 0.92 * (1 - progress * 0.28));
        });
        const pulse = 0.82 + Math.sin(wallNow * 0.025 + progress * 8) * 0.18;
        const glows = arrow.userData.elementGlows as any[] | undefined;
        glows?.forEach((glow, index) => {
          glow.material.opacity = Math.max(0.25, pulse - index * 0.12);
          glow.scale.setScalar((glow.userData.baseScale ?? 0.04) * (0.92 + pulse * 0.12));
        });
        if (arrow.userData.elementLight) arrow.userData.elementLight.intensity = 3.1 + pulse * 1.9;
      }
    };

    const syncCircleEffects = (state: GameState) => {
      const effects = state.effects.filter(effect => effect.type === 'circle');
      const active = new Set(effects.map(effect => effect.id));
      for (const [id, visual] of circleVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual);
        disposeObject(visual);
        circleVisuals.delete(id);
      }

      for (const effect of effects) {
        let visual = circleVisuals.get(effect.id);
        if (!visual) {
          visual = new THREE.Group();
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.72, 1, 32),
            new THREE.MeshBasicMaterial({ color: effect.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
          );
          ring.rotation.x = -Math.PI / 2;
          visual.add(ring);
          if (effect.element === 'fire' || effect.element === 'arcane') {
            const light = new THREE.PointLight(effect.color, effect.element === 'fire' ? 5 : 3.6, 5, 2);
            light.position.y = 0.5;
            visual.add(light);
            visual.userData.light = light;
          }
          visual.userData.ring = ring;
          scene.add(visual);
          circleVisuals.set(effect.id, visual);
        }
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const scale = Math.max(0.05, effect.maxRadius / TILE * progress);
        visual.position.set(mapX(state, effect.x), 0.045, mapZ(state, effect.y));
        visual.scale.setScalar(scale);
        visual.userData.ring.material.opacity = Math.max(0, 0.9 * (1 - progress));
        if (visual.userData.light) visual.userData.light.intensity = (effect.element === 'fire' ? 5 : 3.6) * (1 - progress);
      }
    };

    const ensureParticleLayer = () => {
      if (particlePoints) return;
      particlePositions = new Float32Array(MAX_PARTICLES * 3);
      particleColors = new Float32Array(MAX_PARTICLES * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
      geometry.setDrawRange(0, 0);
      const material = new THREE.PointsMaterial({ size: IS_MOBILE ? 0.075 : 0.09, vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, sizeAttenuation: true });
      particlePoints = new THREE.Points(geometry, material);
      particlePoints.frustumCulled = false;
      scene.add(particlePoints);
    };

    const particleColor = (value: string): [number, number, number] => {
      const cached = particleColorCache.get(value);
      if (cached) return cached;
      const color = new THREE.Color(value);
      const rgb: [number, number, number] = [color.r, color.g, color.b];
      particleColorCache.set(value, rgb);
      return rgb;
    };

    const syncParticles = (state: GameState) => {
      ensureParticleLayer();
      if (!particlePoints || !particlePositions || !particleColors) return;
      const particles = state.particles.slice(-MAX_PARTICLES);
      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        const progress = Math.max(0, Math.min(1, particle.lifeTime / particle.maxLifeTime));
        const offset = index * 3;
        particlePositions[offset] = mapX(state, particle.x);
        particlePositions[offset + 1] = 0.2 + Math.sin(progress * Math.PI) * 0.48 + Math.min(0.12, particle.size * 0.015);
        particlePositions[offset + 2] = mapZ(state, particle.y);
        const [r, g, b] = particleColor(particle.color);
        const fade = 1 - progress * 0.7;
        particleColors[offset] = r * fade;
        particleColors[offset + 1] = g * fade;
        particleColors[offset + 2] = b * fade;
      }
      particlePoints.geometry.setDrawRange(0, particles.length);
      particlePoints.geometry.attributes.position.needsUpdate = true;
      particlePoints.geometry.attributes.color.needsUpdate = true;
    };

    const createDamageSprite = (damage: GameState['damageNumbers'][number]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const scale = Math.max(0.7, damage.scale ?? 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `900 ${Math.round(42 * Math.min(1.35, scale))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(0,0,0,.82)';
      ctx.strokeText(damage.value, 128, 48);
      ctx.fillStyle = damage.color;
      ctx.fillText(damage.value, 128, 48);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1.25 * scale, 0.47 * scale, 1);
      sprite.userData.texture = texture;
      sprite.userData.baseX = mapX(stateRef.current, damage.x);
      sprite.userData.baseZ = mapZ(stateRef.current, damage.y);
      return sprite;
    };

    const syncDamageNumbers = (state: GameState) => {
      const numbers = state.damageNumbers.filter(number => !number.id.startsWith('clear-'));
      const active = new Set(numbers.map(number => number.id));
      for (const [id, sprite] of damageVisuals) {
        if (active.has(id)) continue;
        scene.remove(sprite);
        sprite.userData.texture?.dispose?.();
        sprite.material?.dispose?.();
        damageVisuals.delete(id);
      }

      for (const damage of numbers) {
        let sprite = damageVisuals.get(damage.id);
        if (!sprite) {
          sprite = createDamageSprite(damage);
          if (!sprite) continue;
          scene.add(sprite);
          damageVisuals.set(damage.id, sprite);
        }
        const progress = Math.max(0, Math.min(1, damage.lifeTime / damage.maxLifeTime));
        sprite.position.set(sprite.userData.baseX, 1.25 + progress * 0.7, sprite.userData.baseZ);
        sprite.material.opacity = Math.max(0, 1 - progress);
      }
    };

    const syncLoot = (state: GameState, wallNow: number) => {
      const active = new Set(state.items.map(item => item.id));
      for (const [id, visual] of lootVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual);
        disposeObject(visual);
        lootVisuals.delete(id);
      }
      for (const item of state.items) {
        let visual = lootVisuals.get(item.id);
        if (!visual && !lootLoading.has(item.id)) {
          lootLoading.add(item.id);
          createKayKitLootVisual(item).then(created => {
            lootLoading.delete(item.id);
            if (!created || disposed || !stateRef.current.items.some(current => current.id === item.id)) return;
            lootVisuals.set(item.id, created);
            scene.add(created);
          }).catch(error => {
            lootLoading.delete(item.id);
            console.error('KayKit loot failed', error);
          });
          continue;
        }
        visual = lootVisuals.get(item.id);
        if (!visual) continue;
        visual.position.set(mapX(state, item.x + item.width / 2), 0.18 + Math.sin((wallNow - item.spawnTime) * 0.005) * 0.05, mapZ(state, item.y + item.height / 2));
        visual.rotation.y += 0.028;
      }
    };

    const syncPortal = (state: GameState, gameNow: number, wallNow: number) => {
      const clear = state.roomClearReady && state.status === 'playing';
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
        portal.name = 'RunExitEffect';
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0xb693ff, transparent: true, opacity: 0.95 }));
        ring.rotation.x = Math.PI / 2;
        portal.add(ring);
        const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.25, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8c62ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
        veil.position.y = 0.62;
        portal.add(veil);
        const core = new THREE.PointLight(0x9d76ff, 5.2, 5.5, 2);
        core.position.y = 0.6;
        portal.add(core);
        portal.userData.ring = ring;
        portal.userData.veil = veil;
        portal.userData.core = core;
        scene.add(portal);
      }

      let exitX = Math.floor(state.map.width / 2);
      let exitY = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { exitX = x; exitY = y; break; }
      }
      portal.position.set(exitX + 0.5 - state.map.width / 2, 0.02, exitY + 0.5 - state.map.height / 2);
      const activateProgress = Math.min(1, Math.max(0, (gameNow - state.roomClearAt) / 520));
      portal.scale.setScalar(0.15 + activateProgress * 0.85);
      portal.userData.ring.rotation.z = wallNow * 0.0012;
      portal.userData.veil.material.opacity = (0.16 + Math.sin(wallNow * 0.004) * 0.06) * activateProgress;
      portal.userData.core.intensity = (4.2 + Math.sin(wallNow * 0.006) * 1.5) * activateProgress;
    };

    const ensurePlayerPulse = () => {
      if (playerPulse) return;
      playerPulse = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0x79e6a4, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      playerPulse.add(ring);
      playerPulse.userData.ring = ring;
      scene.add(playerPulse);
    };

    const syncPlayerFeedback = (state: GameState, wallNow: number, gameNow: number) => {
      ensurePlayerPulse();
      const px = mapX(state, state.player.x + 16);
      const pz = mapZ(state, state.player.y + 16);
      playerPulse.position.set(px, 0.06, pz);
      const giftTime = state.player.lastGiftTime ?? 0;
      const guardTime = state.player.lastGuardTime ?? 0;
      if (giftTime > lastGift) lastGift = giftTime;
      if (guardTime > lastGuard) lastGuard = guardTime;
      const giftAge = wallNow - lastGift;
      const guardAge = gameNow - lastGuard;
      const activeGift = giftAge >= 0 && giftAge < 650;
      const activeGuard = guardAge >= 0 && guardAge < 260;
      const ring = playerPulse.userData.ring;
      if (activeGift) {
        const progress = giftAge / 650;
        const key = state.player.lastGiftKey;
        const color = key === 'maxHp' ? 0x71ef9f : key === 'defense' ? 0x72d6a5 : key === 'speed' ? 0xa7efff : 0xd8b6ff;
        ring.material.color.setHex(color);
        ring.material.opacity = 0.75 * (1 - progress);
        ring.scale.setScalar(0.45 + progress * 2.3);
      } else if (activeGuard) {
        const progress = guardAge / 260;
        ring.material.color.setHex(0x72d6a5);
        ring.material.opacity = 0.8 * (1 - progress);
        ring.scale.setScalar(0.75 + progress * 0.5);
      } else ring.material.opacity = 0;
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
      const wallNow = Date.now();
      const gameNow = performance.now();
      const delta = Math.min(clock.getDelta(), 0.05);
      const playerX = mapX(state, state.player.x);
      const playerZ = mapZ(state, state.player.y);

      buildRoom(state);
      if (playerRig) {
        playerRig.root.position.set(playerX, 0, playerZ);
        if (Math.hypot(state.player.facing.x, state.player.facing.y) > 0.1) playerRig.root.rotation.y = Math.atan2(state.player.facing.x, state.player.facing.y);
        playerRig.setMoving(state.player.state === 'moving');
        const moveRank = skillRank(state.runSkills, 'speed');
        const attackRank = skillRank(state.runSkills, 'attackSpeed');
        playerRig.setMotionSpeed([1, 1.12, 1.24, 1.34][moveRank], [1, 1.16, 1.3, 1.42][attackRank]);
        if (state.player.lastAttackTime > lastAttack) { lastAttack = state.player.lastAttackTime; playerRig.triggerAttack(); }
        if (state.player.lastDodgeTime > lastDodge) { lastDodge = state.player.lastDodgeTime; playerRig.triggerDash(); }
        playerRig.update(delta);
      }

      if (playerLight) playerLight.position.set(playerX, 4.2, playerZ + 1.2);
      syncEnemies(state, delta, gameNow);
      syncArrows(state, wallNow);
      syncCircleEffects(state);
      syncParticles(state);
      syncDamageNumbers(state);
      syncLoot(state, wallNow);
      syncPortal(state, gameNow, wallNow);
      syncPlayerFeedback(state, wallNow, gameNow);
      updateRunCamera(camera, cameraGoal, playerX, playerZ);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      await loadKayKitManifest();
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x171512);
      scene.fog = new THREE.Fog(0x171512, 30, 58);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      host.appendChild(renderer.domElement);
      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 150);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();
      scene.add(new THREE.AmbientLight(0xd8d1c5, 0.74));
      scene.add(new THREE.HemisphereLight(0xd9c7aa, 0x171512, 1.05));
      const keyLight = new THREE.DirectionalLight(0xffc98b, 1.85);
      keyLight.position.set(-7, 14, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);
      const fillLight = new THREE.PointLight(0x6f61c8, 2.2, 22, 1.8);
      fillLight.position.set(0, 6.5, -8);
      scene.add(fillLight);
      playerLight = new THREE.PointLight(0xffd29b, 2.5, 13, 1.7);
      scene.add(playerLight);

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(1.08);
      arrowPrototype = playerRig.arrowPrototype;
      scene.add(playerRig.root);
      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    boot().catch(error => console.error('KayKit run renderer failed', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      playerRig?.stop();
      for (const visual of enemyVisuals.values()) { visual.mixer?.stopAllAction?.(); disposeObject(visual.root); }
      for (const mesh of arrowVisuals.values()) disposeObject(mesh);
      for (const mesh of lootVisuals.values()) disposeObject(mesh);
      for (const visual of circleVisuals.values()) disposeObject(visual);
      for (const sprite of damageVisuals.values()) { sprite.userData.texture?.dispose?.(); sprite.material?.dispose?.(); }
      if (particlePoints) disposeObject(particlePoints);
      if (roomRoot) disposeObject(roomRoot);
      if (portal) disposeObject(portal);
      if (playerPulse) disposeObject(playerPulse);
      if (playerRig?.root) disposeObject(playerRig.root);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
