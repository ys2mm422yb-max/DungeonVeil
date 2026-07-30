export const ENEMY_FAMILY_IDS = [
  'slime',
  'goblin',
  'skeleton',
  'orc',
  'spider',
  'vampire',
  'demon',
  'golem',
  'boss',
] as const;

export type EnemyType = (typeof ENEMY_FAMILY_IDS)[number];
export type EnemyCombatRole = 'swarm' | 'skirmisher' | 'ranged' | 'bruiser' | 'ambusher' | 'drain' | 'caster' | 'tank' | 'boss';
export type EnemyAttackPattern = 'contact' | 'lunge' | 'projectile' | 'slam' | 'web' | 'drain' | 'fire' | 'quake' | 'boss-cycle';
export type EnemyTelegraph = 'body-flash' | 'line' | 'cone' | 'circle' | 'ground-rune' | 'multi-stage';

export type LocalizedEnemyText = {
  de: string;
  en: string;
};

export type EnemySpawnProfile = {
  minRoom: number;
  maxRoom: number;
  baseWeight: number;
  maxConsecutiveRooms: number;
  bossOnly?: boolean;
};

export type EnemyFamilyDefinition = {
  id: EnemyType;
  role: EnemyCombatRole;
  attackPattern: EnemyAttackPattern;
  telegraph: EnemyTelegraph;
  presentationKey: EnemyType;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    size: number;
    xp: number;
    color: string;
  };
  spawn: EnemySpawnProfile;
  name: LocalizedEnemyText;
  description: LocalizedEnemyText;
  mechanic: LocalizedEnemyText;
};

export const ENEMY_REGISTRY = {
  slime: {
    id: 'slime', role: 'swarm', attackPattern: 'contact', telegraph: 'body-flash', presentationKey: 'slime',
    stats: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, xp: 18, color: '#43c968' },
    spawn: { minRoom: 1, maxRoom: 34, baseWeight: 10, maxConsecutiveRooms: 2 },
    name: { de: 'Schleim', en: 'Slime' },
    description: { de: 'Eine zähe Kreatur, die Räume in Gruppen überzieht.', en: 'A viscous creature that floods rooms in groups.' },
    mechanic: { de: 'Langsam, aber als Schwarm gefährlich.', en: 'Slow, but dangerous in a swarm.' },
  },
  goblin: {
    id: 'goblin', role: 'skirmisher', attackPattern: 'lunge', telegraph: 'line', presentationKey: 'goblin',
    stats: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, xp: 24, color: '#89a94b' },
    spawn: { minRoom: 2, maxRoom: 44, baseWeight: 9, maxConsecutiveRooms: 2 },
    name: { de: 'Goblin-Plänkler', en: 'Goblin Skirmisher' },
    description: { de: 'Ein wendiger Räuber, der Lücken in der Verteidigung sucht.', en: 'An agile raider that looks for gaps in the defence.' },
    mechanic: { de: 'Kurze Vorstöße mit klarer Linienwarnung.', en: 'Short lunges with a clear line warning.' },
  },
  skeleton: {
    id: 'skeleton', role: 'ranged', attackPattern: 'projectile', telegraph: 'line', presentationKey: 'skeleton',
    stats: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, xp: 30, color: '#d1ccb0' },
    spawn: { minRoom: 8, maxRoom: 58, baseWeight: 8, maxConsecutiveRooms: 2 },
    name: { de: 'Skelettschütze', en: 'Skeleton Archer' },
    description: { de: 'Ein rastloser Fernkämpfer aus den alten Hallen.', en: 'A restless ranged fighter from the old halls.' },
    mechanic: { de: 'Hält Abstand und kündigt Schüsse als Linie an.', en: 'Keeps its distance and telegraphs shots with a line.' },
  },
  orc: {
    id: 'orc', role: 'bruiser', attackPattern: 'slam', telegraph: 'cone', presentationKey: 'orc',
    stats: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, xp: 42, color: '#627c38' },
    spawn: { minRoom: 15, maxRoom: 70, baseWeight: 7, maxConsecutiveRooms: 2 },
    name: { de: 'Orkbrecher', en: 'Orc Breaker' },
    description: { de: 'Ein schwerer Nahkämpfer, der den direkten Weg erzwingt.', en: 'A heavy melee fighter that forces the direct route.' },
    mechanic: { de: 'Breiter Hieb mit kurzer Kegelwarnung.', en: 'Wide strike with a short cone warning.' },
  },
  spider: {
    id: 'spider', role: 'ambusher', attackPattern: 'web', telegraph: 'ground-rune', presentationKey: 'spider',
    stats: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, xp: 28, color: '#342d42' },
    spawn: { minRoom: 18, maxRoom: 82, baseWeight: 7, maxConsecutiveRooms: 2 },
    name: { de: 'Schleierweberin', en: 'Veil Weaver' },
    description: { de: 'Eine schnelle Jägerin, die Laufwege mit Netzen kontrolliert.', en: 'A fast hunter that controls routes with webs.' },
    mechanic: { de: 'Hohe Geschwindigkeit und verlangsamende Bodenzonen.', en: 'High speed and slowing ground zones.' },
  },
  vampire: {
    id: 'vampire', role: 'drain', attackPattern: 'drain', telegraph: 'circle', presentationKey: 'vampire',
    stats: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, xp: 48, color: '#9e304b' },
    spawn: { minRoom: 30, maxRoom: 92, baseWeight: 6, maxConsecutiveRooms: 1 },
    name: { de: 'Blutzehrer', en: 'Blood Drainer' },
    description: { de: 'Ein gleitender Jäger, der verlorene Lebenskraft zurückholt.', en: 'A gliding hunter that restores lost vitality.' },
    mechanic: { de: 'Kreisförmig angekündigter Lebensentzug.', en: 'Life drain announced by a circular telegraph.' },
  },
  demon: {
    id: 'demon', role: 'caster', attackPattern: 'fire', telegraph: 'ground-rune', presentationKey: 'demon',
    stats: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, xp: 58, color: '#c53827' },
    spawn: { minRoom: 42, maxRoom: 100, baseWeight: 6, maxConsecutiveRooms: 1 },
    name: { de: 'Glutdämon', en: 'Ember Demon' },
    description: { de: 'Ein aggressiver Zauberwirker aus den tiefen Räumen.', en: 'An aggressive spellcaster from the deep rooms.' },
    mechanic: { de: 'Feuerzonen zwingen zu rechtzeitigem Positionswechsel.', en: 'Fire zones force timely repositioning.' },
  },
  golem: {
    id: 'golem', role: 'tank', attackPattern: 'quake', telegraph: 'circle', presentationKey: 'golem',
    stats: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, xp: 70, color: '#696985' },
    spawn: { minRoom: 55, maxRoom: 100, baseWeight: 5, maxConsecutiveRooms: 1 },
    name: { de: 'Runengolem', en: 'Rune Golem' },
    description: { de: 'Ein langsamer Wächter mit massiver Panzerung.', en: 'A slow guardian with massive armour.' },
    mechanic: { de: 'Hohe Verteidigung und großflächiges Beben.', en: 'High defence and a large-area quake.' },
  },
  boss: {
    id: 'boss', role: 'boss', attackPattern: 'boss-cycle', telegraph: 'multi-stage', presentationKey: 'boss',
    stats: { hp: 520, attack: 24, defense: 7, speed: 54, size: 74, xp: 180, color: '#ff493a' },
    spawn: { minRoom: 10, maxRoom: 100, baseWeight: 0, maxConsecutiveRooms: 0, bossOnly: true },
    name: { de: 'Schleierfürst', en: 'Veil Lord' },
    description: { de: 'Ein Raumherrscher mit wechselnden Angriffsmustern.', en: 'A room ruler with rotating attack patterns.' },
    mechanic: { de: 'Mehrstufige Bossfolge mit Linien-, Kegel- und Flächenwarnungen.', en: 'Multi-stage boss cycle with line, cone and area warnings.' },
  },
} as const satisfies Record<EnemyType, EnemyFamilyDefinition>;

export function enemyDefinition(type: EnemyType): EnemyFamilyDefinition {
  return ENEMY_REGISTRY[type];
}

export function enemyStats(type: EnemyType): EnemyFamilyDefinition['stats'] {
  return ENEMY_REGISTRY[type].stats;
}

export function isEnemyType(value: string): value is EnemyType {
  return Object.prototype.hasOwnProperty.call(ENEMY_REGISTRY, value);
}

export function enemyFamiliesForRoom(room: number, includeBoss = false): EnemyFamilyDefinition[] {
  const normalizedRoom = Math.max(1, Math.min(100, Math.floor(room)));
  return ENEMY_FAMILY_IDS
    .map(id => ENEMY_REGISTRY[id])
    .filter(definition => {
      if ('bossOnly' in definition.spawn && definition.spawn.bossOnly && !includeBoss) return false;
      return normalizedRoom >= definition.spawn.minRoom && normalizedRoom <= definition.spawn.maxRoom;
    });
}

export function deterministicEnemyFamilyForRoom(room: number, slot: number, recent: readonly EnemyType[] = []): EnemyType {
  const candidates = enemyFamiliesForRoom(room, false);
  if (candidates.length === 0) return 'slime';

  const eligible = candidates.filter(candidate => {
    const limit = candidate.spawn.maxConsecutiveRooms;
    if (limit <= 0 || recent.length < limit) return true;
    return recent.slice(-limit).some(type => type !== candidate.id);
  });
  const pool = eligible.length > 0 ? eligible : candidates;
  const weighted = pool.flatMap(candidate => Array.from({ length: Math.max(1, candidate.spawn.baseWeight) }, () => candidate.id));
  const seed = (Math.max(1, Math.floor(room)) * 31 + Math.max(0, Math.floor(slot)) * 17) >>> 0;
  return weighted[seed % weighted.length];
}
