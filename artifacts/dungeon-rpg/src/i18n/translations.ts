export type Language = 'de' | 'en';

export type UpgradeKey = 'maxHp' | 'attack' | 'speed' | 'defense' | 'heal';

const en = {
  // Language Select
  selectLanguage: 'Select Language',
  selectLanguageSubtitle: 'Choose your preferred language',
  continueInEnglish: 'English',
  continueInGerman: 'Deutsch',

  // Start Screen
  subtitle: 'Descend into the darkness',
  enterDungeon: 'Enter the Dungeon',

  // Game Over
  youDied: 'YOU DIED',
  finalStats: 'FINAL STATS',
  floorReached: 'Floor Reached:',
  levelReached: 'Level Reached:',
  enemiesSlain: 'Enemies Slain:',
  retry: 'RETRY',

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
  skill: 'SPIN',
  interact: 'USE',

  // Pause
  paused: 'PAUSED',
  resume: 'RESUME',
  restart: 'RESTART',

  // Settings (inside pause)
  settings: 'SETTINGS',
  language: 'Language',
  languageShort: 'EN',

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
  // Language Select
  selectLanguage: 'Sprache wählen',
  selectLanguageSubtitle: 'Wähle deine bevorzugte Sprache',
  continueInEnglish: 'English',
  continueInGerman: 'Deutsch',

  // Start Screen
  subtitle: 'Tauche in die Dunkelheit',
  enterDungeon: 'Dungeon betreten',

  // Game Over
  youDied: 'GESTORBEN',
  finalStats: 'ENDSTATISTIK',
  floorReached: 'Etage erreicht:',
  levelReached: 'Level erreicht:',
  enemiesSlain: 'Feinde besiegt:',
  retry: 'NOCHMAL',

  // Level Up
  levelUp: 'AUFGESTIEGEN!',
  chooseUpgrade: 'Wähle deine Verbesserung',

  // HUD
  floorLabel: 'ETAGE',
  lvlLabel: 'LV',
  experience: 'ERFAHRUNG',
  hpLabel: 'LP',

  // Action Buttons
  attack: 'ATK',
  dodge: 'DASH',
  skill: 'SPIN',
  interact: 'USE',

  // Pause
  paused: 'PAUSE',
  resume: 'WEITER',
  restart: 'NEU STARTEN',

  // Settings
  settings: 'EINSTELLUNGEN',
  language: 'Sprache',
  languageShort: 'DE',

  // Upgrades
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
