import fs from 'node:fs';

const root = process.cwd();

function file(path) {
  return `${root}/${path}`;
}

function replaceOnce(path, before, after) {
  const target = file(path);
  const source = fs.readFileSync(target, 'utf8');
  if (!source.includes(before)) throw new Error(`Missing patch anchor in ${path}: ${before.slice(0, 90)}`);
  fs.writeFileSync(target, source.replace(before, after));
}

const ENEMY_VISUAL = 'artifacts/dungeon-rpg/src/components/kaykitEnemy3D.ts';
const CANVAS = 'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx';
const ENEMY_AI = 'artifacts/dungeon-rpg/src/game/enemyRunAI.ts';
const RUN_ENGINE = 'artifacts/dungeon-rpg/src/game/runEngine.ts';
const EXPANDED = 'artifacts/dungeon-rpg/src/game/expandedWorldRooms.ts';

replaceOnce(
  ENEMY_VISUAL,
  "import { loadKayKitBossWeapon, loadKayKitFinalBossFocus } from './kaykitWeapons3D';",
  "import { loadKayKitBossWeapon, loadKayKitFinalBossFocus } from './kaykitWeapons3D';\nimport { enemyVisualProfile } from '../game/enemyRegionalIdentity';",
);

replaceOnce(
  ENEMY_VISUAL,
  "type EnemyRole = 'mage' | 'rogue' | 'warrior' | 'minion';",
  "type EnemyRole = 'mage' | 'rogue' | 'warrior' | 'minion' | 'ranger' | 'barbarian' | 'knight';",
);

replaceOnce(
  ENEMY_VISUAL,
  `  role: EnemyRole;\n  imported?: boolean;`,
  `  role: EnemyRole;\n  family: 'creature' | 'skeleton' | 'adventurer';\n  modelKey: string;\n  imported?: boolean;`,
);

replaceOnce(
  ENEMY_VISUAL,
  `        role: 'minion' as const,\n        imported: true,`,
  `        role: 'minion' as const,\n        family: 'creature' as const,\n        modelKey: type,\n        imported: true,`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    const skeletonModels = findKayKitModels(manifest, 'skeletons', /\\/characters\\/gltf\\/.*\\.glb$/i);\n    const animationModels = [`,
  `    const skeletonModels = findKayKitModels(manifest, 'skeletons', /\\/characters\\/gltf\\/.*\\.glb$/i);\n    const adventurerModels = findKayKitModels(manifest, 'adventurers', /\\/characters\\/gltf\\/.*\\.glb$/i);\n    const animationModels = [`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    const [animationGlb, characters, weaponEntries, bossWeapon, finalBossFocus] = await Promise.all([\n      Promise.all(animationModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),\n      Promise.all(skeletonModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),\n      Promise.all(Object.entries(weaponPaths).map(async ([key, path]) => {`,
  `    const [animationGlb, skeletonCharacters, adventurerCharacters, weaponEntries, bossWeapon, finalBossFocus] = await Promise.all([\n      Promise.all(animationModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),\n      Promise.all(skeletonModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),\n      Promise.all(adventurerModels.map(path => loader.loadAsync(modelUrl(manifest, path)))),\n      Promise.all(Object.entries(weaponPaths).map(async ([key, path]) => {`,
);

replaceOnce(
  ENEMY_VISUAL,
  `      prototypes: characters.map((gltf, index) => ({\n        scene: gltf.scene,\n        clips: [...(gltf.animations ?? []), ...sharedClips],\n        role: roleFromPath(skeletonModels[index]),\n      })),`,
  `      prototypes: [\n        ...skeletonCharacters.map((gltf, index) => ({\n          scene: gltf.scene,\n          clips: [...(gltf.animations ?? []), ...sharedClips],\n          role: roleFromPath(skeletonModels[index]),\n          family: 'skeleton' as const,\n          modelKey: skeletonModels[index].toLowerCase(),\n        })),\n        ...adventurerCharacters.map((gltf, index) => ({\n          scene: gltf.scene,\n          clips: [...(gltf.animations ?? []), ...sharedClips],\n          role: roleFromPath(adventurerModels[index]),\n          family: 'adventurer' as const,\n          modelKey: adventurerModels[index].toLowerCase(),\n        })),\n      ],`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const finalBoss = enemy.enemyType === 'boss' && roomFromEnemyId(enemy) === 50;\n  const importedPrototype = enemy.enemyType === 'boss' ? null : await importedWithinBudget(enemy.enemyType);\n  const role = preferredRole(enemy.enemyType);\n  const fallback = library.prototypes.find(entry => entry.role === role)\n    ?? library.prototypes[hashId(enemy.id) % library.prototypes.length];\n  const prototype = importedPrototype ?? fallback;`,
  `  const roomNumber = roomFromEnemyId(enemy);\n  const spawnIndex = Number(enemy.id.split('-').at(-1) ?? 0) || 0;\n  const profile = enemyVisualProfile(roomNumber, enemy.enemyType, spawnIndex);\n  const finalBoss = enemy.enemyType === 'boss' && roomNumber === 50;\n  const importedPrototype = profile.useImported ? await importedWithinBudget(enemy.enemyType) : null;\n  const role = profile.role;\n  const token = profile.modelToken?.toLowerCase();\n  const fallback = library.prototypes.find(entry =>\n    entry.family === profile.family && (!token || entry.modelKey.includes(token))\n  ) ?? library.prototypes.find(entry => entry.family === profile.family && entry.role === role)\n    ?? library.prototypes.find(entry => entry.role === role)\n    ?? library.prototypes[hashId(enemy.id) % library.prototypes.length];\n  const prototype = importedPrototype ?? fallback;`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    } else if (prototype.role === 'rogue') {`,
  `    } else if (prototype.role === 'rogue' || prototype.role === 'ranger') {`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    } else if (prototype.role === 'warrior') {`,
  `    } else if (prototype.role === 'warrior' || prototype.role === 'barbarian' || prototype.role === 'knight') {`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const attackClip = finalBoss\n    ? chooseClip(prototype.clips, [['cast'], ['spell'], ['magic'], ['ranged', 'attack'], ['attack']], ['bow', 'crossbow'])\n    : chooseClip(prototype.clips, [['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);`,
  `  const casterBoss = enemy.enemyType === 'boss' && (roomNumber === 20 || roomNumber === 50);\n  const rangerBoss = enemy.enemyType === 'boss' && roomNumber === 30;\n  const attackClip = casterBoss\n    ? chooseClip(prototype.clips, [['cast'], ['spell'], ['magic'], ['ranged', 'attack'], ['attack']], ['bow', 'crossbow'])\n    : rangerBoss\n      ? chooseClip(prototype.clips, [['bow', 'attack'], ['ranged', 'attack'], ['attack']], ['crossbow'])\n      : chooseClip(prototype.clips, [['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const movePlaybackBase = finalBoss\n    ? 1.08\n    : enemy.enemyType === 'boss'\n      ? 1.02\n      : importedVisual\n        ? 1.18\n        : prototype.role === 'rogue'\n          ? 1.42\n          : prototype.role === 'mage'\n            ? 1.34\n            : prototype.role === 'warrior'\n              ? 1.28\n              : 1.36;`,
  `  const roleMoveBase: Record<EnemyRole, number> = {\n    minion: 1.36, rogue: 1.42, ranger: 1.38, mage: 1.34, warrior: 1.28, barbarian: 1.25, knight: 1.22,\n  };\n  const movePlaybackBase = finalBoss ? 1.08 : enemy.enemyType === 'boss' ? 1.02 : importedVisual ? 1.18 : roleMoveBase[role];`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const attackDuration = finalBoss\n    ? 0.68\n    : enemy.enemyType === 'boss'\n      ? 0.72\n      : importedVisual\n        ? 0.34\n        : prototype.role === 'rogue'\n          ? 0.36\n          : prototype.role === 'mage'\n            ? 0.44\n            : prototype.role === 'warrior'\n              ? 0.48\n              : 0.4;`,
  `  const roleAttackDuration: Record<EnemyRole, number> = {\n    minion: 0.4, rogue: 0.36, ranger: 0.4, mage: 0.44, warrior: 0.48, barbarian: 0.5, knight: 0.52,\n  };\n  const attackDuration = finalBoss ? 0.68 : enemy.enemyType === 'boss' ? 0.72 : importedVisual ? 0.34 : roleAttackDuration[role];`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const roleScale = prototype.role === 'warrior' ? 1.06 : prototype.role === 'mage' ? 1.02 : prototype.role === 'rogue' ? 0.98 : 0.94;`,
  `  const roleScale = role === 'knight' ? 1.1 : role === 'barbarian' || role === 'warrior' ? 1.06 : role === 'mage' ? 1.02 : role === 'rogue' || role === 'ranger' ? 0.98 : 0.94;`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  burnGlows: any[];\n  frostGlows: any[];`,
  `  burnGlows: any[];\n  burnHalo: any;\n  frostGlows: any[];`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 3 : 6, 0.22);\n  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 3 : 7, 0.14);\n  [...burnGlows, ...frostGlows].forEach(mesh => statusRoot.add(mesh));\n\n  const frostHalo = new THREE.Mesh(`,
  `  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 5 : 8, 0.22);\n  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 5 : 8, 0.14);\n  [...burnGlows, ...frostGlows].forEach(mesh => statusRoot.add(mesh));\n\n  const burnHalo = new THREE.Mesh(\n    new THREE.TorusGeometry(0.38, 0.045, 6, IS_MOBILE ? 20 : 30),\n    new THREE.MeshBasicMaterial({ color: 0xff642c, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),\n  );\n  burnHalo.rotation.x = Math.PI / 2;\n  burnHalo.position.y = 0.1;\n  statusRoot.add(burnHalo);\n\n  const frostHalo = new THREE.Mesh(`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  const auraOuter = finalBoss ? 0x6f5cff : enemy.isElite ? 0xe7b84f : 0x8f4864;\n  const auraInner = finalBoss ? 0x62d9ff : enemy.isElite ? 0xffdd7d : 0x765bd3;`,
  `  const bossColors: Record<number, [number, number]> = {\n    10: [0xb49b76, 0xe8d8b4], 20: [0x8b5de0, 0xd5c2ff], 30: [0x6fa44e, 0xc9e78a], 40: [0x5f407f, 0xc578e8], 50: [0xff6a32, 0xffd071],\n  };\n  const [roomAuraOuter, roomAuraInner] = bossColors[roomNumber] ?? [0x8f4864, 0x765bd3];\n  const auraOuter = enemy.isElite ? 0xe7b84f : roomAuraOuter;\n  const auraInner = enemy.isElite ? 0xffdd7d : roomAuraInner;`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    burnGlows,\n    frostGlows,`,
  `    burnGlows,\n    burnHalo,\n    frostGlows,`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    role: prototype.role,`,
  `    role,`,
);

replaceOnce(
  ENEMY_VISUAL,
  `    glow.material.opacity = burning ? 0.26 + Math.sin(now * 0.012 + index) * 0.14 : 0;`,
  `    glow.material.opacity = burning ? 0.62 + Math.sin(now * 0.012 + index) * 0.22 : 0;`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  visual.frostGlows.forEach((glow, index) => {`,
  `  visual.burnHalo.material.opacity = burning ? 0.42 + Math.sin(now * 0.009) * 0.16 : 0;\n  visual.burnHalo.scale.setScalar(burning ? 0.94 + Math.sin(now * 0.006) * 0.1 : 1);\n  visual.frostGlows.forEach((glow, index) => {`,
);

replaceOnce(
  ENEMY_VISUAL,
  `  else if (frozen) setMeshTint(visual.scene, 0x46bfff, 0.045);\n  else setMeshTint(visual.scene, null, 0);`,
  `  else setMeshTint(visual.scene, null, 0);`,
);

replaceOnce(
  CANVAS,
  `        visual.root.position.set(mapX(state, enemy.x + enemy.width / 2), 0, mapZ(state, enemy.y + enemy.height / 2));\n        if (!enemy.isDead) visual.root.rotation.y = Math.atan2(state.player.x - enemy.x, state.player.y - enemy.y);\n        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);`,
  `        const nextX = mapX(state, enemy.x + enemy.width / 2);\n        const nextZ = mapZ(state, enemy.y + enemy.height / 2);\n        const moveX = nextX - visual.root.position.x;\n        const moveZ = nextZ - visual.root.position.z;\n        visual.root.position.set(nextX, 0, nextZ);\n        if (!enemy.isDead) {\n          const moving = Math.hypot(moveX, moveZ) > 0.0004;\n          const attackFacingX = mapX(state, state.player.x + state.player.width / 2) - nextX;\n          const attackFacingZ = mapZ(state, state.player.y + state.player.height / 2) - nextZ;\n          const targetAngle = enemy.state === 'attack' || !moving\n            ? Math.atan2(attackFacingX, attackFacingZ)\n            : Math.atan2(moveX, moveZ);\n          const angleDelta = Math.atan2(Math.sin(targetAngle - visual.root.rotation.y), Math.cos(targetAngle - visual.root.rotation.y));\n          visual.root.rotation.y += angleDelta * Math.min(1, delta * 12);\n        }\n        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);`,
);

replaceOnce(
  ENEMY_AI,
  `} from './roomCollision3D';`,
  `} from './roomCollision3D';\nimport { bossCombatProfile } from './enemyRegionalIdentity';`,
);

replaceOnce(
  ENEMY_AI,
  `  const movePressure = 1 + Math.min(0.34, (room - 1) * 0.019);\n  const attackPressure = 1 - Math.min(0.24, (room - 1) * 0.013);\n  const huntPressure = enemy.isHuntTarget ? 1.1 : 1;\n  const speed = enemy.speed * movePressure * huntPressure * dt / 1000;`,
  `  const movePressure = 1 + Math.min(0.34, (room - 1) * 0.019);\n  const attackPressure = 1 - Math.min(0.24, (room - 1) * 0.013);\n  const huntPressure = enemy.isHuntTarget ? 1.1 : 1;\n  const bossProfile = archetype === 'dragon' ? bossCombatProfile(room) : null;\n  const speed = enemy.speed * movePressure * huntPressure * (bossProfile?.moveScale ?? 1) * dt / 1000;`,
);

replaceOnce(
  ENEMY_AI,
  `  const baseAttackRange = archetype === 'dragon' ? 150 : archetype === 'guardian' ? 58 + enemy.width / 2 : archetype === 'skirmisher' ? 48 + enemy.width / 2 : 42 + enemy.width / 2;\n  const baseAttackDelay = Math.max(520, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 840 : archetype === 'skirmisher' ? 840 : 820) * attackPressure));`,
  `  const baseAttackRange = bossProfile?.attackRange ?? (archetype === 'guardian' ? 58 + enemy.width / 2 : archetype === 'skirmisher' ? 48 + enemy.width / 2 : 42 + enemy.width / 2);\n  const baseAttackDelay = Math.max(520, Math.round((bossProfile?.attackDelay ?? (archetype === 'guardian' ? 840 : archetype === 'skirmisher' ? 840 : 820)) * attackPressure));`,
);

replaceOnce(
  ENEMY_AI,
  `  if (archetype === 'guardian' || archetype === 'dragon') {\n    const phaseLength = archetype === 'dragon' ? 4600 : 4000;\n    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;\n    if (phase < phaseLength * 0.48) {\n      const ideal = archetype === 'dragon' ? 126 : 66;\n      const advance = dist > ideal ? 1.28 : dist < ideal * 0.62 ? -0.08 : 0.48;\n      return finish(plan(nx * advance * speed, ny * advance * speed, archetype === 'dragon' ? 150 : 58 + enemy.width / 2, archetype === 'dragon' ? 850 : 840));\n    }\n    if (phase < phaseLength * 0.7) {\n      const side = laneBias(enemy, time);\n      const move = normalizedMove(nx * (dist > 78 ? 0.72 : 0.34) + -ny * side * 0.34, ny * (dist > 78 ? 0.72 : 0.34) + nx * side * 0.34);\n      return finish(plan(move.x * speed * 0.92, move.y * speed * 0.92, archetype === 'dragon' ? 162 : 60 + enemy.width / 2, archetype === 'dragon' ? 930 : 900));\n    }\n    const pressure = dist > (archetype === 'dragon' ? 82 : 54) ? 1.52 : 0.24;\n    return finish(plan(nx * pressure * speed, ny * pressure * speed, archetype === 'dragon' ? 112 : 60 + enemy.width / 2, archetype === 'dragon' ? 650 : 680));\n  }`,
  `  if (archetype === 'dragon' && bossProfile) {\n    const phaseLength = bossProfile.pattern === 'assassin' ? 3100 : bossProfile.pattern === 'ranger' ? 3800 : 4600;\n    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;\n    const side = laneBias(enemy, time);\n    if (bossProfile.pattern === 'caster') {\n      const retreat = dist < 138 ? -0.72 : dist > 205 ? 0.62 : 0.08;\n      const move = normalizedMove(nx * retreat - ny * side * 0.38, ny * retreat + nx * side * 0.38);\n      return finish(plan(move.x * speed, move.y * speed, bossProfile.attackRange, bossProfile.attackDelay));\n    }\n    if (bossProfile.pattern === 'ranger') {\n      const toward = dist > 188 ? 0.86 : dist < 132 ? -0.45 : 0.12;\n      const move = normalizedMove(nx * toward - ny * side * 0.68, ny * toward + nx * side * 0.68);\n      return finish(plan(move.x * speed, move.y * speed, bossProfile.attackRange, bossProfile.attackDelay));\n    }\n    if (bossProfile.pattern === 'assassin') {\n      const dash = phase > phaseLength * 0.62 ? 1.82 : dist > 86 ? 0.9 : -0.18;\n      const move = normalizedMove(nx * dash - ny * side * (phase < 1200 ? 0.72 : 0.18), ny * dash + nx * side * (phase < 1200 ? 0.72 : 0.18));\n      return finish(plan(move.x * speed * Math.max(0.7, dash), move.y * speed * Math.max(0.7, dash), bossProfile.attackRange, bossProfile.attackDelay));\n    }\n    const ideal = bossProfile.pattern === 'warden' ? 112 : 68;\n    const advance = dist > ideal ? 1.28 : dist < ideal * 0.62 ? -0.12 : 0.46;\n    const strafe = phase > phaseLength * 0.48 && phase < phaseLength * 0.72 ? 0.42 * side : 0;\n    const move = normalizedMove(nx * advance - ny * strafe, ny * advance + nx * strafe);\n    return finish(plan(move.x * speed, move.y * speed, bossProfile.attackRange, bossProfile.attackDelay));\n  }\n\n  if (archetype === 'guardian') {\n    const phaseLength = 4000;\n    const phase = ((time - enemy.spawnTime) % phaseLength + phaseLength) % phaseLength;\n    if (phase < phaseLength * 0.48) {\n      const advance = dist > 66 ? 1.28 : dist < 41 ? -0.08 : 0.48;\n      return finish(plan(nx * advance * speed, ny * advance * speed, 58 + enemy.width / 2, 840));\n    }\n    if (phase < phaseLength * 0.7) {\n      const side = laneBias(enemy, time);\n      const move = normalizedMove(nx * (dist > 78 ? 0.72 : 0.34) + -ny * side * 0.34, ny * (dist > 78 ? 0.72 : 0.34) + nx * side * 0.34);\n      return finish(plan(move.x * speed * 0.92, move.y * speed * 0.92, 60 + enemy.width / 2, 900));\n    }\n    const pressure = dist > 54 ? 1.52 : 0.24;\n    return finish(plan(nx * pressure * speed, ny * pressure * speed, 60 + enemy.width / 2, 680));\n  }`,
);

replaceOnce(
  RUN_ENGINE,
  `import { getEncounterPlan } from './encounterPlan';`,
  `import { getEncounterPlan } from './encounterPlan';\nimport { bossCombatProfile } from './enemyRegionalIdentity';`,
);

replaceOnce(
  RUN_ENGINE,
  `  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {\n    if (archetype === 'skirmisher') return 165;\n    if (archetype === 'guardian') return 270;\n    if (archetype === 'dragon') return this.state.floor === 50 ? 480 : 410;\n    return 185;\n  }`,
  `  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {\n    if (archetype === 'skirmisher') return 165;\n    if (archetype === 'guardian') return 270;\n    if (archetype === 'dragon') {\n      const pattern = bossCombatProfile(this.state.floor).pattern;\n      return pattern === 'assassin' ? 230 : pattern === 'ranger' ? 320 : pattern === 'caster' ? 460 : pattern === 'warden' ? 420 : 340;\n    }\n    return 185;\n  }`,
);

replaceOnce(
  RUN_ENGINE,
  `    if (windup.archetype === 'dragon') {\n      const ex = enemy.x + enemy.width / 2;\n      const ey = enemy.y + enemy.height / 2;\n      const targetX = p.x + 16;\n      const targetY = p.y + 16;\n      const angle = Math.atan2(targetY - ey, targetX - ex);\n      const color = this.state.floor === 50 ? '#765cff' : '#ff633d';\n      const element = this.state.floor === 50 ? 'arcane' as const : 'fire' as const;\n      if (this.shotPathBlocked(ex, ey, targetX, targetY, 0.08)) return;\n      this.addShotEffect(\`boss-shot-\${time}-\${windup.index}\`, ex, ey, targetX, targetY, angle, color, element, 7);\n      this.state.particles.push(...makeHitSpark(targetX, targetY, color, 10));\n    }`,
  `    if (windup.archetype === 'dragon') {\n      const profile = bossCombatProfile(this.state.floor);\n      const ex = enemy.x + enemy.width / 2;\n      const ey = enemy.y + enemy.height / 2;\n      const targetX = p.x + 16;\n      const targetY = p.y + 16;\n      const angle = Math.atan2(targetY - ey, targetX - ex);\n      const color = profile.element === 'fire' ? '#ff633d' : profile.element === 'arcane' ? '#9f72ff' : '#e8c77a';\n      const ranged = profile.pattern === 'caster' || profile.pattern === 'ranger' || profile.pattern === 'warden';\n      if (ranged) {\n        if (this.shotPathBlocked(ex, ey, targetX, targetY, 0.08)) return;\n        this.addShotEffect(\`boss-shot-\${this.state.floor}-\${time}-\${windup.index}\`, ex, ey, targetX, targetY, angle, color, profile.element, profile.pattern === 'ranger' ? 5 : 8);\n        this.state.particles.push(...makeHitSpark(targetX, targetY, color, profile.pattern === 'warden' ? 14 : 10));\n      } else if (dist > windup.range * 1.18) return;\n    }`,
);

replaceOnce(
  RUN_ENGINE,
  `      const frostFactor = enemy.frostUntil && time < enemy.frostUntil ? 1 - (enemy.frostSlow ?? 0) : 1;\n      if (enemy.state === 'chase' || enemyArchetype(enemy.enemyType) === 'dragon') this.moveEntity(enemy, plan.dx * frostFactor, plan.dy * frostFactor);\n      this.checkEnemyStuck(enemy, time, dist, plan.attackRange);`,
  `      const frostFactor = enemy.frostUntil && time < enemy.frostUntil ? 1 - (enemy.frostSlow ?? 0) : 1;\n      const beforeX = enemy.x;\n      const beforeY = enemy.y;\n      if (enemy.state === 'chase' || enemyArchetype(enemy.enemyType) === 'dragon') this.moveEntity(enemy, plan.dx * frostFactor, plan.dy * frostFactor);\n      enemy.vx = enemy.x - beforeX;\n      enemy.vy = enemy.y - beforeY;\n      this.checkEnemyStuck(enemy, time, dist, plan.attackRange);`,
);

// Darkwood rooms must include at least one forest anchor without restoring a shared frame.
const darkwoodForestFixes = [
  [
    `    s(\`${H}/post_lantern.gltf\`, 0, 4.8, 0, 1.18),\n  ],`,
    `    s(\`${H}/post_lantern.gltf\`, 0, 4.8, 0, 1.18), s(\`${F}/Tree_1_B_Color1.gltf\`, -8.0, 4.0, 0.1, 1.1, [1.8, 1.8]),\n  ],`,
  ],
  [
    `    s(\`${H}/candle_triple.gltf\`, -3.0, -1.0, 0, 1.2), s(\`${H}/candle_triple.gltf\`, 3.0, -1.0, 0, 1.2),\n  ],`,
    `    s(\`${H}/candle_triple.gltf\`, -3.0, -1.0, 0, 1.2), s(\`${H}/candle_triple.gltf\`, 3.0, -1.0, 0, 1.2), s(\`${F}/Tree_2_C_Color1.gltf\`, -8.0, 3.8, 0.1, 1.1, [1.8, 1.8]),\n  ],`,
  ],
  [
    `    s(\`${H}/lantern_standing.gltf\`, 0, -4.2, 0, 1.28),\n  ],`,
    `    s(\`${H}/lantern_standing.gltf\`, 0, -4.2, 0, 1.28), s(\`${F}/Tree_1_C_Color1.gltf\`, 8.0, 4.0, -0.1, 1.08, [1.8, 1.8]),\n  ],`,
  ],
  [
    `    s(\`${H}/gravemarker_A.gltf\`, -6.8, -3.4, 0.1, 1.0, [1.0, 1.2]), s(\`${H}/gravemarker_A.gltf\`, 6.8, -3.4, -0.1, 1.0, [1.0, 1.2]),\n  ],`,
    `    s(\`${H}/gravemarker_A.gltf\`, -6.8, -3.4, 0.1, 1.0, [1.0, 1.2]), s(\`${H}/gravemarker_A.gltf\`, 6.8, -3.4, -0.1, 1.0, [1.0, 1.2]), s(\`${F}/Tree_2_A_Color1.gltf\`, 8.0, 3.8, -0.1, 1.08, [1.8, 1.8]),\n  ],`,
  ],
  [
    `    s(\`${H}/post_lantern.gltf\`, 5.6, 4.6, 0, 1.22),\n  ],`,
    `    s(\`${H}/post_lantern.gltf\`, 5.6, 4.6, 0, 1.22), s(\`${F}/Tree_1_A_Color1.gltf\`, -8.0, 3.8, 0.1, 1.1, [1.8, 1.8]),\n  ],`,
  ],
];
for (const [before, after] of darkwoodForestFixes) replaceOnce(EXPANDED, before, after);

console.log('Blocks 5–8 source pass applied successfully.');
