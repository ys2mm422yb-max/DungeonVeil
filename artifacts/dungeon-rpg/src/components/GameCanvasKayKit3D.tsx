import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TileType } from '../game/dungeon';
import { skillRank } from '../game/runSkills';
import { CHAPTER_ROOMS } from '../game/chapterRun';
import { RUN_CAMERA, updateRunCamera } from './RunCameraRig';
import { loadKayKitRanger, type KayKitPlayerRig } from './kaykitPlayer3D';
import { buildKayKitDungeonRoom, preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { buildKayKitRoomTheme, preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { createKayKitEnemyVisual, updateKayKitEnemyVisual, type KayKitEnemyVisual } from './kaykitEnemy3D';
import { createKayKitLootVisual } from './kaykitLoot3D';
import { loadKayKitManifest } from './kaykitManifest3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const TILE = 40;
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const IS_MOBILE = typeof navigator !== 'undefined' && (IS_IOS || IS_ANDROID || navigator.maxTouchPoints > 1);
const MAX_PARTICLES = IS_ANDROID ? 24 : IS_IOS ? 30 : IS_MOBILE ? 32 : 96;
const MAX_ARROW_VISUALS = IS_ANDROID ? 6 : IS_IOS ? 9 : IS_MOBILE ? 10 : 24;
const MAX_CIRCLE_VISUALS = IS_ANDROID ? 8 : IS_IOS ? 10 : IS_MOBILE ? 12 : 28;
const MAX_DAMAGE_VISUALS = IS_ANDROID ? 7 : IS_IOS ? 10 : IS_MOBILE ? 12 : 28;
const PERFORMANCE_KEY = 'dungeon-veil-performance';
const LOW_GPU_KEY = 'dungeon-veil-low-gpu';

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
    let particleBudget = MAX_PARTICLES;
    let lastRoomKey = '';
    let pendingRoomKey = '';
    let preloadRoomKey = '';
    let roomGeneration = 0;
    let lastAttack = 0;
    let lastDodge = 0;
    let lastGift = 0;
    let lastGuard = 0;
    let perfWindowStarted = performance.now();
    let perfFrames = 0;
    let lowFpsWindows = 0;
    let resizeObserver: ResizeObserver | null = null;
    let lastRenderWidth = 0;
    let lastRenderHeight = 0;

    const enemyVisuals = new Map<string, KayKitEnemyVisual>();
    const enemyFallbacks = new Map<string, any>();
    const enemySafetyShells = new Map<string, any>();
    const enemyLoading = new Set<string>();
    const arrowVisuals = new Map<string, any>();
    const lootVisuals = new Map<string, any>();
    const lootLoading = new Set<string>();
    const circleVisuals = new Map<string, any>();
    const damageVisuals = new Map<string, any>();
    const particleColorCache = new Map<string, [number, number, number]>();

    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const applyRoomEnvironment = (activeRoom: any) => {
      const environment = activeRoom?.userData?.theme?.userData?.environment;
      if (!environment || !scene || !renderer || !THREE) return;
      const background = Number(environment.background);
      const fog = Number(environment.fog);
      if (!scene.background?.isColor) scene.background = new THREE.Color(background);
      else scene.background.setHex(background);
      if (!scene.fog?.color) scene.fog = new THREE.Fog(fog, 24, 58);
      else scene.fog.color.setHex(fog);
      renderer.toneMappingExposure = Math.max(IS_MOBILE ? 1.12 : 1.04, Number(environment.exposure) || 1.12);
    };

    const createEnemyFallback = (enemy: GameState['enemies'][number]) => {
      const root = new THREE.Group();
      root.name = `EnemyVisibilityFallback_${enemy.id}`;
      const colors: Record<string, number> = {
        slime: 0x62c978, goblin: 0xb6a45d, skeleton: 0xd9d4c5, orc: 0x8eb16b,
        spider: 0x9b79c7, vampire: 0x9b4f72, demon: 0xd15b44, golem: 0x8d8174, boss: 0xffb454,
      };
      const color = colors[enemy.enemyType] ?? 0xff6b5d;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthTest: true, depthWrite: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.72, 8), material);
      body.position.y = 0.4;
      root.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), material.clone());
      head.position.y = 0.91;
      root.add(head);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.5, 18),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.018;
      root.add(ring);
      // Enemy visibility fallbacks keep the body visible, but the permanent floor
      // rings looked like stale telegraphs and cluttered rooms 13+.
      ring.visible = false;
      root.scale.setScalar(enemy.enemyType === 'boss' ? 1.65 : enemy.isElite ? 1.16 : 1);
      root.userData.visibilityFallback = true;
      root.userData.ring = ring;
      root.userData.body = body;
      root.userData.head = head;
      root.traverse((node: any) => {
        if (node.isMesh) node.frustumCulled = false;
      });
      return root;
    };

    const createEnemySafetyShell = (enemy: GameState['enemies'][number]) => {
      const shell = createEnemyFallback(enemy);
      shell.name = `EnemyVisibilitySafety_${enemy.id}`;
      const scale = enemy.enemyType === 'boss' ? 1.18 : enemy.isElite ? 0.88 : 0.72;
      shell.scale.multiplyScalar(scale);
      for (const part of [shell.userData.body, shell.userData.head]) {
        if (!part?.material) continue;
        part.material.transparent = false;
        part.material.opacity = 1;
        part.material.depthTest = true;
        part.material.depthWrite = true;
        part.renderOrder = -8;
      }
      if (shell.userData.ring?.material) {
        shell.userData.ring.material.opacity = 0.34;
        shell.userData.ring.material.depthTest = false;
        shell.userData.ring.renderOrder = 8;
      }
      shell.userData.visibilitySafety = true;
      return shell;
    };

    const disposeObject = (object: any) => object?.traverse?.((node: any) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
      else node.material?.dispose?.();
    });

    const buildRoom = (state: GameState) => {
      const key = `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
      if (key === lastRoomKey || key === pendingRoomKey) return;
      pendingRoomKey = key;
      const generation = ++roomGeneration;
      window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', { detail: { key, floor: state.floor } }));

      const root = new THREE.Group();
      root.name = `KayKitRunRoom_${state.floor}`;
      const room = buildKayKitDungeonRoom(THREE, state.floor, state.map.width, state.map.height);
      const theme = buildKayKitRoomTheme(THREE, state.floor);
      root.add(room);
      root.add(theme);
      root.userData.room = room;
      root.userData.theme = theme;

      Promise.all([room.userData?.ready ?? Promise.resolve(), theme.userData?.ready ?? Promise.resolve()]).then(() => {
        const live = stateRef.current;
        const liveKey = `${live.chapter}:${live.floor}:${live.map.width}x${live.map.height}`;
        if (disposed || generation !== roomGeneration || liveKey !== key) {
          room.userData?.dispose?.();
          theme.userData?.dispose?.();
          disposeObject(root);
          return;
        }

        const previous = roomRoot;
        roomRoot = root;
        applyRoomEnvironment(root);
        scene.add(root);
        lastRoomKey = key;
        pendingRoomKey = '';

        if (previous) {
          scene.remove(previous);
          previous.userData?.room?.userData?.dispose?.();
          previous.userData?.theme?.userData?.dispose?.();
          disposeObject(previous);
        }

        window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { key, floor: live.floor } }));
      }).catch(error => {
        if (generation === roomGeneration) pendingRoomKey = '';
        console.error('KayKit atomic room build failed', error);
        window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', { detail: { key, floor: state.floor, failed: true } }));
      });
    };

    const preloadNextRoom = (state: GameState) => {
      if (!state.roomClearReady) return;
      const nextFloor = state.floor >= CHAPTER_ROOMS ? 1 : state.floor + 1;
      const nextChapter = state.floor >= CHAPTER_ROOMS ? state.chapter + 1 : state.chapter;
      const key = `${nextChapter}:${nextFloor}`;
      if (key === preloadRoomKey) return;
      preloadRoomKey = key;
      void Promise.all([preloadKayKitDungeonRoom(nextFloor), preloadKayKitRoomTheme(nextFloor)]).catch(error => {
        preloadRoomKey = '';
        console.error('KayKit next room preload failed', error);
      });
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
      for (const [id, fallback] of enemyFallbacks) {
        if (active.has(id)) continue;
        scene.remove(fallback);
        disposeObject(fallback);
        enemyFallbacks.delete(id);
      }
      for (const [id, shell] of enemySafetyShells) {
        if (active.has(id)) continue;
        scene.remove(shell);
        disposeObject(shell);
        enemySafetyShells.delete(id);
      }

      for (const enemy of state.enemies) {
        const nextX = mapX(state, enemy.x + enemy.width / 2);
        const nextZ = mapZ(state, enemy.y + enemy.height / 2);
        const requiresPermanentSafety = state.floor >= 13 && !enemy.isDead;
        let safetyShell = enemySafetyShells.get(enemy.id);
        if (requiresPermanentSafety) {
          if (!safetyShell) {
            safetyShell = createEnemySafetyShell(enemy);
            enemySafetyShells.set(enemy.id, safetyShell);
            scene.add(safetyShell);
          }
          safetyShell.visible = true;
          safetyShell.position.set(nextX, 0.008, nextZ);
          safetyShell.rotation.y = gameNow * 0.00045 + enemy.id.length;
          if (safetyShell.userData.ring?.material) {
            safetyShell.userData.ring.material.opacity = 0.26 + Math.sin(gameNow * 0.006 + enemy.id.length) * 0.08;
          }
        } else if (safetyShell) {
          scene.remove(safetyShell);
          disposeObject(safetyShell);
          enemySafetyShells.delete(enemy.id);
        }
        let visual = enemyVisuals.get(enemy.id);
        if (!visual) {
          let fallback = enemyFallbacks.get(enemy.id);
          if (!fallback) {
            fallback = createEnemyFallback(enemy);
            enemyFallbacks.set(enemy.id, fallback);
            scene.add(fallback);
          }
          fallback.position.set(nextX, 0, nextZ);
          fallback.rotation.y = gameNow * 0.0015 + enemy.id.length;
          if (fallback.userData.ring?.material) {
            fallback.userData.ring.material.opacity = 0.46 + Math.sin(gameNow * 0.008 + enemy.id.length) * 0.16;
          }
        }
        if (!visual && !enemyLoading.has(enemy.id)) {
          enemyLoading.add(enemy.id);
          createKayKitEnemyVisual(THREE, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            const fallback = enemyFallbacks.get(enemy.id);
            if (fallback) {
              scene.remove(fallback);
              disposeObject(fallback);
              enemyFallbacks.delete(enemy.id);
            }
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            // Keep the visible fallback in the scene. A failed model may never
            // turn a living, attacking enemy into an invisible target.
            console.error('KayKit enemy failed; keeping visibility fallback', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        const fallback = enemyFallbacks.get(enemy.id);
        if (fallback) {
          scene.remove(fallback);
          disposeObject(fallback);
          enemyFallbacks.delete(enemy.id);
        }
        const moveX = nextX - visual.root.position.x;
        const moveZ = nextZ - visual.root.position.z;
        visual.root.position.set(nextX, 0, nextZ);
        if (!enemy.isDead) {
          const moving = Math.hypot(moveX, moveZ) > 0.0004;
          const attackFacingX = mapX(state, state.player.x + state.player.width / 2) - nextX;
          const attackFacingZ = mapZ(state, state.player.y + state.player.height / 2) - nextZ;
          const targetAngle = enemy.state === 'attack' || !moving
            ? Math.atan2(attackFacingX, attackFacingZ)
            : Math.atan2(moveX, moveZ);
          const angleDelta = Math.atan2(Math.sin(targetAngle - visual.root.rotation.y), Math.cos(targetAngle - visual.root.rotation.y));
          visual.root.rotation.y += angleDelta * Math.min(1, delta * 12);
        }
        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);
      }
    };

    const addElementVisual = (arrow: any, element: string | undefined, color: string) => {
      const isFire = element === 'fire';
      const isIce = element === 'ice';
      const isArcane = element === 'arcane';
      const isPiercing = element === 'piercing';
      if (!isFire && !isIce && !isArcane && !isPiercing) return;

      const fullPositions = isArcane ? [0, -0.18, -0.36] : [0, -0.22, -0.44, -0.68];
      const positions = IS_MOBILE ? fullPositions.slice(0, 1) : fullPositions;
      const scales = isPiercing ? [0.09, 0.06, 0.04, 0.025] : [0.11, 0.085, 0.06, 0.04];
      const glows: any[] = [];
      positions.forEach((y, index) => {
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1, IS_ANDROID ? 5 : 8, IS_ANDROID ? 5 : 8), material);
        const baseScale = scales[index] ?? 0.04;
        glow.position.set(0, y, 0);
        glow.scale.setScalar(baseScale);
        glow.userData.baseScale = baseScale;
        arrow.add(glow);
        glows.push(glow);
      });
      arrow.userData.elementGlows = glows;
      arrow.userData.elementKind = element;

      if (!IS_MOBILE) {
        const lightStrength = isFire ? 4.2 : isIce ? 3.6 : isArcane ? 3.2 : 2.5;
        const light = new THREE.PointLight(color, lightStrength, 3.6, 2);
        light.position.set(0, -0.08, 0);
        arrow.add(light);
        arrow.userData.elementLight = light;
      }
    };

    const syncArrows = (state: GameState, wallNow: number) => {
      const projectileEffects = state.effects.filter(effect => effect.type === 'beam' && (effect.id.startsWith('shot-') || effect.id.startsWith('pierce-') || effect.id.startsWith('rico-')));
      const mageShots = projectileEffects.filter(effect => effect.id.startsWith('shot-mage-'));
      const normalShots = projectileEffects.filter(effect => !effect.id.startsWith('shot-mage-'));
      const reservedMageSlots = Math.min(3, mageShots.length);
      const shots = [...normalShots.slice(-(MAX_ARROW_VISUALS - reservedMageSlots)), ...mageShots.slice(-reservedMageSlots)];
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
          arrow.scale.setScalar(shot.element === 'piercing' ? 1.32 : 1.2);
          const lineMaterials: any[] = [];
          arrow.traverse((node: any) => {
            if (node.isLine && node.material) {
              node.material = node.material.clone();
              lineMaterials.push(node.material);
            }
            if (!node.isMesh && !node.isLine) return;
            node.castShadow = false;
            node.frustumCulled = true;
          });
          arrow.userData.lineMaterials = lineMaterials;
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
        (arrow.userData.lineMaterials as any[] | undefined)?.forEach(material => {
          material.color?.set?.(shot.color);
          material.opacity = Math.max(0.3, 0.96 * (1 - progress * 0.32));
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
      const effects = state.effects.filter(effect => effect.type === 'circle').slice(-MAX_CIRCLE_VISUALS);
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
            new THREE.RingGeometry(0.72, 1, IS_ANDROID ? 20 : 32),
            new THREE.MeshBasicMaterial({ color: effect.color, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.renderOrder = 12;
          visual.add(ring);
          if (!IS_MOBILE && (effect.element === 'fire' || effect.element === 'arcane')) {
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
        visual.position.set(mapX(state, effect.x), 0.095, mapZ(state, effect.y));
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
      const particles = state.particles.slice(-particleBudget);
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
      const numbers = state.damageNumbers.filter(number => !number.id.startsWith('clear-')).slice(-MAX_DAMAGE_VISUALS);
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
        const bob = Math.sin((wallNow - item.spawnTime) * 0.0045);
        visual.position.set(mapX(state, item.x + item.width / 2), 0.31 + bob * 0.1, mapZ(state, item.y + item.height / 2));
        visual.rotation.y += 0.018;
        if (visual.userData.halo) {
          visual.userData.halo.material.opacity = 0.4 + bob * 0.1;
          visual.userData.halo.scale.setScalar(0.94 + bob * 0.08);
        }
        if (visual.userData.innerHalo) visual.userData.innerHalo.material.opacity = 0.13 + bob * 0.05;
        if (visual.userData.glow) visual.userData.glow.intensity = (IS_MOBILE ? 2 : 2.7) + bob * 0.45;
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
        portal.userData.presentationContract = 'dungeon-veil-violet-arch-v2';

        const groundRing = new THREE.Mesh(
          new THREE.RingGeometry(0.66, 1.18, IS_ANDROID ? 30 : 56),
          new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = 0.035;
        portal.add(groundRing);

        const groundInner = new THREE.Mesh(
          new THREE.RingGeometry(0.27, 0.48, IS_ANDROID ? 20 : 40),
          new THREE.MeshBasicMaterial({ color: 0xd8ccff, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        groundInner.rotation.x = -Math.PI / 2;
        groundInner.position.y = 0.04;
        portal.add(groundInner);

        const stoneArch = new THREE.Mesh(
          new THREE.TorusGeometry(0.94, 0.125, IS_ANDROID ? 8 : 12, IS_ANDROID ? 40 : 72),
          new THREE.MeshStandardMaterial({ color: 0xaaa6b8, metalness: 0.34, roughness: 0.62, emissive: 0x2d145e, emissiveIntensity: 0.24 }),
        );
        stoneArch.position.y = 1.13;
        stoneArch.scale.y = 1.32;
        portal.add(stoneArch);

        const outerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.94, 0.036, IS_ANDROID ? 6 : 8, IS_ANDROID ? 36 : 68),
          new THREE.MeshBasicMaterial({ color: 0xe2d8ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        outerRing.position.set(0, 1.13, 0.035);
        outerRing.scale.y = 1.32;
        portal.add(outerRing);

        const innerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.73, 0.028, IS_ANDROID ? 6 : 8, IS_ANDROID ? 32 : 60),
          new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        innerRing.position.set(0, 1.13, 0.055);
        innerRing.scale.y = 1.35;
        portal.add(innerRing);

        const vortexLayers: any[] = [];
        [0x160b39, 0x3b1681, 0x7c3aed].forEach((color, index) => {
          const layer = new THREE.Mesh(
            new THREE.CircleGeometry(0.7 - index * 0.07, IS_ANDROID ? 28 : 52),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - index * 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          layer.position.set(0, 1.13, -0.055 + index * 0.025);
          layer.scale.y = 1.36;
          layer.userData.baseOpacity = 0.5 - index * 0.08;
          layer.userData.baseScale = 1 - index * 0.055;
          portal.add(layer);
          vortexLayers.push(layer);
        });

        const energyRibbons: any[] = [];
        for (let index = 0; index < 2; index++) {
          const ribbon = new THREE.Mesh(
            new THREE.TorusGeometry(0.82 - index * 0.11, 0.018 + index * 0.004, 5, IS_ANDROID ? 34 : 64, Math.PI * 1.52),
            new THREE.MeshBasicMaterial({ color: index ? 0xc4b5fd : 0x7c3aed, transparent: true, opacity: index ? 0.66 : 0.78, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          ribbon.position.set(0, 1.13, 0.075 + index * 0.018);
          ribbon.scale.y = 1.34;
          ribbon.rotation.z = index * Math.PI;
          portal.add(ribbon);
          energyRibbons.push(ribbon);
        }

        const runeMaterial = new THREE.MeshStandardMaterial({ color: 0xc4b5fd, metalness: 0.52, roughness: 0.34, emissive: 0x7c3aed, emissiveIntensity: 0.9 });
        const runeDiamonds: any[] = [];
        [[0, 2.48, 0.05], [0, -0.2, 0.05], [-1.08, 1.13, 0.05], [1.08, 1.13, 0.05]].forEach(([x, y, z], index) => {
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(index < 2 ? 0.13 : 0.11, 0), runeMaterial.clone());
          rune.position.set(x, y, z);
          rune.rotation.z = Math.PI / 4;
          portal.add(rune);
          runeDiamonds.push(rune);
        });

        const motes: any[] = [];
        const moteCount = IS_ANDROID ? 6 : IS_MOBILE ? 9 : 14;
        for (let index = 0; index < moteCount; index++) {
          const mote = new THREE.Mesh(
            new THREE.SphereGeometry(0.038 + (index % 3) * 0.011, 6, 6),
            new THREE.MeshBasicMaterial({ color: index % 2 ? 0xe9ddff : 0x8b5cf6, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          mote.userData.phase = index / moteCount * Math.PI * 2;
          portal.add(mote);
          motes.push(mote);
        }

        const core = IS_MOBILE ? new THREE.Object3D() : new THREE.PointLight(0x9d76ff, 9.6, 9.2, 2);
        core.intensity = IS_MOBILE ? 0 : core.intensity;
        core.position.y = 1.1;
        portal.add(core);

        Object.assign(portal.userData, { groundRing, groundInner, stoneArch, outerRing, innerRing, vortexLayers, energyRibbons, runeDiamonds, motes, core });
        scene.add(portal);
      }

      let exitX = Math.floor(state.map.width / 2);
      let exitY = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { exitX = x; exitY = y; break; }
      }

      portal.position.set(exitX + 0.5 - state.map.width / 2, 0.02, exitY + 0.5 - state.map.height / 2);
      const activateProgress = Math.min(1, Math.max(0, (gameNow - state.roomClearAt) / 560));
      const eased = 1 - Math.pow(1 - activateProgress, 3);
      const pulse = 0.5 + Math.sin(wallNow * 0.0055) * 0.5;
      portal.scale.setScalar(0.08 + eased * 0.92);
      portal.userData.outerRing.rotation.z = wallNow * 0.00058;
      portal.userData.innerRing.rotation.z = -wallNow * 0.00118;
      portal.userData.groundRing.rotation.z = wallNow * 0.00062;
      portal.userData.groundInner.rotation.z = -wallNow * 0.00105;
      portal.userData.groundRing.material.opacity = (0.38 + pulse * 0.28) * eased;
      portal.userData.groundInner.material.opacity = (0.2 + pulse * 0.18) * eased;
      portal.userData.stoneArch.material.emissiveIntensity = (0.18 + pulse * 0.2) * eased;
      portal.userData.vortexLayers.forEach((layer, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        layer.rotation.z = direction * wallNow * (0.00055 + index * 0.00038);
        layer.material.opacity = (layer.userData.baseOpacity + pulse * 0.08) * eased;
        const scale = layer.userData.baseScale * (0.94 + pulse * (0.07 + index * 0.01));
        layer.scale.set(scale, scale * 1.36, 1);
      });
      portal.userData.energyRibbons.forEach((ribbon, index) => {
        ribbon.rotation.z = (index ? -1 : 1) * wallNow * (0.00115 + index * 0.00045) + index * Math.PI;
        ribbon.material.opacity = (0.5 + pulse * 0.28 - index * 0.08) * eased;
      });
      portal.userData.runeDiamonds.forEach((rune, index) => {
        rune.rotation.y = wallNow * (0.001 + index * 0.00018);
        rune.scale.setScalar((0.88 + pulse * 0.22) * eased);
        rune.material.emissiveIntensity = (0.62 + pulse * 0.65) * eased;
      });
      if (!IS_MOBILE) portal.userData.core.intensity = (8.4 + pulse * 3.4) * eased;
      portal.userData.motes.forEach((mote, index) => {
        const phase = mote.userData.phase + wallNow * (0.001 + index * 0.000022);
        const radius = 0.66 + (index % 4) * 0.11;
        mote.position.x = Math.sin(phase) * radius;
        mote.position.y = 0.16 + ((wallNow * 0.00045 + index / Math.max(1, portal.userData.motes.length - 1)) % 1) * 2.18;
        mote.position.z = 0.08 + Math.cos(phase) * 0.13;
        mote.material.opacity = (0.38 + Math.sin(phase * 2) * 0.32) * eased;
      });
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

    const updatePerformanceDiagnostics = (now: number) => {
      perfFrames += 1;
      const elapsed = now - perfWindowStarted;
      if (elapsed < 2000 || !renderer) return;
      const fps = Math.round(perfFrames * 1000 / elapsed);
      const snapshot = {
        platform: IS_ANDROID ? 'android-balanced' : IS_IOS ? 'ios-balanced' : IS_MOBILE ? 'mobile-balanced' : 'desktop',
        fps,
        frameMs: Number((elapsed / Math.max(1, perfFrames)).toFixed(2)),
        calls: renderer.info?.render?.calls ?? 0,
        triangles: renderer.info?.render?.triangles ?? 0,
        geometries: renderer.info?.memory?.geometries ?? 0,
        textures: renderer.info?.memory?.textures ?? 0,
        particleBudget,
        floor: stateRef.current.floor,
        at: Date.now(),
      };
      try { localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(snapshot)); } catch {}
      if (IS_MOBILE) {
         lowFpsWindows = fps < 44 ? lowFpsWindows + 1 : Math.max(0, lowFpsWindows - 1);
         if (lowFpsWindows >= 2 && particleBudget > 16) {
            particleBudget = 16;
           try { sessionStorage.setItem(LOW_GPU_KEY, '1'); } catch {}
         }
       }
      perfFrames = 0;
      perfWindowStarted = now;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const rect = host.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = Math.max(1, Math.round(rect.width || viewport?.width || window.innerWidth));
      const height = Math.max(1, Math.round(rect.height || viewport?.height || window.innerHeight));
      if (width === lastRenderWidth && height === lastRenderHeight) return;
      lastRenderWidth = width;
      lastRenderHeight = height;
      renderer.setSize(width, height, false);
      const canvas = renderer.domElement as HTMLCanvasElement;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
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
      applyRoomEnvironment(roomRoot);
      preloadNextRoom(state);
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
      camera.userData.dungeonPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
      camera.userData.dungeonPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
      updateRunCamera(camera, cameraGoal, playerX, playerZ, state.roomClearReady);
      renderer.render(scene, camera);
      updatePerformanceDiagnostics(gameNow);
      raf = requestAnimationFrame(renderLoop);
    };

    const boot = async () => {
      await loadKayKitManifest();
      const initialState = stateRef.current;
      await Promise.all([
        preloadKayKitDungeonRoom(initialState.floor),
        preloadKayKitRoomTheme(initialState.floor),
      ]);
      if (disposed) return;
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x171512);
      scene.fog = new THREE.Fog(0x171512, 30, 58);
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 0.8 : IS_IOS ? 0.9 : IS_MOBILE ? 0.88 : 1.2));
      renderer.shadowMap.enabled = !IS_MOBILE;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_ANDROID ? 1.16 : 1.12;
      const canvas = renderer.domElement as HTMLCanvasElement;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      host.appendChild(canvas);
      camera = new THREE.PerspectiveCamera(RUN_CAMERA.fov, 1, 0.1, 150);
      camera.position.set(0, RUN_CAMERA.height, RUN_CAMERA.distance);
      cameraGoal = new THREE.Vector3();
      scene.add(new THREE.AmbientLight(0xd8d1c5, IS_ANDROID ? 0.88 : 0.74));
      scene.add(new THREE.HemisphereLight(0xd9c7aa, 0x171512, IS_ANDROID ? 1.18 : 1.05));
      const keyLight = new THREE.DirectionalLight(0xffc98b, IS_ANDROID ? 1.65 : 1.85);
      keyLight.position.set(-7, 14, 7);
      keyLight.castShadow = !IS_MOBILE;
      keyLight.shadow.mapSize.set(IS_MOBILE ? 512 : 1024, IS_MOBILE ? 512 : 1024);
      scene.add(keyLight);
      if (!IS_MOBILE) {
        const fillLight = new THREE.PointLight(0x6f61c8, 2.2, 22, 1.8);
        fillLight.position.set(0, 6.5, -8);
        scene.add(fillLight);
      }
      if (!IS_MOBILE) {
        playerLight = new THREE.PointLight(0xffd29b, 2.5, 13, 1.7);
        scene.add(playerLight);
      }

      playerRig = await loadKayKitRanger(THREE, GLTFLoader);
      if (disposed) return;
      playerRig.root.scale.setScalar(0.96);
      arrowPrototype = playerRig.arrowPrototype;
      scene.add(playerRig.root);
      clock = new THREE.Clock();
      resize();
      renderLoop();
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    boot().catch(error => console.error('KayKit run renderer failed', error));
    return () => {
      disposed = true;
      roomGeneration += 1;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      resizeObserver?.disconnect();
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

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="run-three-host" data-portal-contract="dungeon-veil-violet-arch-v2" style={{ width: '100%', height: '100%' }} />;
}
