export type Language = 'de' | 'en';
export type UpgradeKey = 'maxHp' | 'attack' | 'speed' | 'defense' | 'heal';

const en = {
  // Language Select
  selectLanguage: 'Select Language',
  selectLanguageSubtitle: 'Choose your preferred language',
  continueInEnglish: 'English',
  continueInGerman: 'Deutsch',

  // Main Menu
  newGame: 'New Game',
  continueGame: 'Continue',
  settings: 'Settings',
  credits: 'Credits',
  lastSave: 'LV {level} · Floor {floor}',
  noSave: 'No save found',

  // Character Creation
  characterCreation: 'Create Hero',
  heroName: 'Hero Name',
  heroNamePlaceholder: 'Enter your name…',
  chooseClass: 'Choose Class',
  startGame: 'Enter the Dungeon',
  back: 'Back',
  nameTooShort: 'Name must be at least 2 characters',

  // Classes
  className: {
    warrior: 'Warrior',
    mage: 'Mage',
    archer: 'Archer',
  } as Record<string, string>,
  classRole: {
    warrior: 'Tank · Melee',
    mage: 'Glass Canon · Arcane',
    archer: 'Skirmisher · Ranged',
  } as Record<string, string>,
  classDesc: {
    warrior: 'Unbreakable shield, unmatched strength. Built to absorb punishment and unleash devastating close-range fury.',
    mage: 'Master of arcane destruction. Fragile but devastating — obliterates packs of enemies with each spell cast.',
    archer: 'Swift and relentless. Dances through battle with superior range and blistering attack speed.',
  } as Record<string, string>,
  classSkill: {
    warrior: 'RAGE — Massive AOE slam that shatters everything nearby.',
    mage: 'BOLT — Arcane pulse that obliterates foes in a wide radius.',
    archer: 'RAIN — Arrow storm peppering all enemies around you.',
  } as Record<string, string>,

  // Stats
  statHp: 'HP',
  statAtk: 'ATK',
  statDef: 'DEF',
  statSpd: 'SPD',

  // Start Screen (legacy, kept for compat)
  subtitle: 'Descend into the darkness',
  enterDungeon: 'Enter the Dungeon',

  // Game Over
  youDied: 'YOU DIED',
  finalStats: 'FINAL STATS',
  floorReached: 'Floor Reached:',
  levelReached: 'Level Reached:',
  enemiesSlain: 'Enemies Slain:',
  retry: 'NEW GAME',
  mainMenu: 'MAIN MENU',

  // Level Up
  levelUp: 'LEVEL UP!',
  chooseUpgrade: 'Choose your upgrade',

  // HUD
  floorLabel: 'FLOOR',
  lvlLabel: 'LVL',
  experience: 'EXPERIENCE',
  hpLabel: 'HP',

  // Action Buttons
  attack: 'ATK',
  dodge: 'DASH',
  skill: 'SKILL',
  interact: 'USE',

  // Pause
  paused: 'PAUSED',
  resume: 'RESUME',
  restart: 'MAIN MENU',

  // Settings
  language: 'Language',
  languageShort: 'EN',
  sound: 'Sound',
  soundOn: 'On',
  soundOff: 'Off',
  deleteSave: 'Delete Save',
  deleteSaveConfirm: 'Are you sure? This cannot be undone.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  version: 'Version 1.0',

  // Credits
  creditsTitle: 'Credits',
  creditsGame: 'DUNGEON ABYSS',
  creditsTagline: 'A mobile-first action RPG',
  creditsBuiltWith: 'Built with React + TypeScript',
  creditsDesign: 'Design & Game Dev',
  creditsSpecialThanks: 'Special Thanks',
  creditsThanksText: 'To every adventurer brave enough to descend.',
  creditsClose: 'Back',

  // Upgrades
  upgrades: {
    maxHp: '+20 Max HP',
    attack: '+5 Attack',
    speed: '+1 Speed tier',
    defense: '+1 Defense',
    heal: '+50% Heal',
  } as Record<UpgradeKey, string>,
};

const de: typeof en = {
  selectLanguage: 'Sprache wählen',
  selectLanguageSubtitle: 'Wähle deine bevorzugte Sprache',
  continueInEnglish: 'English',
  continueInGerman: 'Deutsch',

  newGame: 'Neues Spiel',
  continueGame: 'Fortsetzen',
  settings: 'Einstellungen',
  credits: 'Credits',
  lastSave: 'LV {level} · Etage {floor}',
  noSave: 'Kein Speicherstand',

  characterCreation: 'Held erstellen',
  heroName: 'Heldenname',
  heroNamePlaceholder: 'Deinen Namen eingeben…',
  chooseClass: 'Klasse wählen',
  startGame: 'Dungeon betreten',
  back: 'Zurück',
  nameTooShort: 'Name muss mindestens 2 Zeichen haben',

  className: {
    warrior: 'Krieger',
    mage: 'Magier',
    archer: 'Bogenschütze',
  } as Record<string, string>,
  classRole: {
    warrior: 'Tank · Nahkampf',
    mage: 'Glaskanone · Arkan',
    archer: 'Scharmützler · Fernkampf',
  } as Record<string, string>,
  classDesc: {
    warrior: 'Unzerbrechlicher Schild, unvergleichliche Stärke. Gebaut, um Schaden zu absorbieren und verheerende Nahkampffurien zu entfesseln.',
    mage: 'Meister arkanischer Zerstörung. Fragil, aber verheerend — vernichtet Gruppen von Feinden mit jedem Zauber.',
    archer: 'Schnell und unerbittlich. Tanzt durch die Schlacht mit überlegener Reichweite und rasanter Angriffsgeschwindigkeit.',
  } as Record<string, string>,
  classSkill: {
    warrior: 'WUTH — Massiver AOE-Schlag, der alles in der Nähe erschüttert.',
    mage: 'BLITZ — Arkaner Puls, der Feinde in weitem Radius vernichtet.',
    archer: 'REGEN — Pfeilhagel, der alle Feinde um dich trifft.',
  } as Record<string, string>,

  statHp: 'LP',
  statAtk: 'ATK',
  statDef: 'VER',
  statSpd: 'GES',

  subtitle: 'Tauche in die Dunkelheit',
  enterDungeon: 'Dungeon betreten',

  youDied: 'GESTORBEN',
  finalStats: 'ENDSTATISTIK',
  floorReached: 'Etage erreicht:',
  levelReached: 'Level erreicht:',
  enemiesSlain: 'Feinde besiegt:',
  retry: 'NEUES SPIEL',
  mainMenu: 'HAUPTMENÜ',

  levelUp: 'AUFGESTIEGEN!',
  chooseUpgrade: 'Wähle deine Verbesserung',

  floorLabel: 'ETAGE',
  lvlLabel: 'LV',
  experience: 'ERFAHRUNG',
  hpLabel: 'LP',

  attack: 'ATK',
  dodge: 'DASH',
  skill: 'SKILL',
  interact: 'USE',

  paused: 'PAUSE',
  resume: 'WEITER',
  restart: 'HAUPTMENÜ',

  language: 'Sprache',
  languageShort: 'DE',
  sound: 'Sound',
  soundOn: 'An',
  soundOff: 'Aus',
  deleteSave: 'Speicher löschen',
  deleteSaveConfirm: 'Bist du sicher? Das kann nicht rückgängig gemacht werden.',
  confirm: 'Bestätigen',
  cancel: 'Abbrechen',
  version: 'Version 1.0',

  creditsTitle: 'Credits',
  creditsGame: 'DUNGEON ABYSS',
  creditsTagline: 'Ein mobiles Action-RPG',
  creditsBuiltWith: 'Erstellt mit React + TypeScript',
  creditsDesign: 'Design & Spielentwicklung',
  creditsSpecialThanks: 'Besonderer Dank',
  creditsThanksText: 'An jeden Abenteurer, der mutig genug ist, hinabzusteigen.',
  creditsClose: 'Zurück',

  upgrades: {
    maxHp: '+20 Max LP',
    attack: '+5 Angriff',
    speed: '+1 Tempo',
    defense: '+1 Verteidigung',
    heal: '+50% Heilung',
  } as Record<UpgradeKey, string>,
};

export const translations: Record<Language, typeof en> = { en, de };
export type Translations = typeof en;
