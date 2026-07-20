import type { EnemyType } from './entities';

export type CodexEnemyEntry = {
  id: string;
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

export type CodexWardenEntry = CodexEnemyEntry & { discoveryKey: string };

export const CODEX_BEASTS: readonly CodexEnemyEntry[] = [
  {
    id: 'goblin', enemyType: 'goblin', room: 1, nameDe: 'Schleier-Ratte', nameEn: 'Veil Rat',
    areaDe: 'Frühe Verliese · ab Raum 1', areaEn: 'Early dungeon · from room 1', kindDe: 'Flinke Bestie', kindEn: 'Agile beast',
    descriptionDe: 'Kleine, schnelle Kreatur, die Lücken sucht und den Spieler aus ungünstigen Winkeln bedrängt.',
    descriptionEn: 'A small, fast creature that searches for openings and pressures the player from awkward angles.',
    hintDe: 'Schon in den ersten Räumen anzutreffen.', hintEn: 'Found in the first rooms.',
  },
  {
    id: 'skeleton', enemyType: 'skeleton', room: 1, nameDe: 'Grabwache', nameEn: 'Grave Guard',
    areaDe: 'Verliese und Ruinen', areaEn: 'Dungeons and ruins', kindDe: 'Untoter Kämpfer', kindEn: 'Undead fighter',
    descriptionDe: 'Die alte Grabwache erscheint je nach Gebiet als Nahkämpfer, Schurke, Magier oder Fernkämpfer.',
    descriptionEn: 'This ancient guard appears as a melee fighter, rogue, mage or ranger depending on the region.',
    hintDe: 'In Raum 1 beginnt ihre Wache.', hintEn: 'Its watch begins in room 1.',
  },
  {
    id: 'spider', enemyType: 'spider', room: 2, nameDe: 'Schleierspinne', nameEn: 'Veil Spider',
    areaDe: 'Verliese bis Dunkelwald', areaEn: 'Dungeon to Darkwood', kindDe: 'Jäger', kindEn: 'Hunter',
    descriptionDe: 'Breite, schwer einzuschätzende Kreatur, die seitlich Druck aufbaut und enge Wege gefährlich macht.',
    descriptionEn: 'A broad, difficult-to-read creature that creates side pressure and makes narrow lanes dangerous.',
    hintDe: 'Ab Raum 2 zwischen Ratten und Grabwachen.', hintEn: 'From room 2 among rats and grave guards.',
  },
  {
    id: 'vampire', enemyType: 'vampire', room: 3, nameDe: 'Nachtfledermaus', nameEn: 'Night Bat',
    areaDe: 'Ruinen und Dunkelwald', areaEn: 'Ruins and Darkwood', kindDe: 'Fliegender Magier', kindEn: 'Flying caster',
    descriptionDe: 'Wechselt regional zwischen Fledermaus und Schleiermagier und greift bevorzugt aus sicherer Entfernung an.',
    descriptionEn: 'Changes between bat and Veil mage by region and prefers to attack from a safe distance.',
    hintDe: 'Erstmals ab Raum 3.', hintEn: 'First seen from room 3.',
  },
  {
    id: 'orc', enemyType: 'orc', room: 4, nameDe: 'Schleierbrecher', nameEn: 'Veil Breaker',
    areaDe: 'Verliese bis Glutfestung', areaEn: 'Dungeon to Ember Fortress', kindDe: 'Schwerer Krieger', kindEn: 'Heavy warrior',
    descriptionDe: 'Ein robuster Frontkämpfer, dessen Körper und Rolle sich mit dem Gebiet vom Grabkrieger zum Barbaren wandeln.',
    descriptionEn: 'A durable frontliner whose body and role evolve from grave warrior to barbarian across regions.',
    hintDe: 'Ab Raum 4 in stärkeren Gruppen.', hintEn: 'From room 4 in stronger groups.',
  },
  {
    id: 'demon', enemyType: 'demon', room: 5, nameDe: 'Schleierschlange', nameEn: 'Veil Serpent',
    areaDe: 'Tiefe Verliese und Festung', areaEn: 'Deep dungeon and fortress', kindDe: 'Giftige Bestie', kindEn: 'Venomous beast',
    descriptionDe: 'Eine niedrige, aggressive Schlange, die zwischen größeren Gegnern leicht übersehen wird.',
    descriptionEn: 'A low, aggressive serpent that is easy to miss between larger enemies.',
    hintDe: 'Ab Raum 5 im Gefolge stärkerer Gegner.', hintEn: 'From room 5 alongside stronger enemies.',
  },
  {
    id: 'golem', enemyType: 'golem', room: 8, nameDe: 'Steinwächter', nameEn: 'Stone Warden',
    areaDe: 'Tiefe, Ruinen und Festung', areaEn: 'Depths, ruins and fortress', kindDe: 'Gepanzerter Koloss', kindEn: 'Armored colossus',
    descriptionDe: 'Langsamer, schwerer Gegner mit massiver Silhouette und hoher Widerstandskraft.',
    descriptionEn: 'A slow, heavy enemy with a massive silhouette and high durability.',
    hintDe: 'Erstmals ab Raum 8.', hintEn: 'First seen from room 8.',
  },
  {
    id: 'slime', enemyType: 'slime', room: 11, nameDe: 'Schleim des Schleiers', nameEn: 'Veil Slime',
    areaDe: 'Ab Raum 11 und in späteren Regionen', areaEn: 'From room 11 and in later regions', kindDe: 'Formlose Kreatur', kindEn: 'Amorphous creature',
    descriptionDe: 'Eine formlose Bestie mit klarer, niedriger Silhouette, die in späteren Gruppen als bewegliche Lücke dient.',
    descriptionEn: 'An amorphous beast with a clear low silhouette that acts as mobile space pressure in later groups.',
    hintDe: 'Erstmals nach dem ersten Wächter.', hintEn: 'First seen after the first warden.',
  },
] as const;

export const CODEX_HUNTS: readonly CodexHuntEntry[] = [
  ['Aschenjäger', "Ash Hunter"], ['Der Runenlose', 'The Runeless'], ['Nachtklaue', 'Night Claw'],
  ['Knochenrufer', 'Bone Caller'], ['Veyra die Verlorene', 'Veyra the Lost'], ['Schleierhetzer', 'Veil Hound'],
].map(([nameDe, nameEn]) => ({
  id: nameDe.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-'), nameDe, nameEn,
  areaDe: 'Seltene Jagd · variable Räume', areaEn: 'Rare hunt · variable rooms',
  descriptionDe: 'Ein verstärktes Jagdziel mit eigener Aura, mehr Leben und einer Chance auf ein Jagd-Relikt.',
  descriptionEn: 'An empowered hunt target with its own aura, more health and a chance to drop a hunt relic.',
  hintDe: 'Jagdzeichen erscheinen im Verlauf eines Runs.', hintEn: 'Hunt marks appear during a run.',
}));

export const CODEX_WARDENS: readonly CodexWardenEntry[] = [
  {
    id: 'warden-10', discoveryKey: '1:10', enemyType: 'boss', room: 10,
    nameDe: 'Wächter der Gruft', nameEn: 'Tomb Guardian', areaDe: 'Bossraum 10', areaEn: 'Boss room 10', kindDe: 'Grabwächter', kindEn: 'Tomb warden',
    descriptionDe: 'Der erste Wächter prüft Bewegung und Abstand mit schweren, klar angekündigten Angriffen.',
    descriptionEn: 'The first warden tests movement and spacing with heavy, clearly telegraphed attacks.',
    hintDe: 'Erreiche Raum 10.', hintEn: 'Reach room 10.',
  },
  {
    id: 'warden-20', discoveryKey: '1:20', enemyType: 'boss', room: 20,
    nameDe: 'Schleiernekromant', nameEn: 'Veil Necromancer', areaDe: 'Bossraum 20', areaEn: 'Boss room 20', kindDe: 'Fliegender Magier', kindEn: 'Flying caster',
    descriptionDe: 'Ein echter Magierkörper mit Luftphase, Runenangriffen und gefährlichen Zonen.',
    descriptionEn: 'A true mage body with an airborne phase, rune attacks and dangerous zones.',
    hintDe: 'Besiege den Wächter in Raum 20.', hintEn: 'Defeat the warden in room 20.',
  },
  {
    id: 'warden-30', discoveryKey: '1:30', enemyType: 'boss', room: 30,
    nameDe: 'Waldhauptmann', nameEn: 'Forest Captain', areaDe: 'Waldhüter-Arena · Raum 30', areaEn: 'Forest Warden Arena · room 30', kindDe: 'Fernkämpfer', kindEn: 'Ranger',
    descriptionDe: 'Ein schneller Waldhauptmann, der Reichweite und seitliche Bewegung bestraft.',
    descriptionEn: 'A fast forest captain who punishes poor range control and lateral movement.',
    hintDe: 'Durchquere die Waldregion bis Raum 30.', hintEn: 'Cross the forest region to room 30.',
  },
  {
    id: 'warden-40', discoveryKey: '1:40', enemyType: 'boss', room: 40,
    nameDe: 'Schattenkultist', nameEn: 'Shadow Cultist', areaDe: 'Schattenhüter-Arena · Raum 40', areaEn: 'Shadow Warden Arena · room 40', kindDe: 'Assassine', kindEn: 'Assassin',
    descriptionDe: 'Ein aggressiver Kultist mit schnellen Nahkampffenstern und hohem Positionsdruck.',
    descriptionEn: 'An aggressive cultist with fast melee windows and strong positional pressure.',
    hintDe: 'Erreiche das Ende des Dunkelwalds.', hintEn: 'Reach the end of Darkwood.',
  },
  {
    id: 'warden-50', discoveryKey: '1:50', enemyType: 'boss', room: 50,
    nameDe: 'Glutwächter', nameEn: 'Ember Warden', areaDe: 'Glutwächter-Arena · Raum 50', areaEn: 'Ember Warden Arena · room 50', kindDe: 'Finaler Wächter', kindEn: 'Final warden',
    descriptionDe: 'Der finale Kapitelwächter verbindet Feuer, schwere Waffen und die dichteste Angriffskadenz des Runs.',
    descriptionEn: 'The final chapter warden combines fire, heavy weapons and the run’s densest attack cadence.',
    hintDe: 'Bezwinge Raum 50.', hintEn: 'Conquer room 50.',
  },
] as const;
