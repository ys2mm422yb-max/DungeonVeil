import {
  ENEMY_REGISTRY,
  NORMAL_ENEMY_FAMILY_IDS,
  type EnemyFamilyId,
  type EnemyType,
} from './enemyRegistry';

export type CodexEnemyEntry = {
  id: EnemyFamilyId;
  familyId: EnemyFamilyId;
  enemyType: EnemyType;
  room: number;
  nameDe: string;
  nameEn: string;
  areaDe: string;
  areaEn: string;
  kindDe: string;
  kindEn: string;
  descriptionDe: string;
  descriptionEn: string;
  mechanicDe: string;
  mechanicEn: string;
  hintDe: string;
  hintEn: string;
};

export type CodexHuntEntry = {
  id: string;
  nameDe: string;
  nameEn: string;
  areaDe: string;
  areaEn: string;
  descriptionDe: string;
  descriptionEn: string;
  hintDe: string;
  hintEn: string;
};

export type CodexWardenEntry = Omit<CodexEnemyEntry, 'id' | 'familyId' | 'mechanicDe' | 'mechanicEn'> & {
  id: string;
  discoveryKey: string;
};

function roomBandLabel(minRoom: number, maxRoom: number, de: boolean): string {
  return de ? `Räume ${minRoom}–${maxRoom}` : `Rooms ${minRoom}–${maxRoom}`;
}

export const CODEX_BEASTS: readonly CodexEnemyEntry[] = NORMAL_ENEMY_FAMILY_IDS.map(id => {
  const definition = ENEMY_REGISTRY[id];
  return {
    id,
    familyId: id,
    enemyType: definition.presentationKey,
    room: definition.spawn.minRoom,
    nameDe: definition.name.de,
    nameEn: definition.name.en,
    areaDe: `${definition.region.toUpperCase()} · ${roomBandLabel(definition.spawn.minRoom, definition.spawn.maxRoom, true)}`,
    areaEn: `${definition.region.toUpperCase()} · ${roomBandLabel(definition.spawn.minRoom, definition.spawn.maxRoom, false)}`,
    kindDe: definition.kind.de,
    kindEn: definition.kind.en,
    descriptionDe: definition.description.de,
    descriptionEn: definition.description.en,
    mechanicDe: definition.mechanic.de,
    mechanicEn: definition.mechanic.en,
    hintDe: definition.hint.de,
    hintEn: definition.hint.en,
  };
});

export const CODEX_HUNTS: readonly CodexHuntEntry[] = [
  ['Aschenjäger', 'Ash Hunter'], ['Der Runenlose', 'The Runeless'], ['Nachtklaue', 'Night Claw'],
  ['Knochenrufer', 'Bone Caller'], ['Veyra die Verlorene', 'Veyra the Lost'], ['Schleierhetzer', 'Veil Hound'],
].map(([nameDe, nameEn]) => ({
  id: nameDe.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-'), nameDe, nameEn,
  areaDe: 'Seltene Jagd · variable Räume', areaEn: 'Rare hunt · variable rooms',
  descriptionDe: 'Ein verstärktes Jagdziel mit eigener Aura, mehr Leben und einer Chance auf ein Jagd-Relikt.',
  descriptionEn: 'An empowered hunt target with its own aura, more health and a chance to drop a hunt relic.',
  hintDe: 'Jagdzeichen erscheinen im Verlauf eines Runs.', hintEn: 'Hunt marks appear during a run.',
}));

const WARDENS = [
  [10, 'Wächter der Gruft', 'Tomb Guardian', 'Grabwächter', 'Tomb warden', 'Der erste Wächter prüft Bewegung und Abstand mit schweren, klar angekündigten Angriffen.', 'The first warden tests movement and spacing with heavy, clearly telegraphed attacks.'],
  [20, 'Schleiernekromant', 'Veil Necromancer', 'Fliegender Magier', 'Flying caster', 'Ein echter Magierkörper mit Luftphase, Runenangriffen und gefährlichen Zonen.', 'A true mage body with an airborne phase, rune attacks and dangerous zones.'],
  [30, 'Waldhauptmann', 'Forest Captain', 'Fernkämpfer', 'Ranger', 'Ein schneller Waldhauptmann, der Reichweite und seitliche Bewegung bestraft.', 'A fast forest captain who punishes poor range control and lateral movement.'],
  [40, 'Schattenkultist', 'Shadow Cultist', 'Assassine', 'Assassin', 'Ein aggressiver Kultist mit schnellen Nahkampffenstern und hohem Positionsdruck.', 'An aggressive cultist with fast melee windows and strong positional pressure.'],
  [50, 'Glutwächter', 'Ember Warden', 'Kapitelwächter', 'Chapter warden', 'Der Glutwächter verbindet Feuer, schwere Waffen und dichte Angriffskadenzen.', 'The Ember Warden combines fire, heavy weapons and dense attack cadences.'],
  [60, 'Aurel, Hüter der Goldenen Fraktur', 'Aurel, Keeper of the Golden Fracture', 'Frakturwächter', 'Fracture warden', 'Aurel bricht sichere Wege mit goldenen Spalten und verzögerten Einschlägen auf.', 'Aurel breaks safe routes with golden fractures and delayed impacts.'],
  [70, 'Der entfesselte Astronom', 'The Astronomer Unbound', 'Sternenmagier', 'Astral caster', 'Der Astronom zwingt mit rotierenden Sicherheitsbahnen und Sternenfall zu präziser Bewegung.', 'The Astronomer demands precise movement through rotating safe lanes and starfall.'],
  [80, 'Reliquiar-Leviathan', 'Reliquary Leviathan', 'Gezeitenkoloss', 'Tidal colossus', 'Der Leviathan überflutet das Feld und verbindet Strömungen mit Kettenangriffen.', 'The Leviathan floods the field and combines currents with chain attacks.'],
  [90, 'Der Aschenkönig', 'The Ashen King', 'Glutmonarch', 'Ember monarch', 'Der Aschenkönig verknüpft Glutbahnen, Kettenschläge und einstürzende Basaltzonen.', 'The Ashen King combines ember lanes, chain sweeps and collapsing basalt zones.'],
  [100, 'Der Schleierkern', 'The Veil Core', 'Finaler Nexus-Wächter', 'Final Nexus warden', 'Der Schleierkern vereint frühere Mechaniken in klar lesbaren finalen Angriffsmustern.', 'The Veil Core combines earlier mechanics into readable final attack patterns.'],
] as const;

export const CODEX_WARDENS: readonly CodexWardenEntry[] = WARDENS.map(([room, nameDe, nameEn, kindDe, kindEn, descriptionDe, descriptionEn]) => ({
  id: `warden-${room}`,
  discoveryKey: `1:${room}`,
  enemyType: 'boss',
  room,
  nameDe,
  nameEn,
  areaDe: `Bossraum ${room}`,
  areaEn: `Boss room ${room}`,
  kindDe,
  kindEn,
  descriptionDe,
  descriptionEn,
  hintDe: `Erreiche und bezwinge Raum ${room}.`,
  hintEn: `Reach and conquer room ${room}.`,
}));
