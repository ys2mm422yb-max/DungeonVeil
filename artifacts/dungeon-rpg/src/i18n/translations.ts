export type Language = 'de' | 'en';
export type UpgradeKey = 'maxHp' | 'attack' | 'speed' | 'defense' | 'heal' | 'multishot' | 'ricochet' | 'fireArrow' | 'iceArrow' | 'attackSpeed' | 'piercing';

const en = {
  selectLanguage: 'Select Language', selectLanguageSubtitle: 'Choose your preferred language', continueInEnglish: 'English', continueInGerman: 'Deutsch',
  newGame: 'New Run', continueGame: 'Continue', settings: 'Settings', credits: 'Credits', lastSave: 'LV {level} · Room {floor}', noSave: 'No save found',
  characterCreation: 'Name your Archer', heroName: 'Hero Name', heroNamePlaceholder: 'Enter your name…', chooseClass: 'Hero', startGame: 'START RUN', back: 'Back', nameTooShort: 'Name must be at least 2 characters',
  className: { warrior: 'Warrior', mage: 'Mage', archer: 'Archer' } as Record<string, string>,
  classRole: { warrior: 'Tank · Melee', mage: 'Glass Canon · Arcane', archer: 'Ranged · Auto Shot' } as Record<string, string>,
  classDesc: { warrior: '', mage: '', archer: 'Move to dodge. Stop to automatically fire at the nearest enemy. Build a new skill combo every run.' } as Record<string, string>,
  classSkill: { warrior: '', mage: '', archer: 'AUTO SHOT — stop moving to fire.' } as Record<string, string>,
  statHp: 'HP', statAtk: 'ATK', statDef: 'DEF', statSpd: 'SPD', subtitle: 'Build. Dodge. Survive.', enterDungeon: 'Start Run',
  youDied: 'RUN ENDED', finalStats: 'RUN STATS', floorReached: 'Room Reached:', levelReached: 'Level Reached:', enemiesSlain: 'Enemies Slain:', retry: 'NEW RUN', mainMenu: 'MAIN MENU',
  levelUp: 'NEW ABILITY!', chooseUpgrade: 'Choose one for this run', floorLabel: 'ROOM', lvlLabel: 'LVL', experience: 'EXPERIENCE', hpLabel: 'HP', exitDungeon: 'Leave Run', worldLabel: 'CHAPTER', dungeonLabel: 'RUN',
  attack: 'AUTO', dodge: 'DASH', skill: 'BUILD', interact: 'NEXT', paused: 'PAUSED', resume: 'RESUME', restart: 'MAIN MENU',
  language: 'Language', languageShort: 'EN', sound: 'Sound', soundOn: 'On', soundOff: 'Off', deleteSave: 'Delete Save', deleteSaveConfirm: 'Are you sure? This cannot be undone.', confirm: 'Confirm', cancel: 'Cancel', version: 'Version 1.0',
  creditsTitle: 'Credits', creditsGame: 'DUNGEON VEIL', creditsTagline: 'A room-run action roguelite', creditsBuiltWith: 'Built with React + TypeScript', creditsDesign: 'Design & Game Dev', creditsSpecialThanks: 'Special Thanks', creditsThanksText: 'To every adventurer brave enough to enter the Veil.', creditsClose: 'Back',
  upgrades: {
    maxHp: '+20 Max HP', attack: '+5 Attack', speed: '+15 Move Speed', defense: '+1 Defense', heal: 'Heal 50%',
    multishot: 'MULTISHOT · +1 arrow', ricochet: 'RICOCHET · Hit another enemy', fireArrow: 'FIRE ARROW · Burn damage', iceArrow: 'FROST ARROW · Ice damage', attackSpeed: 'QUICK DRAW · Faster attacks', piercing: 'PIERCING · Arrow hits through targets',
  } as Record<UpgradeKey, string>,
};

const de: typeof en = {
  selectLanguage: 'Sprache wählen', selectLanguageSubtitle: 'Wähle deine bevorzugte Sprache', continueInEnglish: 'English', continueInGerman: 'Deutsch',
  newGame: 'Neuer Run', continueGame: 'Fortsetzen', settings: 'Einstellungen', credits: 'Credits', lastSave: 'LV {level} · Raum {floor}', noSave: 'Kein Speicherstand',
  characterCreation: 'Bogenschütze benennen', heroName: 'Name', heroNamePlaceholder: 'Deinen Namen eingeben…', chooseClass: 'Held', startGame: 'RUN STARTEN', back: 'Zurück', nameTooShort: 'Name muss mindestens 2 Zeichen haben',
  className: { warrior: 'Krieger', mage: 'Magier', archer: 'Bogenschütze' } as Record<string, string>,
  classRole: { warrior: 'Tank · Nahkampf', mage: 'Glaskanone · Arkan', archer: 'Fernkampf · Auto-Schuss' } as Record<string, string>,
  classDesc: { warrior: '', mage: '', archer: 'Bewege dich zum Ausweichen. Bleib stehen und dein Held schießt automatisch auf den nächsten Gegner. Jeder Run baut einen neuen Skill-Build.' } as Record<string, string>,
  classSkill: { warrior: '', mage: '', archer: 'AUTO-SCHUSS — im Stand wird automatisch geschossen.' } as Record<string, string>,
  statHp: 'LP', statAtk: 'ATK', statDef: 'VER', statSpd: 'GES', subtitle: 'Bauen. Ausweichen. Überleben.', enterDungeon: 'Run starten',
  youDied: 'RUN BEENDET', finalStats: 'RUN-STATISTIK', floorReached: 'Raum erreicht:', levelReached: 'Level erreicht:', enemiesSlain: 'Feinde besiegt:', retry: 'NEUER RUN', mainMenu: 'HAUPTMENÜ',
  levelUp: 'NEUE FÄHIGKEIT!', chooseUpgrade: 'Wähle eine für diesen Run', floorLabel: 'RAUM', lvlLabel: 'LV', experience: 'ERFAHRUNG', hpLabel: 'LP', exitDungeon: 'Run verlassen', worldLabel: 'KAPITEL', dungeonLabel: 'RUN',
  attack: 'AUTO', dodge: 'DASH', skill: 'BUILD', interact: 'WEITER', paused: 'PAUSE', resume: 'WEITER', restart: 'HAUPTMENÜ',
  language: 'Sprache', languageShort: 'DE', sound: 'Sound', soundOn: 'An', soundOff: 'Aus', deleteSave: 'Speicher löschen', deleteSaveConfirm: 'Bist du sicher? Das kann nicht rückgängig gemacht werden.', confirm: 'Bestätigen', cancel: 'Abbrechen', version: 'Version 1.0',
  creditsTitle: 'Credits', creditsGame: 'DUNGEON VEIL', creditsTagline: 'Ein Raum-Run Action-Roguelite', creditsBuiltWith: 'Erstellt mit React + TypeScript', creditsDesign: 'Design & Spielentwicklung', creditsSpecialThanks: 'Besonderer Dank', creditsThanksText: 'An jeden Abenteurer, der den Schleier betritt.', creditsClose: 'Zurück',
  upgrades: {
    maxHp: '+20 Max LP', attack: '+5 Angriff', speed: '+15 Bewegung', defense: '+1 Verteidigung', heal: '50% Heilung',
    multishot: 'MEHRFACHPFEIL · +1 Pfeil', ricochet: 'ABPRALLER · Trifft weiteren Gegner', fireArrow: 'FEUERPFEIL · Brandschaden', iceArrow: 'FROSTPFEIL · Eisschaden', attackSpeed: 'SCHNELLZUG · Schnellere Angriffe', piercing: 'DURCHBOHREN · Pfeile treffen durch',
  } as Record<UpgradeKey, string>,
};

export const translations: Record<Language, typeof en> = { en, de };
export type Translations = typeof en;
