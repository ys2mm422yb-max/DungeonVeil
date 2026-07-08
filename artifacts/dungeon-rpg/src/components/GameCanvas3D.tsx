import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { TILE_SIZE, TileType } from '../game/dungeon';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const ASSET_ROOT = '/assets/3d/';

const TILE_WORLD = 40;
const WORLD_OFFSET_X = 8.5;
const WORLD_OFFSET_Z = 11.5;

function pxToWorldX(px: number) { return px / TILE_WORLD - WORLD_OFFSET_X; }
function pxToWorldZ(py: number) { return py / TILE_WORLD - WORLD_OFFSET_Z; }

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
    let portalMesh: any = null;
    let lastAttackTime = 0;
    const enemyMeshes = new Map<string, any>();
    const arrowMeshes = new Map<string, any>();
    const dashMeshes = new Map<string, any>();
    const pickupMeshes = new Map<string, any>();
    const itemMeshes = new Map<string, any>();
    let hitSparks: { mesh: any; life: number }[] = [];

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

    const createMaterial = (color: number, emissive?: number, emissiveIntensity = 0, roughness = 0.7) => {
      return new THREE.MeshStandardMaterial({
        color,
        emissive: emissive ?? 0x000000,
        emissiveIntensity,
        roughness,
        metalness: 0.1,
      });
    };

    const hexToNumber = (hex: string | number) => {
      if (typeof hex === 'number') return hex;
      return parseInt(hex.replace('#', ''), 16) || 0xffffff;
    };

    const addMeshToGroup = (group: any, mesh: any) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };

    const createEnemyMesh = (type: string, color: number) => {
      const group = new THREE.Group();
      const mat = createMaterial(color);
      const darkMat = createMaterial(color, 0x000000, 0, 0.85);
      const glowMat = createMaterial(color, color, 0.6, 0.35);

      switch (type) {
        case 'slime': {
          const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat);
          body.scale.set(1, 0.65, 1);
          body.position.y = 0.22;
          addMeshToGroup(group, body);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), createMaterial(0x111111));
          eye.position.set(0, 0.34, 0.32);
          addMeshToGroup(group, eye);
          break;
        }
        case 'goblin': {
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.46, 7), mat);
          body.position.y = 0.36;
          addMeshToGroup(group, body);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
          head.position.y = 0.76;
          addMeshToGroup(group, head);
          const earL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), mat);
          earL.position.set(-0.2, 0.82, 0);
          earL.rotation.z = 0.5;
          addMeshToGroup(group, earL);
          const earR = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), mat);
          earR.position.set(0.2, 0.82, 0);
          earR.rotation.z = -0.5;
          addMeshToGroup(group, earR);
          break;
        }
        case 'skeleton': {
          const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.44, 6), mat);
          ribcage.position.y = 0.5;
          addMeshToGroup(group, ribcage);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), mat);
          head.position.y = 0.88;
          addMeshToGroup(group, head);
          for (const [x, z] of [[-0.18, 0.12], [0.18, 0.12], [-0.18, -0.12], [0.18, -0.12]]) {
            const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 5), mat);
            limb.position.set(x, 0.3, z);
            addMeshToGroup(group, limb);
          }
          break;
        }
        case 'orc': {
          const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.6, 7), mat);
          torso.position.y = 0.58;
          addMeshToGroup(group, torso);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), mat);
          head.position.y = 1.05;
          addMeshToGroup(group, head);
          const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 6), darkMat);
          jaw.position.set(0, 0.95, 0.16);
          jaw.rotation.x = 2.6;
          addMeshToGroup(group, jaw);
          for (const x of [-0.36, 0.36]) {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.52, 6), mat);
            arm.position.set(x, 0.62, 0);
            addMeshToGroup(group, arm);
          }
          break;
        }
        case 'spider': {
          const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), mat);
          abdomen.position.set(0, 0.3, 0.18);
          abdomen.scale.set(0.9, 0.7, 1.1);
          addMeshToGroup(group, abdomen);
          const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat);
          thorax.position.set(0, 0.34, -0.14);
          addMeshToGroup(group, thorax);
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 5), mat);
            leg.position.set(Math.cos(angle) * 0.22, 0.18, Math.sin(angle) * 0.22);
            leg.rotation.z = Math.cos(angle) * 0.8;
            leg.rotation.x = Math.sin(angle) * 0.8;
            addMeshToGroup(group, leg);
          }
          break;
        }
        case 'vampire': {
          const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 0.92, 7), createMaterial(color, 0x000000, 0, 0.9));
          robe.position.y = 0.62;
          addMeshToGroup(group, robe);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat);
          head.position.y = 1.18;
          addMeshToGroup(group, head);
          const cape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.7, 0.08), darkMat);
          cape.position.set(0, 0.72, -0.18);
          cape.rotation.x = 0.15;
          addMeshToGroup(group, cape);
          break;
        }
        case 'demon': {
          const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.36), mat);
          torso.position.y = 0.68;
          addMeshToGroup(group, torso);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), glowMat);
          head.position.y = 1.18;
          addMeshToGroup(group, head);
          const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), createMaterial(0x221111));
          hornL.position.set(-0.12, 1.34, 0);
          hornL.rotation.z = 0.25;
          addMeshToGroup(group, hornL);
          const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), createMaterial(0x221111));
          hornR.position.set(0.12, 1.34, 0);
          hornR.rotation.z = -0.25;
          addMeshToGroup(group, hornR);
          const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.5, 5), mat);
          tail.position.set(0, 0.4, -0.32);
          tail.rotation.x = -0.8;
          addMeshToGroup(group, tail);
          break;
        }
        case 'golem': {
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.72, 0.48), mat);
          body.position.y = 0.56;
          addMeshToGroup(group, body);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), mat);
          head.position.y = 1.04;
          addMeshToGroup(group, head);
          for (const x of [-0.46, 0.46]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), mat);
            arm.position.set(x, 0.56, 0);
            addMeshToGroup(group, arm);
          }
          break;
        }
        case 'boss': {
          const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.64, 0.9, 8), mat);
          torso.position.y = 0.9;
          addMeshToGroup(group, torso);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), glowMat);
          head.position.y = 1.62;
          addMeshToGroup(group, head);
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + 0.4;
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 6), createMaterial(0x330000));
            horn.position.set(Math.cos(angle) * 0.22, 1.78, Math.sin(angle) * 0.22);
            horn.lookAt(Math.cos(angle) * 0.5, 2.1, Math.sin(angle) * 0.5);
            addMeshToGroup(group, horn);
          }
          for (const x of [-0.7, 0.7]) {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.74, 7), mat);
            arm.position.set(x, 0.9, 0);
            addMeshToGroup(group, arm);
          }
          break;
        }
        default: {
          const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat);
          body.position.y = 0.4;
          addMeshToGroup(group, body);
        }
      }
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
        let group = enemyMeshes.get(enemy.id);
        if (!group) {
          group = createEnemyMesh(enemy.enemyType, hexToNumber(enemy.color));
          scene.add(group);
          enemyMeshes.set(enemy.id, group);
        }
        const baseScale = enemy.enemyType === 'boss' ? 1.5 : enemy.enemyType === 'golem' ? 1.25 : 1;
        const flashScale = enemy.flashUntil > now ? 1.15 : 1;
        group.scale.setScalar(baseScale * flashScale);
        group.position.set(pxToWorldX(enemy.x + enemy.width / 2), 0, pxToWorldZ(enemy.y + enemy.height / 2));
        group.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);
      }
    };

    const createArrow = (effect: any) => {
      const group = new THREE.Group();
      const color = hexToNumber(effect.color);
      const glowMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.25 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), glowMat);
      shaft.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 6), glowMat);
      head.rotation.z = -Math.PI / 2;
      head.position.x = 0.62;
      const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.055, 0.55, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.55 }));
      trail.rotation.z = Math.PI / 2;
      trail.position.x = -0.55;
      group.add(shaft, head, trail);
      scene.add(group);
      arrowMeshes.set(effect.id, group);
      return group;
    };

    const addHitSpark = (x: number, y: number, z: number, color: number) => {
      const geo = new THREE.SphereGeometry(0.18, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      hitSparks.push({ mesh, life: 1 });
    };

    const syncArrows = (state: GameState) => {
      const shots = state.effects.filter(effect => effect.type === 'beam');
      const activeIds = new Set(shots.map(effect => effect.id));
      for (const [id, group] of arrowMeshes) {
        if (!activeIds.has(id)) {
          addHitSpark(group.position.x, group.position.y, group.position.z, 0xffd466);
          scene.remove(group);
          disposeObject(group);
          arrowMeshes.delete(id);
        }
      }

      for (const effect of shots) {
        const arrow = arrowMeshes.get(effect.id) ?? createArrow(effect);
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const startX = pxToWorldX(effect.x);
        const startZ = pxToWorldZ(effect.y);
        const travel = effect.maxRadius / TILE_WORLD;
        const angle = effect.angle ?? 0;
        arrow.position.set(startX + Math.cos(angle) * travel * progress, 0.72, startZ + Math.sin(angle) * travel * progress);
        arrow.rotation.y = -angle;
      }
    };

    const createDash = (effect: any) => {
      const group = new THREE.Group();
      const color = hexToNumber(effect.color);
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, Math.max(0.65, effect.maxRadius / TILE_WORLD), 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.5, roughness: 0.35 }),
      );
      trail.rotation.z = Math.PI / 2;
      trail.position.x = Math.max(0.65, effect.maxRadius / TILE_WORLD) / 2;

      const startRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.018, 5, 12),
        new THREE.MeshStandardMaterial({ color: 0xfff1b5, emissive: color, emissiveIntensity: 1, transparent: true, opacity: 0.65, roughness: 0.3 }),
      );
      startRing.rotation.x = Math.PI / 2;

      const endRing = startRing.clone();
      endRing.position.x = Math.max(0.65, effect.maxRadius / TILE_WORLD);
      endRing.scale.setScalar(1.45);

      group.add(trail, startRing, endRing);
      scene.add(group);
      dashMeshes.set(effect.id, group);
      return group;
    };

    const syncDashes = (state: GameState) => {
      const dashes = state.effects.filter(effect => effect.type === 'dash');
      const activeIds = new Set(dashes.map(effect => effect.id));
      for (const [id, group] of dashMeshes) {
        if (!activeIds.has(id)) {
          scene.remove(group);
          disposeObject(group);
          dashMeshes.delete(id);
        }
      }

      for (const effect of dashes) {
        const dash = dashMeshes.get(effect.id) ?? createDash(effect);
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const fade = Math.max(0, 1 - progress);
        const startX = pxToWorldX(effect.x);
        const startZ = pxToWorldZ(effect.y);
        const angle = effect.angle ?? 0;
        dash.position.set(startX, 0.08, startZ);
        dash.rotation.y = -angle;
        dash.scale.set(1, Math.max(0.25, fade), 1);
        dash.traverse((node: any) => {
          if (node.material?.transparent) node.material.opacity = node.geometry?.type === 'TorusGeometry' ? 0.65 * fade : 0.5 * fade;
        });
      }
    };

    const createPickup = (effect: any) => {
      const group = new THREE.Group();
      const color = hexToNumber(effect.color ?? '#5fd0ff');
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16 + (effect.width ?? 3) * 0.012, 0.018, 5, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.25, transparent: true, opacity: 0.8, roughness: 0.3 }),
      );
      ring.rotation.x = Math.PI / 2;

      const burst = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, transparent: true, opacity: 0.85, roughness: 0.25 }),
      );
      burst.position.y = 0.18;

      for (let i = 0; i < 4; i++) {
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 5, 4),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.15, transparent: true, opacity: 0.75, roughness: 0.35 }),
        );
        const angle = i * Math.PI / 2 + Math.PI / 4;
        spark.position.set(Math.cos(angle) * 0.22, 0.12, Math.sin(angle) * 0.22);
        group.add(spark);
      }

      group.add(ring, burst);
      scene.add(group);
      pickupMeshes.set(effect.id, group);
      return group;
    };

    const syncPickups = (state: GameState) => {
      const pickups = state.effects.filter(effect => effect.type === 'pickup');
      const activeIds = new Set(pickups.map(effect => effect.id));
      for (const [id, group] of pickupMeshes) {
        if (!activeIds.has(id)) {
          scene.remove(group);
          disposeObject(group);
          pickupMeshes.delete(id);
        }
      }

      for (const effect of pickups) {
        const pickup = pickupMeshes.get(effect.id) ?? createPickup(effect);
        const progress = Math.max(0, Math.min(1, effect.lifeTime / effect.maxLifeTime));
        const fade = Math.max(0, 1 - progress);
        pickup.position.set(pxToWorldX(effect.x), 0.22 + progress * 0.32, pxToWorldZ(effect.y));
        pickup.rotation.y += 0.08;
        pickup.scale.setScalar(0.85 + progress * 1.1);
        pickup.traverse((node: any) => {
          if (node.material?.transparent) node.material.opacity = (node.geometry?.type === 'TorusGeometry' ? 0.8 : 0.75) * fade;
        });
      }
    };

    const createItemMesh = (item: GameState['items'][number]) => {
      const group = new THREE.Group();
      if (item.itemType === 'xp_orb') {
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.28, 0),
          new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x2a9fd8, emissiveIntensity: 1.4, roughness: 0.2 }),
        );
        group.add(orb);
      } else {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 0.48, 8),
          new THREE.MeshStandardMaterial({ color: 0xff5e64, emissive: 0x7c1b20, emissiveIntensity: 0.8, roughness: 0.35 }),
        );
        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8),
          new THREE.MeshStandardMaterial({ color: 0xe8c28f, roughness: 0.8 }),
        );
        neck.position.y = 0.32;
        const cork = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8),
          new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }),
        );
        cork.position.y = 0.4;
        group.add(bottle, neck, cork);
      }
      group.traverse((node: any) => { if (node.isMesh) { node.castShadow = true; } });
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
        const bob = Math.sin((now - item.spawnTime) / 220) * 0.1;
        group.position.set(pxToWorldX(item.x + item.width / 2), 0.4 + bob, pxToWorldZ(item.y + item.height / 2));
        group.rotation.y += 0.04;
      }
    };

    const syncPortal = (state: GameState, now: number) => {
      const alive = state.enemies.filter(e => e.hp > 0 && !e.isDead).length;
      const isClear = alive === 0 && state.status === 'playing';
      if (!isClear) {
        if (portalMesh) {
          scene.remove(portalMesh);
          disposeObject(portalMesh);
          portalMesh = null;
        }
        return;
      }
      if (!portalMesh) {
        const group = new THREE.Group();
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.08, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x9d7bff, emissive: 0x6c3dd4, emissiveIntensity: 1.6, roughness: 0.2 }),
        );
        ring.rotation.x = Math.PI / 2;
        const inner = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xbba6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
        );
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x7c5cff, emissive: 0x5a36d6, emissiveIntensity: 0.8 }),
        );
        pillar.position.y = 0.8;
        group.add(ring, inner, pillar);
        group.traverse((node: any) => { if (node.isMesh) node.castShadow = true; });
        scene.add(group);
        portalMesh = group;
      }

      let stairX = Math.floor(state.map.width / 2);
      let stairY = 2;
      for (let y = 0; y < state.map.tiles.length; y++) {
        const x = state.map.tiles[y].findIndex((tile: TileType) => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { stairX = x; stairY = y; break; }
      }
      portalMesh.position.set(pxToWorldX(stairX * TILE_SIZE), 0, pxToWorldZ(stairY * TILE_SIZE));
      portalMesh.rotation.y = (now / 600) % (Math.PI * 2);
      const scale = 1 + Math.sin(now / 350) * 0.06;
      portalMesh.scale.setScalar(scale);
    };

    const updateHitSparks = (dt: number) => {
      for (let i = hitSparks.length - 1; i >= 0; i--) {
        const spark = hitSparks[i];
        spark.life -= dt * 4;
        spark.mesh.scale.setScalar(1 + (1 - spark.life) * 1.5);
        spark.mesh.material.opacity = Math.max(0, spark.life);
        if (spark.life <= 0) {
          scene.remove(spark.mesh);
          spark.mesh.geometry?.dispose?.();
          spark.mesh.material?.dispose?.();
          hitSparks.splice(i, 1);
        }
      }
    };

    const renderLoop = () => {
      if (disposed || !renderer || !scene || !camera || !THREE) return;
      const state = stateRef.current;
      const player = state.player;
      const px = pxToWorldX(player.x + player.width / 2);
      const pz = pxToWorldZ(player.y + player.height / 2);

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
      const dt = Math.min(clock?.getDelta?.() ?? 0.016, 0.05);
      syncEnemies(state);
      syncArrows(state);
      syncDashes(state);
      syncPickups(state);
      syncItems(state, now);
      syncPortal(state, now);
      updateHitSparks(dt);
      mixer?.update(dt);
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

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: isMobile ? 'default' : 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.35));
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
      for (const mesh of enemyMeshes.values()) disposeObject(mesh);
      for (const group of arrowMeshes.values()) disposeObject(group);
      for (const group of dashMeshes.values()) disposeObject(group);
      for (const group of pickupMeshes.values()) disposeObject(group);
      for (const group of itemMeshes.values()) disposeObject(group);
      for (const spark of hitSparks) {
        scene.remove(spark.mesh);
        spark.mesh.geometry?.dispose?.();
        spark.mesh.material?.dispose?.();
      }
      hitSparks = [];
      if (portalMesh) { scene.remove(portalMesh); disposeObject(portalMesh); portalMesh = null; }
      enemyMeshes.clear();
      arrowMeshes.clear();
      dashMeshes.clear();
      pickupMeshes.clear();
      itemMeshes.clear();
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
