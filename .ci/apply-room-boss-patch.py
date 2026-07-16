from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"missing replacement in {path}: {old[:80]!r}")
    target.write_text(text.replace(old, new, 1))

boss_module = r'''import type { Enemy, VisualEffect } from './entities';
import type { GameEngine } from './runEngine';
import { makeHitSpark } from './combat';

export type BossAttackContract = {
  room: 20 | 30 | 40 | 50;
  target: 'locked-ground' | 'boss-radius';
  radius: number;
  windupMs: number;
  color: string;
  element: NonNullable<VisualEffect['element']>;
  label: string;
  projectileWidth: number;
};

type BossAttackSnapshot = {
  startedAt: number;
  hitAt: number;
  targetX: number;
  targetY: number;
  contract: BossAttackContract;
};

type PatchedEngine = GameEngine & {
  updateEnemies: (dt: number, time: number) => void;
  resolveEnemyAttack: (enemy: Enemy, windup: { hitAt: number; range: number; archetype: string; index: number }, time: number) => void;
  enemyWindups: Map<string, { hitAt: number; range: number; archetype: string; index: number }>;
  shotPathBlocked: (fromX: number, fromY: number, toX: number, toY: number, padding?: number) => boolean;
};

const BOSS_ATTACK_CONTRACTS: Partial<Record<number, BossAttackContract>> = {
  20: { room: 20, target: 'locked-ground', radius: 92, windupMs: 900, color: '#b995ff', element: 'arcane', label: 'SCHLEIERSTURZ — RAUS!', projectileWidth: 9 },
  30: { room: 30, target: 'locked-ground', radius: 52, windupMs: 760, color: '#d9ef83', element: 'normal', label: 'PFEILSALVE — AUSWEICHEN!', projectileWidth: 5 },
  40: { room: 40, target: 'boss-radius', radius: 88, windupMs: 620, color: '#d17aff', element: 'arcane', label: 'SCHATTENSCHLAG — ABSTAND!', projectileWidth: 7 },
  50: { room: 50, target: 'locked-ground', radius: 96, windupMs: 900, color: '#ff7438', element: 'fire', label: 'GLUTSTURZ — RAUS!', projectileWidth: 10 },
};

export function bossAttackContract(room: number): BossAttackContract | null {
  return BOSS_ATTACK_CONTRACTS[Math.max(1, Math.min(50, room))] ?? null;
}

function bossCenter(enemy: Enemy) {
  return { x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 };
}

function playerCenter(engine: GameEngine) {
  return { x: engine.state.player.x + engine.state.player.width / 2, y: engine.state.player.y + engine.state.player.height / 2 };
}

function warningEffects(enemy: Enemy, snapshot: BossAttackSnapshot): VisualEffect[] {
  const source = bossCenter(enemy);
  const x = snapshot.contract.target === 'boss-radius' ? source.x : snapshot.targetX;
  const y = snapshot.contract.target === 'boss-radius' ? source.y : snapshot.targetY;
  return [
    {
      id: `telegraph-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 0,
      maxRadius: snapshot.contract.radius,
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
    {
      id: `telegraph-inner-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 4,
      maxRadius: snapshot.contract.radius * 0.62,
      color: '#fff2c2',
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
  ];
}

function addBossImpact(engine: GameEngine, enemy: Enemy, snapshot: BossAttackSnapshot, time: number) {
  const source = bossCenter(enemy);
  const center = snapshot.contract.target === 'boss-radius' ? source : { x: snapshot.targetX, y: snapshot.targetY };
  if (snapshot.contract.target === 'locked-ground') {
    const angle = Math.atan2(snapshot.targetY - source.y, snapshot.targetX - source.x);
    engine.state.effects.push({
      id: `shot-boss-${snapshot.contract.room}-${time}-${enemy.id}`,
      x: source.x,
      y: source.y,
      radius: 0,
      maxRadius: Math.hypot(snapshot.targetX - source.x, snapshot.targetY - source.y),
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.room === 30 ? 220 : 280,
      type: 'beam',
      angle,
      width: snapshot.contract.projectileWidth,
      element: snapshot.contract.element,
    });
  }
  engine.state.effects.push({
    id: `boss-impact-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: center.x,
    y: center.y,
    radius: 8,
    maxRadius: snapshot.contract.radius,
    color: snapshot.contract.color,
    lifeTime: 0,
    maxLifeTime: 640,
    type: 'circle',
    element: snapshot.contract.element,
  });
  engine.state.effects.push({
    id: `boss-impact-inner-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: center.x,
    y: center.y,
    radius: 0,
    maxRadius: snapshot.contract.radius * 0.55,
    color: '#fff0bd',
    lifeTime: 0,
    maxLifeTime: 420,
    type: 'circle',
    element: snapshot.contract.element,
  });
}

function damagePlayer(engine: GameEngine, enemy: Enemy, snapshot: BossAttackSnapshot, time: number) {
  const player = engine.state.player;
  if (time <= player.invincibleUntil) return;
  const playerPosition = playerCenter(engine);
  const source = bossCenter(enemy);
  const center = snapshot.contract.target === 'boss-radius' ? source : { x: snapshot.targetX, y: snapshot.targetY };
  if (Math.hypot(playerPosition.x - center.x, playerPosition.y - center.y) > snapshot.contract.radius) return;
  const raw = enemy.attack - player.defense + Math.floor(Math.random() * 3);
  const damage = Math.max(1, raw);
  player.hp -= damage;
  player.lastHitTime = time;
  if ((engine.state.runSkills.defense ?? 0) > 0) player.lastGuardTime = time;
  engine.state.damageNumbers.push({
    id: `boss-hit-${snapshot.contract.room}-${time}-${enemy.id}`,
    x: playerPosition.x + (Math.random() - 0.5) * 14,
    y: player.y - 8,
    value: `-${damage}`,
    color: '#e34b43',
    lifeTime: 0,
    maxLifeTime: 800,
    scale: 1.4,
  });
  engine.state.particles.push(...makeHitSpark(playerPosition.x, playerPosition.y, snapshot.contract.color, 14));
}

export function installBossAttackTelegraphs(engine: GameEngine): () => void {
  const runtime = engine as PatchedEngine;
  const originalUpdateEnemies = runtime.updateEnemies.bind(engine);
  const originalResolveEnemyAttack = runtime.resolveEnemyAttack.bind(engine);
  const attacks = new Map<string, BossAttackSnapshot>();

  runtime.resolveEnemyAttack = (enemy, windup, time) => {
    const contract = enemy.enemyType === 'boss' ? bossAttackContract(engine.state.floor) : null;
    if (!contract) {
      originalResolveEnemyAttack(enemy, windup, time);
      return;
    }
    const fallbackTarget = playerCenter(engine);
    const snapshot = attacks.get(enemy.id) ?? {
      startedAt: enemy.lastAttackTime || time,
      hitAt: time,
      targetX: fallbackTarget.x,
      targetY: fallbackTarget.y,
      contract,
    };
    const source = bossCenter(enemy);
    const blocked = contract.target === 'locked-ground'
      && runtime.shotPathBlocked(source.x, source.y, snapshot.targetX, snapshot.targetY, 0.08);
    addBossImpact(engine, enemy, snapshot, time);
    if (!blocked) damagePlayer(engine, enemy, snapshot, time);
    attacks.delete(enemy.id);
  };

  runtime.updateEnemies = (dt, time) => {
    const previous = new Map(engine.state.enemies.map(enemy => [enemy.id, enemy.lastAttackTime]));
    originalUpdateEnemies(dt, time);

    for (const enemy of engine.state.enemies) {
      const contract = enemy.enemyType === 'boss' ? bossAttackContract(engine.state.floor) : null;
      if (!contract || enemy.isDead || enemy.hp <= 0) continue;
      const oldAttack = previous.get(enemy.id) ?? 0;
      if (enemy.lastAttackTime <= oldAttack) continue;
      const windup = runtime.enemyWindups.get(enemy.id);
      if (!windup) continue;
      const oldWindupMs = Math.max(1, windup.hitAt - enemy.lastAttackTime);
      windup.hitAt = enemy.lastAttackTime + contract.windupMs;
      enemy.nextAttackTime += Math.max(0, contract.windupMs - oldWindupMs);
      const target = playerCenter(engine);
      const snapshot: BossAttackSnapshot = {
        startedAt: enemy.lastAttackTime,
        hitAt: windup.hitAt,
        targetX: target.x,
        targetY: target.y,
        contract,
      };
      attacks.set(enemy.id, snapshot);
      engine.state.effects = engine.state.effects.filter(effect => effect.id !== `telegraph-${enemy.lastAttackTime}-${enemy.id}`);
      engine.state.effects.push(...warningEffects(enemy, snapshot));
      const textPosition = contract.target === 'boss-radius' ? bossCenter(enemy) : target;
      engine.state.damageNumbers.push({
        id: `boss-warning-${contract.room}-${enemy.lastAttackTime}-${enemy.id}`,
        x: textPosition.x,
        y: textPosition.y - 34,
        value: contract.label,
        color: contract.color,
        lifeTime: 0,
        maxLifeTime: contract.windupMs,
        scale: 1.05,
      });
    }

    for (const [enemyId] of attacks) {
      if (!engine.state.enemies.some(enemy => enemy.id === enemyId && !enemy.isDead && enemy.hp > 0)) attacks.delete(enemyId);
    }
  };

  return () => {
    runtime.updateEnemies = originalUpdateEnemies;
    runtime.resolveEnemyAttack = originalResolveEnemyAttack;
    attacks.clear();
  };
}
'''

meadow_module = r'''import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const F = 'forest/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf';
const D = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const R = 'resources/KayKit_ResourceBits_1.0_FREE/Assets/gltf';
const U = 'furniture/Assets/gltf';

const prototypePromises = new Map<string, Promise<any>>();

type MeadowDecoration = { model: string; x: number; z: number; rotation?: number; scale?: number };
const d = (model: string, x: number, z: number, rotation = 0, scale = 1): MeadowDecoration => ({ model, x, z, rotation, scale });

export const MEADOW_ROOM_DECORATIONS: Record<number, MeadowDecoration[]> = {
  21: [d(`${F}/Bush_3_A_Color1.gltf`, -7.1, 1.8, .1, 1.08), d(`${F}/Grass_1_C_Color1.gltf`, 6.6, 4.4, 0, 1.32), d(`${F}/Rock_1_H_Color1.gltf`, 7.1, -4.8, -.2, .92)],
  22: [d(`${F}/Bush_4_D_Color1.gltf`, -5.7, -4.7, 0, 1.12), d(`${F}/Grass_2_B_Color1.gltf`, 5.8, -1.8, 0, 1.35), d(`${F}/Rock_1_C_Color1.gltf`, -6.2, 4.5, .16, .9)],
  23: [d(`${F}/Rock_1_A_Color1.gltf`, -7.2, -.4, .24, .94), d(`${F}/Rock_2_G_Color1.gltf`, 7.0, 2.7, -.22, .92), d(`${F}/Grass_1_B_Color1.gltf`, 1.2, 4.8, 0, 1.28)],
  24: [d(`${R}/Pallet_Wood.gltf`, -6.8, 4.2, .1, 1.02), d(`${D}/box_small.gltf`, 6.8, -4.5, -.1, .96), d(`${F}/Grass_1_A_Color1.gltf`, 5.2, 4.7, 0, 1.24)],
  25: [d(`${F}/Rock_2_B_Color1.gltf`, -6.5, 4.5, .18, .95), d(`${F}/Rock_1_F_Color1.gltf`, 6.4, 4.4, -.18, .94), d(`${F}/Grass_2_C_Color1.gltf`, 0, 5.0, 0, 1.3)],
  26: [d(`${F}/Bush_4_E_Color1.gltf`, -6.0, 4.4, 0, 1.14), d(`${F}/Bush_3_B_Color1.gltf`, 6.1, 4.2, 0, 1.1), d(`${F}/Grass_1_D_Color1.gltf`, 0, -5.0, 0, 1.3)],
  27: [d(`${U}/table_medium.gltf`, 5.9, -4.3, -.08, .94), d(`${D}/barrel_small.gltf`, -6.2, 4.0, .16, .95), d(`${F}/Bush_2_C_Color1.gltf`, 6.6, 3.8, 0, 1.08)],
  28: [d(`${F}/Tree_1_B_Color1.gltf`, -8.5, -1.8, .1, 1.08), d(`${F}/Rock_1_K_Color1.gltf`, 7.0, -4.6, -.18, .9), d(`${F}/Grass_2_A_Color1.gltf`, 6.0, 4.7, 0, 1.28)],
  29: [d(`${D}/rubble_half.gltf`, -7.0, -4.6, .18, .68), d(`${F}/Rock_2_H_Color1.gltf`, 7.0, 4.5, -.18, .9), d(`${F}/Grass_1_C_Color1.gltf`, -5.2, 4.6, 0, 1.3)],
  30: [d(`${F}/Rock_3_A_Color1.gltf`, 0, -4.8, 0, 1.62), d(`${F}/Grass_2_B_Color1.gltf`, -6.8, 4.8, 0, 1.22), d(`${F}/Grass_2_C_Color1.gltf`, 6.8, 4.8, 0, 1.22)],
};

async function prototypeFor(model: string) {
  const cached = prototypePromises.get(model);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const gltf = await new GLTFLoader().loadAsync(modelUrl(manifest, model));
    gltf.scene.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      if (node.geometry && !node.geometry.userData?.kayKitPersistent) {
        node.geometry.userData = { ...(node.geometry.userData ?? {}), kayKitPersistent: true };
        node.geometry.dispose = () => undefined;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material: any) => {
        if (!material.userData?.kayKitPersistent) {
          material.userData = { ...(material.userData ?? {}), kayKitPersistent: true };
          material.dispose = () => undefined;
        }
      });
      node.castShadow = false;
      node.receiveShadow = !IS_MOBILE;
      node.frustumCulled = true;
    });
    return gltf.scene;
  })();
  prototypePromises.set(model, promise);
  return promise;
}

export async function preloadMeadowRoomTheme(room: number) {
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  await Promise.allSettled(pieces.map(piece => prototypeFor(piece.model)));
}

export function buildMeadowRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `MeadowRoomTheme_${room}`;
  const pieces = MEADOW_ROOM_DECORATIONS[room] ?? [];
  let active = true;
  root.userData.ready = Promise.allSettled(pieces.map(async piece => {
    try {
      const prototype = await prototypeFor(piece.model);
      if (!active) return;
      const object = prototype.clone(true);
      object.position.set(piece.x, 0, piece.z);
      object.rotation.y = piece.rotation ?? 0;
      object.scale.setScalar(piece.scale ?? 1);
      root.add(object);
    } catch (error) {
      console.warn(`Meadow decoration unavailable in room ${room}: ${piece.model}`, error);
    }
  })).then(() => undefined);
  root.userData.dispose = () => { active = false; };
  return root;
}
'''

audit_script = r'''import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const boss = read('src/game/bossAttackTelegraphs.ts');
const bridge = read('src/components/GameSessionBridge.tsx');
const meadow = read('src/components/meadowRoomsTheme3D.ts');
const themes = read('src/components/kaykitRoomThemes3D.ts');
const expanded = read('src/game/expandedWorldRooms.ts');

for (const room of [20, 30, 40, 50]) {
  assert(boss.includes(`${room}: { room: ${room}`), `Boss room ${room} needs an explicit attack contract.`);
}
assert(boss.includes("target: 'locked-ground'") && boss.includes("target: 'boss-radius'"), 'Boss attacks need locked ground and boss-radius contracts.');
assert(boss.includes('runtime.resolveEnemyAttack =') && boss.includes('runtime.updateEnemies ='), 'Boss contract must intercept windup and resolution.');
assert(boss.includes('telegraph-boss-') && boss.includes('telegraph-inner-boss-'), 'Boss attacks need visible outer and converging warnings.');
assert(boss.includes('shot-boss-'), 'Ranged boss attacks need a renderer-visible projectile id.');
assert(boss.includes('Math.hypot(playerPosition.x - center.x') && boss.includes('snapshot.contract.radius'), 'Visible warning radius and hit radius must use the same contract value.');
assert(bridge.includes('installBossAttackTelegraphs') && bridge.includes('disposeBossAttacks'), 'Game session must install and clean up boss attack contracts.');

for (let room = 21; room <= 30; room++) {
  assert(meadow.includes(`  ${room}: [`), `Room ${room} needs explicit meadow decoration.`);
}
assert(meadow.includes('Rock_3_A_Color1.gltf'), 'Room 30 needs a valid visible replacement rock.');
assert(!expanded.includes('Rock_3_R_Color1.gltf'), 'The missing room-30 rock asset must not remain referenced.');
assert(themes.includes('buildMeadowRoomTheme') && themes.includes('preloadMeadowRoomTheme'), 'Meadow additions must be built and preloaded.');
assert(themes.includes('Base room theme partially unavailable'), 'Room theme loading must survive one unavailable decoration.');

console.log('Boss room telegraph, meadow density and room 30 visibility audit passed.');
'''

(ROOT / 'artifacts/dungeon-rpg/src/game/bossAttackTelegraphs.ts').write_text(boss_module)
(ROOT / 'artifacts/dungeon-rpg/src/components/meadowRoomsTheme3D.ts').write_text(meadow_module)
(ROOT / 'artifacts/dungeon-rpg/scripts/validate-boss-room-telegraphs-and-meadow.mjs').write_text(audit_script)

replace_once(
    'artifacts/dungeon-rpg/src/components/GameSessionBridge.tsx',
    "import { createRoomMechanicState, updateRoomMechanics } from '../game/roomMechanics';\n",
    "import { createRoomMechanicState, updateRoomMechanics } from '../game/roomMechanics';\nimport { installBossAttackTelegraphs } from '../game/bossAttackTelegraphs';\n",
)
replace_once(
    'artifacts/dungeon-rpg/src/components/GameSessionBridge.tsx',
    "    const disposeFusionEffects = initialEngine ? installRunFusionEffects(initialEngine) : () => {};\n",
    "    const disposeFusionEffects = initialEngine ? installRunFusionEffects(initialEngine) : () => {};\n    const disposeBossAttacks = initialEngine ? installBossAttackTelegraphs(initialEngine) : () => {};\n",
)
replace_once(
    'artifacts/dungeon-rpg/src/components/GameSessionBridge.tsx',
    "      disposeFusionEffects();\n      disposeGiftProgression();\n",
    "      disposeBossAttacks();\n      disposeFusionEffects();\n      disposeGiftProgression();\n",
)

replace_once(
    'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
    "import { buildFirelandsTheme } from './firelandsTheme3D';\n",
    "import { buildFirelandsTheme } from './firelandsTheme3D';\nimport { buildMeadowRoomTheme, preloadMeadowRoomTheme } from './meadowRoomsTheme3D';\n",
)
replace_once(
    'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
    "export const preloadKayKitRoomTheme = preloadBaseKayKitRoomTheme;\n",
    "export async function preloadKayKitRoomTheme(room: number) {\n  const tasks: Promise<unknown>[] = [preloadBaseKayKitRoomTheme(room)];\n  if (room >= 21 && room <= 30) tasks.push(preloadMeadowRoomTheme(room));\n  await Promise.allSettled(tasks);\n}\n",
)
replace_once(
    'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
    "  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));\n  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));\n",
    "  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));\n  if (room >= 21 && room <= 30) additions.push(buildMeadowRoomTheme(THREE, room));\n  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));\n",
)
replace_once(
    'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
    "  const baseReady = root.userData?.ready ?? Promise.resolve();\n  root.userData.ready = Promise.all([\n    baseReady,\n",
    "  const baseReady = Promise.resolve(root.userData?.ready ?? Promise.resolve()).catch(error => {\n    console.warn(`Base room theme partially unavailable in room ${room}`, error);\n  });\n  root.userData.ready = Promise.all([\n    baseReady,\n",
)

expanded = ROOT / 'artifacts/dungeon-rpg/src/game/expandedWorldRooms.ts'
expanded_text = expanded.read_text()
if 'Rock_3_R_Color1.gltf' not in expanded_text:
    raise SystemExit('room 30 missing-asset reference was not found')
expanded.write_text(expanded_text.replace('Rock_3_R_Color1.gltf', 'Rock_3_A_Color1.gltf', 1))

package_path = ROOT / 'artifacts/dungeon-rpg/package.json'
package = json.loads(package_path.read_text())
audit = 'node scripts/validate-boss-room-telegraphs-and-meadow.mjs'
for key in ['audit:rooms', 'audit:requested-pass']:
    current = package['scripts'][key]
    if audit not in current:
        package['scripts'][key] = f'{current} && {audit}'
package_path.write_text(json.dumps(package, indent=2, ensure_ascii=False) + '\n')

Path(__file__).unlink()
workflow = ROOT / '.github/workflows/temporary-room-boss-patch.yml'
if workflow.exists():
    workflow.unlink()
