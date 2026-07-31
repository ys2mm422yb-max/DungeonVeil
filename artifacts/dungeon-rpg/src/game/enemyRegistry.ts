import { enemyPresentationKeyForFamily, type EnemyPresentationKey } from './enemyPresentationContract';

export const RUNTIME_ENEMY_TYPES = [
  'slime', 'goblin', 'skeleton', 'orc', 'spider', 'vampire', 'demon', 'golem', 'boss',
] as const;

export type EnemyType = (typeof RUNTIME_ENEMY_TYPES)[number];

export const ENEMY_FAMILY_IDS = [
  'slime', 'goblin', 'cave-bat', 'thorn-crawler',
  'skeleton', 'bone-archer', 'crypt-acolyte', 'grave-hound',
  'orc', 'spider', 'briar-shaman', 'boar-brute',
  'vampire', 'shadow-rogue', 'dusk-mage', 'carrion-swarm',
  'demon', 'veil-cultist', 'golem', 'flame-imp',
  'gilded-sentinel', 'fracture-wisp', 'crystal-lancer',
  'star-seer', 'astral-mote', 'void-knight',
  'drowned-revenant', 'tidecaller', 'chain-crab',
  'cinder-knight', 'furnace-hound', 'ember-witch',
  'veil-aberration', 'nexus-herald', 'rift-beast',
  'boss',
] as const;

export type EnemyFamilyId = (typeof ENEMY_FAMILY_IDS)[number];
export type EnemyCombatRole = 'swarm' | 'skirmisher' | 'ranged' | 'bruiser' | 'ambusher' | 'drain' | 'caster' | 'tank' | 'support' | 'control' | 'boss';
export type EnemyAttackPattern = 'contact' | 'lunge' | 'projectile' | 'slam' | 'web' | 'drain' | 'fire' | 'quake' | 'burst' | 'summon' | 'tide' | 'beam' | 'boss-cycle';
export type EnemyTelegraph = 'body-flash' | 'line' | 'cone' | 'circle' | 'ground-rune' | 'multi-stage';
export type EnemyRegion = 'crypt' | 'grave' | 'marsh' | 'darkwood' | 'ember' | 'fracture' | 'astral' | 'reliquary' | 'cinder' | 'nexus' | 'boss';

export type LocalizedEnemyText = { de: string; en: string };
export type EnemyStats = { hp: number; attack: number; defense: number; speed: number; size: number; xp: number; color: string };
export type EnemySpawnProfile = { minRoom: number; maxRoom: number; baseWeight: number; maxConsecutiveRooms: number; bossOnly?: boolean };

export type EnemyFamilyDefinition = {
  id: EnemyFamilyId;
  runtimeType: EnemyType;
  presentationKey: EnemyPresentationKey;
  silhouette: string;
  region: EnemyRegion;
  role: EnemyCombatRole;
  attackPattern: EnemyAttackPattern;
  telegraph: EnemyTelegraph;
  stats: EnemyStats;
  spawn: EnemySpawnProfile;
  eliteEligible: boolean;
  name: LocalizedEnemyText;
  kind: LocalizedEnemyText;
  description: LocalizedEnemyText;
  mechanic: LocalizedEnemyText;
  hint: LocalizedEnemyText;
  provenance: string;
};

const text = (de: string, en: string): LocalizedEnemyText => ({ de, en });
const stats = (hp: number, attack: number, defense: number, speed: number, size: number, xp: number, color: string): EnemyStats => ({ hp, attack, defense, speed, size, xp, color });
const spawn = (minRoom: number, maxRoom: number, baseWeight = 8, maxConsecutiveRooms = 2): EnemySpawnProfile => ({ minRoom, maxRoom, baseWeight, maxConsecutiveRooms });

function family(
  id: EnemyFamilyId,
  runtimeType: EnemyType,
  silhouette: string,
  region: EnemyRegion,
  role: EnemyCombatRole,
  attackPattern: EnemyAttackPattern,
  telegraph: EnemyTelegraph,
  familyStats: EnemyStats,
  familySpawn: EnemySpawnProfile,
  nameDe: string,
  nameEn: string,
  kindDe: string,
  kindEn: string,
  descriptionDe: string,
  descriptionEn: string,
  mechanicDe: string,
  mechanicEn: string,
  hintDe: string,
  hintEn: string,
  eliteEligible = true,
): EnemyFamilyDefinition {
  return {
    id, runtimeType, presentationKey: enemyPresentationKeyForFamily(id), silhouette, region, role, attackPattern, telegraph,
    stats: familyStats, spawn: familySpawn, eliteEligible,
    name: text(nameDe, nameEn), kind: text(kindDe, kindEn), description: text(descriptionDe, descriptionEn),
    mechanic: text(mechanicDe, mechanicEn), hint: text(hintDe, hintEn),
    provenance: 'Dungeon Veil authored family using licensed in-repository KayKit/imported presentation assets',
  };
}

export const ENEMY_REGISTRY = {
  slime: family('slime', 'slime', 'low-amorphous', 'crypt', 'swarm', 'contact', 'body-flash', stats(24, 4, 0, 42, 32, 18, '#43c968'), spawn(1, 10, 10), 'Schleim', 'Slime', 'Formlose Bestie', 'Amorphous beast', 'Eine zähe Kreatur, die in Gruppen Räume überzieht.', 'A viscous creature that floods rooms in groups.', 'Langsam, aber als Schwarm gefährlich.', 'Slow, but dangerous in a swarm.', 'In den ersten Räumen anzutreffen.', 'Found in the first rooms.'),
  goblin: family('goblin', 'goblin', 'small-biped-skirmisher', 'crypt', 'skirmisher', 'lunge', 'line', stats(34, 6, 1, 68, 30, 24, '#89a94b'), spawn(1, 10, 9), 'Goblin-Plänkler', 'Goblin Skirmisher', 'Flinker Räuber', 'Agile raider', 'Ein wendiger Räuber, der Lücken in der Verteidigung sucht.', 'An agile raider that looks for gaps in the defence.', 'Kurze Vorstöße mit klarer Linienwarnung.', 'Short lunges with a clear line warning.', 'Bewacht frühe Seitengänge.', 'Guards early side lanes.'),
  'cave-bat': family('cave-bat', 'vampire', 'wide-winged-flyer', 'crypt', 'ranged', 'projectile', 'line', stats(28, 5, 0, 86, 26, 22, '#7668a8'), spawn(1, 10, 8), 'Höhlenfledermaus', 'Cave Bat', 'Fliegender Störer', 'Flying harrier', 'Eine breite Fledermaus, die aus sicherer Entfernung Druck macht.', 'A broad bat that pressures from a safe distance.', 'Kreist und feuert aus der Bewegung.', 'Circles and fires while moving.', 'Hängt über den ersten Krypten.', 'Hangs above the first crypts.'),
  'thorn-crawler': family('thorn-crawler', 'spider', 'low-spined-crawler', 'crypt', 'control', 'web', 'ground-rune', stats(42, 6, 2, 72, 36, 27, '#557c48'), spawn(1, 10, 8), 'Dornkriecher', 'Thorn Crawler', 'Bodenkontrolle', 'Ground controller', 'Ein niedriger Kriecher, der sichere Wege mit Dornen schließt.', 'A low crawler that closes safe routes with thorns.', 'Verlangsamende Bodenzonen erzwingen neue Wege.', 'Slowing ground zones force new routes.', 'Zwischen feuchten Kryptensteinen verborgen.', 'Hidden between damp crypt stones.'),

  skeleton: family('skeleton', 'skeleton', 'shielded-skeleton', 'grave', 'tank', 'slam', 'cone', stats(58, 8, 4, 54, 30, 32, '#d1ccb0'), spawn(11, 20, 9), 'Skelettwache', 'Skeleton Guard', 'Untoter Wächter', 'Undead guard', 'Eine standhafte Grabwache mit Schild und kontrollierten Hieben.', 'A steadfast grave guard with shield and controlled strikes.', 'Blockiert Wege und schlägt in breiten Kegeln.', 'Blocks routes and strikes in broad cones.', 'Wacht ab Raum 11.', 'Keeps watch from room 11.'),
  'bone-archer': family('bone-archer', 'skeleton', 'lean-bow-skeleton', 'grave', 'ranged', 'projectile', 'line', stats(44, 9, 1, 66, 27, 34, '#e1d8b6'), spawn(11, 20, 9), 'Knochenbogner', 'Bone Archer', 'Untoter Fernkämpfer', 'Undead ranged fighter', 'Ein knochiger Schütze, der Distanz erzwingt.', 'A skeletal archer that forces distance.', 'Lange Linienwarnung vor präzisen Schüssen.', 'Long line warning before precise shots.', 'Zwischen Grabwachen ab Raum 12.', 'Among grave guards from room 12.'),
  'crypt-acolyte': family('crypt-acolyte', 'vampire', 'robed-floating-caster', 'grave', 'support', 'summon', 'ground-rune', stats(48, 8, 2, 58, 29, 36, '#8d6fb0'), spawn(11, 20, 7, 1), 'Krypta-Akolyth', 'Crypt Acolyte', 'Untoter Unterstützer', 'Undead support', 'Ein verhüllter Akolyth, der Verbündete stärkt und Runen legt.', 'A veiled acolyte that empowers allies and places runes.', 'Bodenrunen kündigen Verstärkung und Flächendruck an.', 'Ground runes announce buffs and area pressure.', 'In den tieferen Grabkammern.', 'In the deeper burial chambers.'),
  'grave-hound': family('grave-hound', 'goblin', 'low-fast-hound', 'grave', 'ambusher', 'lunge', 'line', stats(50, 10, 1, 94, 31, 35, '#776b60'), spawn(11, 20, 8), 'Grabhund', 'Grave Hound', 'Untoter Hetzer', 'Undead hound', 'Ein schneller Hetzer, der offene Flanken bestraft.', 'A fast hound that punishes open flanks.', 'Mehrere kurze Sprünge statt eines langen Angriffs.', 'Several short leaps instead of one long attack.', 'Lauert in den Seitengräbern.', 'Lurks in side tombs.'),

  orc: family('orc', 'orc', 'broad-axe-raider', 'marsh', 'bruiser', 'slam', 'cone', stats(92, 12, 4, 56, 32, 42, '#627c38'), spawn(21, 30, 9), 'Ork-Plünderer', 'Orc Raider', 'Schwerer Nahkämpfer', 'Heavy melee fighter', 'Ein massiver Plünderer, der den direkten Weg erzwingt.', 'A massive raider that forces the direct route.', 'Breiter Hieb mit kurzer Kegelwarnung.', 'Wide strike with a short cone warning.', 'Beherrscht die Marschwege.', 'Rules the marsh paths.'),
  spider: family('spider', 'spider', 'wide-marsh-spider', 'marsh', 'ambusher', 'web', 'ground-rune', stats(46, 9, 1, 88, 38, 34, '#342d42'), spawn(21, 30, 8), 'Marschspinne', 'Marsh Spider', 'Netzjäger', 'Web hunter', 'Eine breite Jägerin, die Engstellen mit Netzen kontrolliert.', 'A broad hunter that controls chokepoints with webs.', 'Schnelle Flankenbewegung und verlangsamende Zonen.', 'Fast flanking movement and slowing zones.', 'Unter den Wurzeln des Marschs.', 'Beneath the marsh roots.'),
  'briar-shaman': family('briar-shaman', 'vampire', 'antlered-robed-shaman', 'marsh', 'caster', 'burst', 'ground-rune', stats(68, 13, 2, 64, 32, 46, '#6b8f55'), spawn(21, 30, 7, 1), 'Dornen-Schamane', 'Briar Shaman', 'Naturwirker', 'Nature caster', 'Ein Schamane, der Dornenfelder und heilende Wurzeln beschwört.', 'A shaman that summons thorn fields and healing roots.', 'Mehrstufige Rune vor explosivem Dornenstoß.', 'Multi-stage rune before an explosive thorn burst.', 'An alten Marschaltären.', 'At old marsh altars.'),
  'boar-brute': family('boar-brute', 'orc', 'low-heavy-tusk-brute', 'marsh', 'bruiser', 'lunge', 'line', stats(110, 14, 5, 62, 40, 50, '#7a5f3d'), spawn(21, 30, 7), 'Keilerbrecher', 'Boar Brute', 'Sturmkoloss', 'Charging brute', 'Ein niedriger Koloss, dessen Ansturm ganze Bahnen sperrt.', 'A low brute whose charge locks entire lanes.', 'Lange Linie vor einem schweren Durchbruch.', 'Long line before a heavy breakthrough.', 'Tritt ab Raum 25 auf.', 'Appears from room 25.'),

  vampire: family('vampire', 'vampire', 'gliding-stalker', 'darkwood', 'drain', 'drain', 'circle', stats(82, 14, 3, 82, 34, 48, '#9e304b'), spawn(31, 40, 8), 'Vampirschleicher', 'Vampire Stalker', 'Lebenszehrer', 'Life drainer', 'Ein gleitender Jäger, der verlorene Lebenskraft zurückholt.', 'A gliding hunter that restores lost vitality.', 'Kreisförmig angekündigter Lebensentzug.', 'Life drain announced by a circular telegraph.', 'Im Schattenwald ab Raum 31.', 'In Darkwood from room 31.'),
  'shadow-rogue': family('shadow-rogue', 'goblin', 'hooded-dual-blade', 'darkwood', 'skirmisher', 'lunge', 'line', stats(72, 15, 2, 102, 29, 49, '#55506f'), spawn(31, 40, 8), 'Schatten-Schurke', 'Shadow Rogue', 'Assassine', 'Assassin', 'Ein vermummter Schurke, der Rücken und Seiten angreift.', 'A hooded rogue that attacks backs and flanks.', 'Kurze diagonale Linien vor Doppelhieben.', 'Short diagonal lines before twin strikes.', 'Zwischen den dunklen Stämmen.', 'Between the dark trunks.'),
  'dusk-mage': family('dusk-mage', 'vampire', 'tall-staff-caster', 'darkwood', 'caster', 'projectile', 'ground-rune', stats(76, 16, 2, 68, 31, 52, '#735a9d'), spawn(31, 40, 7, 1), 'Dämmermagier', 'Dusk Mage', 'Schleierwirker', 'Veil caster', 'Ein Magier, der verzögerte Geschosse und dunkle Runen verbindet.', 'A mage combining delayed projectiles and dark runes.', 'Rune und Linie müssen gleichzeitig gelesen werden.', 'Rune and line must be read together.', 'Bewacht verfallene Waldschreine.', 'Guards ruined woodland shrines.'),
  'carrion-swarm': family('carrion-swarm', 'slime', 'small-orbiting-swarm', 'darkwood', 'swarm', 'burst', 'circle', stats(36, 11, 0, 110, 24, 31, '#6f6a4a'), spawn(31, 40, 10), 'Aasschwarm', 'Carrion Swarm', 'Fliegender Schwarm', 'Flying swarm', 'Ein dichter Schwarm, der den Spieler umkreist und plötzlich zusammenstößt.', 'A dense swarm that circles the player and suddenly converges.', 'Pulsierender Kreis vor dem Zusammenstoß.', 'Pulsing circle before convergence.', 'Steigt aus den Waldgräbern.', 'Rises from woodland graves.'),

  demon: family('demon', 'demon', 'horned-reaver', 'ember', 'bruiser', 'fire', 'cone', stats(128, 18, 4, 76, 36, 58, '#c53827'), spawn(41, 50, 8), 'Dämonenreaver', 'Demon Reaver', 'Glutkrieger', 'Ember warrior', 'Ein aggressiver Reaver aus den tiefen Gluthallen.', 'An aggressive reaver from the deep ember halls.', 'Feuerkegel zwingt zu seitlichem Ausweichen.', 'Fire cone forces lateral dodges.', 'Ab Raum 41 in der Glutfestung.', 'From room 41 in the Ember Fortress.'),
  'veil-cultist': family('veil-cultist', 'skeleton', 'masked-robed-cultist', 'ember', 'support', 'summon', 'ground-rune', stats(86, 15, 3, 66, 31, 55, '#8a3f58'), spawn(41, 50, 7, 1), 'Schleierkultist', 'Veil Cultist', 'Ritualist', 'Ritualist', 'Ein Kultist, der Verbündete durch Ritualkreise verstärkt.', 'A cultist that empowers allies through ritual circles.', 'Unterbrechbare Rune mit deutlicher Aufladung.', 'Interruptible rune with clear charge-up.', 'An den Altären der Festung.', 'At the fortress altars.'),
  golem: family('golem', 'golem', 'massive-stone-golem', 'ember', 'tank', 'quake', 'circle', stats(190, 20, 9, 40, 42, 70, '#696985'), spawn(41, 50, 6, 1), 'Obsidian-Golem', 'Obsidian Golem', 'Gepanzerter Koloss', 'Armoured colossus', 'Ein langsamer Wächter mit massiver Panzerung.', 'A slow guardian with massive armour.', 'Großflächiges Beben mit langem Kreis-Telegraph.', 'Large quake with a long circular telegraph.', 'Versiegelt die tiefen Tore.', 'Seals the deep gates.'),
  'flame-imp': family('flame-imp', 'goblin', 'small-horned-imp', 'ember', 'ranged', 'fire', 'line', stats(58, 14, 1, 96, 25, 42, '#ef6b32'), spawn(41, 50, 10), 'Flammenwicht', 'Flame Imp', 'Glutwerfer', 'Ember thrower', 'Ein kleiner Wicht, der schnell brennende Geschosse schleudert.', 'A small imp that throws fast burning projectiles.', 'Kurze Linienwarnung, aber hohe Kadenz.', 'Short line warning but high cadence.', 'Springt zwischen den Öfen.', 'Leaps between the furnaces.'),

  'gilded-sentinel': family('gilded-sentinel', 'golem', 'golden-shield-sentinel', 'fracture', 'tank', 'slam', 'cone', stats(210, 21, 10, 44, 40, 76, '#c8a94b'), spawn(51, 60, 8, 1), 'Vergoldeter Wächter', 'Gilded Sentinel', 'Frakturwächter', 'Fracture guardian', 'Ein goldener Schildträger, der sichere Bahnen blockiert.', 'A golden shield bearer that blocks safe lanes.', 'Breiter Schildstoß nach Kegelwarnung.', 'Broad shield bash after a cone warning.', 'Bewacht die Goldene Fraktur.', 'Guards the Golden Fracture.'),
  'fracture-wisp': family('fracture-wisp', 'vampire', 'floating-cracked-wisp', 'fracture', 'control', 'beam', 'line', stats(74, 17, 2, 92, 27, 54, '#f0cf72'), spawn(51, 60, 9), 'Frakturlicht', 'Fracture Wisp', 'Schwebende Anomalie', 'Floating anomaly', 'Ein gebrochenes Licht, das verzögerte Strahlen zieht.', 'A fractured light that draws delayed beams.', 'Linie bleibt kurz bestehen und bricht dann auf.', 'The line lingers briefly before fracturing.', 'Schwebt über offenen Spalten.', 'Floats above open fractures.'),
  'crystal-lancer': family('crystal-lancer', 'skeleton', 'tall-crystal-lancer', 'fracture', 'ranged', 'projectile', 'line', stats(108, 19, 5, 72, 33, 66, '#8fd7e8'), spawn(51, 60, 8), 'Kristall-Lanzenkämpfer', 'Crystal Lancer', 'Präzisionskämpfer', 'Precision fighter', 'Ein hochgewachsener Kämpfer mit durchdringenden Kristallstößen.', 'A tall fighter with piercing crystal thrusts.', 'Schmale, lange Linie mit hohem Schaden.', 'Narrow long line with high damage.', 'Patrouilliert ab Raum 53.', 'Patrols from room 53.'),

  'star-seer': family('star-seer', 'vampire', 'robed-astral-seer', 'astral', 'caster', 'beam', 'ground-rune', stats(104, 21, 3, 68, 31, 70, '#8e7cff'), spawn(61, 70, 8, 1), 'Sternseher', 'Star Seer', 'Astralmagier', 'Astral mage', 'Ein Seher, der Sternenbahnen und verzögerte Einschläge liest.', 'A seer who reads star lanes and delayed impacts.', 'Rune markiert den späteren Sternenfall.', 'A rune marks the later starfall.', 'Im zersplitterten Observatorium.', 'In the Shattered Observatory.'),
  'astral-mote': family('astral-mote', 'slime', 'tiny-floating-mote', 'astral', 'swarm', 'burst', 'circle', stats(48, 14, 0, 118, 22, 38, '#8fd4ff'), spawn(61, 70, 11), 'Astralmotte', 'Astral Mote', 'Sternenschwarm', 'Star swarm', 'Kleine Sternenpartikel sammeln sich zu gefährlichen Pulsen.', 'Small star particles gather into dangerous pulses.', 'Mehrere kleine Kreise verschmelzen.', 'Several small circles merge.', 'Tritt in Schwärmen auf.', 'Appears in swarms.'),
  'void-knight': family('void-knight', 'golem', 'dark-armoured-knight', 'astral', 'bruiser', 'slam', 'cone', stats(188, 24, 8, 58, 38, 82, '#443d70'), spawn(61, 70, 7, 1), 'Leerenritter', 'Void Knight', 'Schwerer Duellant', 'Heavy duelist', 'Ein dunkler Ritter, der Bewegungsbahnen mit schweren Hieben abschneidet.', 'A dark knight that cuts off movement lanes with heavy strikes.', 'Wechselnde Kegel zwingen zum Seitenwechsel.', 'Alternating cones force side changes.', 'Wacht an den Sternentoren.', 'Guards the star gates.'),

  'drowned-revenant': family('drowned-revenant', 'skeleton', 'waterlogged-revenant', 'reliquary', 'bruiser', 'slam', 'circle', stats(160, 23, 6, 60, 36, 78, '#477888'), spawn(71, 80, 8), 'Ertrunkener Wiedergänger', 'Drowned Revenant', 'Gezeitenuntoter', 'Tidal undead', 'Ein schwerer Untoter, der Wasserwellen aus dem Boden schlägt.', 'A heavy undead that slams water waves from the ground.', 'Kreis breitet sich in zwei Wellen aus.', 'The circle expands in two waves.', 'Steigt aus versunkenen Kammern.', 'Rises from drowned chambers.'),
  tidecaller: family('tidecaller', 'vampire', 'floating-tide-mage', 'reliquary', 'caster', 'tide', 'ground-rune', stats(116, 22, 3, 70, 31, 74, '#4ca3bf'), spawn(71, 80, 7, 1), 'Gezeitenrufer', 'Tidecaller', 'Wassermagier', 'Water mage', 'Ein Magier, der Strömungen und trockene Inseln verschiebt.', 'A mage that shifts currents and dry islands.', 'Runen zeigen Flutrichtung und sichere Seite.', 'Runes show flood direction and safe side.', 'Wirkt aus den Reliquiar-Nischen.', 'Casts from reliquary alcoves.'),
  'chain-crab': family('chain-crab', 'spider', 'wide-armoured-crab', 'reliquary', 'control', 'lunge', 'line', stats(142, 21, 8, 54, 42, 80, '#57727a'), spawn(71, 80, 9), 'Kettenkrabbe', 'Chain Crab', 'Gepanzerter Fänger', 'Armoured catcher', 'Eine breite Krabbe, die mit Ketten gerade Wege versperrt.', 'A broad crab that blocks straight routes with chains.', 'Doppelte Linien markieren Zange und Kette.', 'Twin lines mark claw and chain.', 'Kriecht über die Reliquiarböden.', 'Crawls across reliquary floors.'),

  'cinder-knight': family('cinder-knight', 'orc', 'crowned-cinder-knight', 'cinder', 'tank', 'fire', 'cone', stats(220, 27, 10, 58, 39, 92, '#b84d32'), spawn(81, 90, 8, 1), 'Aschenritter', 'Cinder Knight', 'Glutpanzer', 'Ember armour', 'Ein gerüsteter Ritter, dessen Hiebe brennende Bahnen hinterlassen.', 'An armoured knight whose strikes leave burning lanes.', 'Kegel plus nachlaufende Glutspur.', 'Cone plus lingering ember trail.', 'Patrouilliert die Aschenkronen-Feste.', 'Patrols the Cinder Crown.'),
  'furnace-hound': family('furnace-hound', 'demon', 'low-furnace-hound', 'cinder', 'ambusher', 'lunge', 'line', stats(126, 24, 4, 112, 31, 70, '#e15d2b'), spawn(81, 90, 9), 'Ofenhund', 'Furnace Hound', 'Gluthetzer', 'Ember hound', 'Ein schneller Hund, der aus Ofenschächten hervorschießt.', 'A fast hound that bursts from furnace vents.', 'Kurze Linie, danach explosive Landung.', 'Short line followed by an explosive landing.', 'Lauert bei aktiven Ventilen.', 'Lurks near active vents.'),
  'ember-witch': family('ember-witch', 'vampire', 'tall-ember-witch', 'cinder', 'caster', 'fire', 'ground-rune', stats(132, 26, 3, 72, 32, 86, '#d16a73'), spawn(81, 90, 7, 1), 'Gluthexerin', 'Ember Witch', 'Feuerwirkerin', 'Fire caster', 'Eine Hexerin, die mehrere verzögerte Brandfelder verknüpft.', 'A witch that links several delayed burning fields.', 'Runen zünden in lesbarer Reihenfolge.', 'Runes ignite in a readable sequence.', 'Wirkt nahe dem Aschenthron.', 'Casts near the ash throne.'),

  'veil-aberration': family('veil-aberration', 'demon', 'asymmetric-veil-aberration', 'nexus', 'control', 'burst', 'multi-stage', stats(196, 29, 6, 78, 42, 96, '#8754b5'), spawn(91, 100, 8, 1), 'Schleieraberration', 'Veil Aberration', 'Verzerrte Bestie', 'Warped beast', 'Eine asymmetrische Bestie, deren Körper in mehreren Pulsen aufbricht.', 'An asymmetric beast whose body ruptures in several pulses.', 'Mehrstufige Kreise wachsen gegeneinander.', 'Multi-stage circles grow against each other.', 'Entsteht im instabilen Nexus.', 'Forms in the unstable Nexus.'),
  'nexus-herald': family('nexus-herald', 'skeleton', 'tall-nexus-herald', 'nexus', 'support', 'beam', 'ground-rune', stats(150, 27, 5, 70, 34, 92, '#b184e8'), spawn(91, 100, 7, 1), 'Nexus-Herold', 'Nexus Herald', 'Schleierpriester', 'Veil priest', 'Ein Herold, der Rissbestien stärkt und Strahlen verbindet.', 'A herald that empowers rift beasts and links beams.', 'Rune verbindet sich sichtbar mit Verbündeten.', 'A rune visibly links to allies.', 'Kündigt den letzten Riss an.', 'Heralds the final rift.'),
  'rift-beast': family('rift-beast', 'golem', 'massive-rift-beast', 'nexus', 'bruiser', 'quake', 'circle', stats(280, 31, 11, 50, 46, 110, '#5d426f'), spawn(91, 100, 7, 1), 'Rissbestie', 'Rift Beast', 'Nexuskoloss', 'Nexus colossus', 'Eine massive Kreatur, die den Boden in Rissfelder zerlegt.', 'A massive creature that breaks the floor into rift fields.', 'Großer Kreis zerfällt in kleinere Gefahrenzonen.', 'A large circle fractures into smaller danger zones.', 'Bewacht die letzten Räume.', 'Guards the final rooms.'),

  boss: {
    id: 'boss', runtimeType: 'boss', presentationKey: enemyPresentationKeyForFamily('boss'), silhouette: 'unique-room-warden', region: 'boss', role: 'boss',
    attackPattern: 'boss-cycle', telegraph: 'multi-stage', stats: stats(520, 24, 7, 54, 74, 180, '#ff493a'),
    spawn: { minRoom: 10, maxRoom: 100, baseWeight: 0, maxConsecutiveRooms: 0, bossOnly: true }, eliteEligible: false,
    name: text('Schleierfürst', 'Veil Lord'), kind: text('Raumwächter', 'Room warden'),
    description: text('Ein Raumherrscher mit wechselnden Angriffsmustern.', 'A room ruler with rotating attack patterns.'),
    mechanic: text('Mehrstufige Bossfolge mit Linien-, Kegel- und Flächenwarnungen.', 'Multi-stage boss cycle with line, cone and area warnings.'),
    hint: text('Erscheint in jedem zehnten Raum.', 'Appears in every tenth room.'),
    provenance: 'Dungeon Veil authored boss using licensed in-repository KayKit presentation assets',
  },
} as const satisfies Record<EnemyFamilyId, EnemyFamilyDefinition>;

export const NORMAL_ENEMY_FAMILY_IDS = ENEMY_FAMILY_IDS.filter((id): id is Exclude<EnemyFamilyId, 'boss'> => id !== 'boss');

export function enemyDefinition(id: EnemyFamilyId): EnemyFamilyDefinition { return ENEMY_REGISTRY[id]; }
export function enemyFamilyStats(id: EnemyFamilyId): EnemyStats { return ENEMY_REGISTRY[id].stats; }
export function enemyFamiliesForRoom(room: number, includeBoss = false): EnemyFamilyDefinition[] {
  const normalizedRoom = Math.max(1, Math.min(100, Math.floor(room)));
  return ENEMY_FAMILY_IDS.map(id => ENEMY_REGISTRY[id]).filter(definition => {
    if (definition.spawn.bossOnly && !includeBoss) return false;
    return normalizedRoom >= definition.spawn.minRoom && normalizedRoom <= definition.spawn.maxRoom;
  });
}
export function isEnemyType(value: string): value is EnemyType { return (RUNTIME_ENEMY_TYPES as readonly string[]).includes(value); }
export function isEnemyFamilyId(value: string): value is EnemyFamilyId { return Object.prototype.hasOwnProperty.call(ENEMY_REGISTRY, value); }
export function runtimeEnemyTypeForFamily(id: EnemyFamilyId): EnemyType { return ENEMY_REGISTRY[id].runtimeType; }

export function deterministicEnemyFamilyForRoom(room: number, slot: number, recent: readonly EnemyFamilyId[] = []): EnemyFamilyId {
  const candidates = enemyFamiliesForRoom(room, false);
  if (!candidates.length) return 'slime';
  const eligible = candidates.filter(candidate => {
    const limit = candidate.spawn.maxConsecutiveRooms;
    if (limit <= 0 || recent.length < limit) return true;
    return recent.slice(-limit).some(id => id !== candidate.id);
  });
  const pool = eligible.length ? eligible : candidates;
  const weighted = pool.flatMap(candidate => Array.from({ length: Math.max(1, candidate.spawn.baseWeight) }, () => candidate.id));
  const seed = (Math.max(1, Math.floor(room)) * 131 + Math.max(0, Math.floor(slot)) * 47 + recent.length * 19) >>> 0;
  return weighted[seed % weighted.length];
}

export function enemyFamilyForSpawn(room: number, slot: number, runtimeType?: EnemyType): EnemyFamilyId {
  const candidates = enemyFamiliesForRoom(room, false);
  const matching = runtimeType ? candidates.filter(candidate => candidate.runtimeType === runtimeType) : candidates;
  const pool = matching.length ? matching : candidates;
  if (!pool.length) return 'slime';
  const seed = (Math.max(1, Math.floor(room)) * 97 + Math.max(0, Math.floor(slot)) * 53) >>> 0;
  return pool[seed % pool.length].id;
}
