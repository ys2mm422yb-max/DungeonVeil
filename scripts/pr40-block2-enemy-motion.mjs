import fs from 'node:fs';

const ROOT = 'artifacts/dungeon-rpg/src';
const files = {
  visuals: `${ROOT}/components/kaykitEnemy3D.ts`,
  engine: `${ROOT}/game/runEngine.ts`,
  ai: `${ROOT}/game/enemyRunAI.ts`,
};

const read = path => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceOne(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: erwartete genau 1 Fundstelle, gefunden ${count}`);
  return content.replace(before, after);
}

let visuals = read(files.visuals);
visuals = replaceOne(
  visuals,
  `  bossAura: any;\n  bossCore: any;\n};`,
  `  bossAura: any;\n  bossCore: any;\n  imported: boolean;\n  role: EnemyRole;\n  movePlaybackBase: number;\n  attackDuration: number;\n};`,
  'Visual-Metadaten',
);

visuals = replaceOne(
  visuals,
  `  idle?.reset().play();\n  if (move) move.timeScale = finalBoss ? 1.08 : enemy.enemyType === 'boss' ? 0.98 : prototype.imported ? 1.15 : 1.06;\n  if (attack) {\n    attack.setLoop(THREE.LoopOnce, 1);\n    attack.clampWhenFinished = false;\n    attack.timeScale = finalBoss ? 1.14 : enemy.enemyType === 'boss' ? 0.98 : prototype.imported ? 1.18 : 1.12;\n  }`,
  `  const importedVisual = Boolean(prototype.imported);\n  const movePlaybackBase = finalBoss\n    ? 1.08\n    : enemy.enemyType === 'boss'\n      ? 1.02\n      : importedVisual\n        ? 1.18\n        : prototype.role === 'rogue'\n          ? 1.42\n          : prototype.role === 'mage'\n            ? 1.34\n            : prototype.role === 'warrior'\n              ? 1.28\n              : 1.36;\n  const attackDuration = finalBoss\n    ? 0.68\n    : enemy.enemyType === 'boss'\n      ? 0.72\n      : importedVisual\n        ? 0.34\n        : prototype.role === 'rogue'\n          ? 0.36\n          : prototype.role === 'mage'\n            ? 0.44\n            : prototype.role === 'warrior'\n              ? 0.48\n              : 0.4;\n\n  idle?.reset().play();\n  if (move) move.timeScale = movePlaybackBase;\n  if (attack) {\n    attack.setLoop(THREE.LoopOnce, 1);\n    attack.clampWhenFinished = false;\n    const clipDuration = Math.max(0.12, attackClip?.duration ?? 0.5);\n    attack.timeScale = Math.min(3.1, Math.max(0.85, clipDuration / attackDuration));\n  }`,
  'Animationsgeschwindigkeit und Angriffsdauer',
);

visuals = replaceOne(
  visuals,
  `    bossAura,\n    bossCore,\n  };`,
  `    bossAura,\n    bossCore,\n    imported: importedVisual,\n    role: prototype.role,\n    movePlaybackBase,\n    attackDuration,\n  };`,
  'Visual-Metadaten zurueckgeben',
);

visuals = replaceOne(
  visuals,
  `    const duration = visual.attack?.getClip?.()?.duration ?? 0.5;\n    visual.attackRemaining = Math.max(0.22, duration / (enemy.enemyType === 'boss' ? 0.98 : 1.12));\n    transition(visual, visual.attack, 0.045);`,
  `    visual.attackRemaining = visual.attackDuration;\n    transition(visual, visual.attack, 0.03);`,
  'Angriffsanimation synchronisieren',
);

visuals = replaceOne(
  visuals,
  `  if (visual.move) {\n    const baseMoveSpeed = enemy.enemyType === 'boss' ? 0.92 : 1.06;\n    visual.move.timeScale = frozen\n      ? Math.max(enemy.enemyType === 'boss' ? 0.48 : 0.5, baseMoveSpeed * (1 - (enemy.frostSlow ?? 0)))\n      : baseMoveSpeed;\n  }`,
  `  if (visual.move) {\n    const referenceSpeed = visual.imported ? 72 : visual.role === 'warrior' ? 56 : 68;\n    const speedFactor = enemy.enemyType === 'boss' ? 1 : Math.max(0.82, Math.min(1.22, enemy.speed / referenceSpeed));\n    const baseMoveSpeed = visual.movePlaybackBase * speedFactor;\n    visual.move.timeScale = frozen\n      ? Math.max(enemy.enemyType === 'boss' ? 0.5 : 0.56, baseMoveSpeed * (1 - (enemy.frostSlow ?? 0)))\n      : baseMoveSpeed;\n  }`,
  'Laufanimation an echte Bewegung koppeln',
);
write(files.visuals, visuals);

let engine = read(files.engine);
engine = replaceOne(engine, `  skeleton: { hp: 52, attack: 8, defense: 2, speed: 62, size: 26, xp: 30, color: '#d1ccb0' },`, `  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, xp: 30, color: '#d1ccb0' },`, 'Skelett-Bewegung');
engine = replaceOne(engine, `  orc: { hp: 92, attack: 12, defense: 4, speed: 48, size: 30, xp: 42, color: '#627c38' },`, `  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, xp: 42, color: '#627c38' },`, 'Krieger-Bewegung');
engine = replaceOne(engine, `  golem: { hp: 190, attack: 20, defense: 9, speed: 35, size: 34, xp: 70, color: '#696985' },`, `  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, xp: 70, color: '#696985' },`, 'Schwerer Gegner Bewegung');
engine = replaceOne(
  engine,
  `  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {\n    if (archetype === 'skirmisher') return 165;\n    if (archetype === 'guardian') return 340;\n    if (archetype === 'dragon') return this.state.floor === 20 ? 480 : 410;\n    return 225;\n  }`,
  `  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {\n    if (archetype === 'skirmisher') return 165;\n    if (archetype === 'guardian') return 270;\n    if (archetype === 'dragon') return this.state.floor === 20 ? 480 : 410;\n    return 185;\n  }`,
  'Trefferzeitpunkt der Humanoiden',
);
write(files.engine, engine);

let ai = read(files.ai);
ai = replaceOne(
  ai,
  `  const baseAttackDelay = Math.max(520, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 900 : archetype === 'skirmisher' ? 840 : 920) * attackPressure));`,
  `  const baseAttackDelay = Math.max(520, Math.round((archetype === 'dragon' ? 850 : archetype === 'guardian' ? 840 : archetype === 'skirmisher' ? 840 : 820) * attackPressure));`,
  'Grund-Angriffstakt',
);
ai = replaceOne(ai, `archetype === 'dragon' ? 850 : 900`, `archetype === 'dragon' ? 850 : 840`, 'Guardian-Vorstoss');
ai = replaceOne(ai, `archetype === 'dragon' ? 930 : 960`, `archetype === 'dragon' ? 930 : 900`, 'Guardian-Seitenphase');
ai = replaceOne(ai, `archetype === 'dragon' ? 650 : 720`, `archetype === 'dragon' ? 650 : 680`, 'Guardian-Druckphase');
ai = replaceOne(ai, `42 + enemy.width / 2, 920`, `42 + enemy.width / 2, 820`, 'Skelett-Angriffstakt');
write(files.ai, ai);

const checks = [
  [files.visuals, 'attackDuration: number;'],
  [files.visuals, "prototype.role === 'rogue'"],
  [files.visuals, 'visual.attackRemaining = visual.attackDuration;'],
  [files.visuals, 'enemy.speed / referenceSpeed'],
  [files.engine, 'speed: 72'],
  [files.engine, "if (archetype === 'guardian') return 270;"],
  [files.ai, "archetype === 'guardian' ? 840"],
  [files.ai, '42 + enemy.width / 2, 820'],
];
for (const [file, marker] of checks) {
  if (!read(file).includes(marker)) throw new Error(`Audit fehlgeschlagen: ${marker} fehlt in ${file}`);
}

console.log('Block 2: Gegnerbewegung und Angriffsanimationen geschrieben und statisch geprueft.');
