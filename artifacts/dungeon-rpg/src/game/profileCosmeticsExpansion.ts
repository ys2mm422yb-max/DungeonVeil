import {
  PROFILE_AVATARS,
  PROFILE_CARDS,
  PROFILE_TITLES,
  type PlayerProfileProgress,
} from './playerProfile';
import { weeklyEliteRewardOwned } from './weeklyElite';

type Context = { profile: PlayerProfileProgress; rank: number };
type Progress = { value: number; target: number };
type Rarity = 'gewöhnlich' | 'selten' | 'episch' | 'mythisch';

const stat = (key: keyof PlayerProfileProgress['stats'], target: number) => ({ profile }: Context): Progress => ({
  value: Number(profile.stats[key]) || 0,
  target,
});
const rank = (target: number) => ({ rank: current }: Context): Progress => ({ value: current, target });
const weekly = (rewardId: string) => (): Progress => ({ value: weeklyEliteRewardOwned(rewardId) ? 1 : 0, target: 1 });

function addUnique(target: any[], additions: any[]): void {
  for (const item of additions) {
    if (!target.some(existing => existing.id === item.id)) target.push(item);
  }
}

addUnique(PROFILE_TITLES as any[], [
  { id: 'dungeon-runner', icon: '↟', rarity: 'selten' satisfies Rarity, nameDe: 'Dungeonläufer', nameEn: 'Dungeon Runner', requirementDe: 'Raum 25 erreichen', requirementEn: 'Reach room 25', progress: stat('highestRoom', 25) },
  { id: 'crypt-lord', icon: '⌂', rarity: 'episch' satisfies Rarity, nameDe: 'Herr der Krypta', nameEn: 'Lord of the Crypt', requirementDe: 'Kapitel 3 erreichen', requirementEn: 'Reach chapter 3', progress: stat('highestChapter', 3) },
  { id: 'ash-walker', icon: '⌁', rarity: 'episch' satisfies Rarity, nameDe: 'Aschenwanderer', nameEn: 'Ash Walker', requirementDe: 'Kapitel 4 erreichen', requirementEn: 'Reach chapter 4', progress: stat('highestChapter', 4) },
  { id: 'bossbane', icon: '♜', rarity: 'episch' satisfies Rarity, nameDe: 'Bossbrecher', nameEn: 'Bossbane', requirementDe: '15 Bosse besiegen', requirementEn: 'Defeat 15 bosses', progress: stat('bossesDefeated', 15) },
  { id: 'demon-hunter', icon: '⟁', rarity: 'mythisch' satisfies Rarity, nameDe: 'Dämonenjäger', nameEn: 'Demon Hunter', requirementDe: '30 Bosse besiegen', requirementEn: 'Defeat 30 bosses', progress: stat('bossesDefeated', 30) },
  { id: 'master-archer', icon: '➶', rarity: 'episch' satisfies Rarity, nameDe: 'Meisterschütze', nameEn: 'Master Archer', requirementDe: '100.000 Gesamtschaden verursachen', requirementEn: 'Deal 100,000 total damage', progress: stat('totalDamage', 100000) },
  { id: 'executioner', icon: '⚔', rarity: 'mythisch' satisfies Rarity, nameDe: 'Vollstrecker', nameEn: 'Executioner', requirementDe: '1.000 Gegner besiegen', requirementEn: 'Defeat 1,000 enemies', progress: stat('enemiesDefeated', 1000) },
  { id: 'no-return', icon: '↯', rarity: 'episch' satisfies Rarity, nameDe: 'Kein Zurück', nameEn: 'No Turning Back', requirementDe: '50 Runs starten', requirementEn: 'Start 50 runs', progress: stat('runsStarted', 50) },
  { id: 'contract-lord', icon: '✦', rarity: 'episch' satisfies Rarity, nameDe: 'Meister der Verträge', nameEn: 'Master of Contracts', requirementDe: '50 Aufträge abschließen', requirementEn: 'Complete 50 quests', progress: stat('questsCompleted', 50) },
  { id: 'veil-immortal', icon: '∞', rarity: 'mythisch' satisfies Rarity, nameDe: 'Der Unsterbliche', nameEn: 'The Immortal', requirementDe: 'Rang 30 erreichen', requirementEn: 'Reach rank 30', progress: rank(30) },
  { id: 'weekly-breaker', icon: '◈', rarity: 'mythisch' satisfies Rarity, nameDe: 'Wochenbrecher', nameEn: 'Weekbreaker', requirementDe: 'Wöchentlichen Elite-Auftrag „Jagd ohne Ende“ abschließen', requirementEn: 'Complete the weekly elite contract “Endless Hunt”', progress: weekly('weekly-breaker') },
  { id: 'veil-executioner', icon: '☄', rarity: 'mythisch' satisfies Rarity, nameDe: 'Schleierhenker', nameEn: 'Veil Executioner', requirementDe: 'Wöchentlichen Elite-Auftrag „Zorn des Schleiers“ abschließen', requirementEn: 'Complete the weekly elite contract “Wrath of the Veil”', progress: weekly('veil-executioner') },
]);

addUnique(PROFILE_CARDS as any[], [
  { id: 'ember-rift', icon: '◫', rarity: 'selten' satisfies Rarity, nameDe: 'Glutriss', nameEn: 'Ember Rift', requirementDe: 'Raum 25 erreichen', requirementEn: 'Reach room 25', progress: stat('highestRoom', 25), background: 'radial-gradient(circle at 18% 18%,rgba(255,158,67,.34),transparent 28%),linear-gradient(145deg,#4b160d 0%,#170b0a 52%,#080708 100%)', border: '#ef9851', glow: 'rgba(239,107,51,.28)' },
  { id: 'crypt-crown', icon: '♛', rarity: 'episch' satisfies Rarity, nameDe: 'Kryptenkrone', nameEn: 'Crypt Crown', requirementDe: 'Kapitel 3 erreichen', requirementEn: 'Reach chapter 3', progress: stat('highestChapter', 3), background: 'linear-gradient(115deg,transparent 0 42%,rgba(209,186,120,.14) 43% 45%,transparent 46%),radial-gradient(circle at 78% 20%,rgba(211,190,121,.22),transparent 32%),linear-gradient(145deg,#28251d,#090b0d)', border: '#cab775', glow: 'rgba(202,183,117,.25)' },
  { id: 'blood-moon', icon: '●', rarity: 'episch' satisfies Rarity, nameDe: 'Blutmond', nameEn: 'Blood Moon', requirementDe: '15 Bosse besiegen', requirementEn: 'Defeat 15 bosses', progress: stat('bossesDefeated', 15), background: 'radial-gradient(circle at 78% 24%,#cf5d55 0 9%,rgba(207,93,85,.18) 10% 23%,transparent 24%),linear-gradient(150deg,#3c0d18,#09070b 66%)', border: '#dc6964', glow: 'rgba(220,71,76,.3)' },
  { id: 'frozen-throne', icon: '✧', rarity: 'episch' satisfies Rarity, nameDe: 'Gefrorener Thron', nameEn: 'Frozen Throne', requirementDe: 'Kapitel 4 erreichen', requirementEn: 'Reach chapter 4', progress: stat('highestChapter', 4), background: 'linear-gradient(128deg,transparent 0 56%,rgba(170,232,255,.2) 57% 58%,transparent 59%),radial-gradient(circle at 24% 20%,rgba(154,227,255,.28),transparent 35%),linear-gradient(145deg,#12344d,#071018)', border: '#91dcf6', glow: 'rgba(78,188,230,.3)' },
  { id: 'hunter-night', icon: '➶', rarity: 'selten' satisfies Rarity, nameDe: 'Nachtjagd', nameEn: 'Night Hunt', requirementDe: '500 Gegner besiegen', requirementEn: 'Defeat 500 enemies', progress: stat('enemiesDefeated', 500), background: 'radial-gradient(circle at 18% 78%,rgba(93,210,133,.2),transparent 32%),linear-gradient(145deg,#123629,#07100e 70%)', border: '#72ca91', glow: 'rgba(72,192,111,.25)' },
  { id: 'collector-vault', icon: '◇', rarity: 'episch' satisfies Rarity, nameDe: 'Sammlertresor', nameEn: 'Collector Vault', requirementDe: '75 Ausrüstungs-Drops erhalten', requirementEn: 'Find 75 equipment drops', progress: stat('itemsFound', 75), background: 'repeating-linear-gradient(120deg,rgba(255,255,255,.025) 0 2px,transparent 2px 12px),linear-gradient(145deg,#4c3714,#11100c 72%)', border: '#e2bb59', glow: 'rgba(226,187,89,.26)' },
  { id: 'veteran-banner', icon: '⚑', rarity: 'mythisch' satisfies Rarity, nameDe: 'Veteranenbanner', nameEn: 'Veteran Banner', requirementDe: 'Rang 25 erreichen', requirementEn: 'Reach rank 25', progress: rank(25), background: 'linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 22px),radial-gradient(circle at 80% 24%,rgba(190,141,255,.24),transparent 34%),linear-gradient(145deg,#301c46,#090b15)', border: '#bd8df2', glow: 'rgba(181,105,242,.3)' },
  { id: 'world-scar', icon: '◎', rarity: 'mythisch' satisfies Rarity, nameDe: 'Weltennarbe', nameEn: 'World Scar', requirementDe: 'Rang 35 erreichen', requirementEn: 'Reach rank 35', progress: rank(35), background: 'conic-gradient(from 210deg at 78% 40%,rgba(255,127,61,.34),transparent 25%,rgba(146,85,255,.24),transparent 58%),linear-gradient(145deg,#2c1110,#08070d)', border: '#f18a58', glow: 'rgba(241,92,58,.34)' },
  { id: 'rift-seal', icon: '⬡', rarity: 'mythisch' satisfies Rarity, nameDe: 'Riss-Siegel', nameEn: 'Rift Seal', requirementDe: 'Wöchentlichen Elite-Auftrag „Marsch durch den Schleier“ abschließen', requirementEn: 'Complete the weekly elite contract “March Through the Veil”', progress: weekly('rift-seal'), background: 'radial-gradient(ellipse at 50% 50%,rgba(84,223,255,.34) 0 5%,rgba(109,88,255,.2) 6% 18%,transparent 32%),linear-gradient(145deg,#071f2a,#090713 70%)', border: '#65d9ef', glow: 'rgba(83,212,255,.38)' },
  { id: 'iron-veil', icon: '▰', rarity: 'mythisch' satisfies Rarity, nameDe: 'Eiserner Schleier', nameEn: 'Iron Veil', requirementDe: 'Wöchentlichen Elite-Auftrag „Kein Zurück“ abschließen', requirementEn: 'Complete the weekly elite contract “No Turning Back”', progress: weekly('iron-veil'), background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 1px,transparent 1px 8px),linear-gradient(145deg,#34383d,#0b0c0f 70%)', border: '#bfc7cf', glow: 'rgba(173,189,204,.3)' },
]);

addUnique(PROFILE_AVATARS as any[], [
  { id: 'ash-mask', icon: '◖◗', rarity: 'selten' satisfies Rarity, nameDe: 'Aschenmaske', nameEn: 'Ash Mask', requirementDe: 'Raum 25 erreichen', requirementEn: 'Reach room 25', progress: stat('highestRoom', 25), background: 'radial-gradient(circle at 45% 35%,#f0a25c,#6e251d 55%,#1b0b0b)' },
  { id: 'rune-bow', icon: '⌁', rarity: 'selten' satisfies Rarity, nameDe: 'Runenbogen', nameEn: 'Rune Bow', requirementDe: 'Rang 12 erreichen', requirementEn: 'Reach rank 12', progress: rank(12), background: 'radial-gradient(circle at 35% 25%,#86e2c4,#145749 60%,#071b18)' },
  { id: 'frost-skull', icon: '☠', rarity: 'episch' satisfies Rarity, nameDe: 'Frostschädel', nameEn: 'Frost Skull', requirementDe: 'Kapitel 3 erreichen', requirementEn: 'Reach chapter 3', progress: stat('highestChapter', 3), background: 'radial-gradient(circle at 35% 25%,#dcf8ff,#397b99 58%,#0c2638)' },
  { id: 'demon-eye', icon: '◉', rarity: 'episch' satisfies Rarity, nameDe: 'Dämonenauge', nameEn: 'Demon Eye', requirementDe: '15 Bosse besiegen', requirementEn: 'Defeat 15 bosses', progress: stat('bossesDefeated', 15), background: 'radial-gradient(circle at 50% 50%,#ffe38a 0 8%,#bd304f 9% 28%,#250815 55%,#09060b)' },
  { id: 'sentinel-helm', icon: '♜', rarity: 'episch' satisfies Rarity, nameDe: 'Wächterhelm', nameEn: 'Sentinel Helm', requirementDe: '30 Bosse besiegen', requirementEn: 'Defeat 30 bosses', progress: stat('bossesDefeated', 30), background: 'radial-gradient(circle at 40% 25%,#ffe9a6,#8c6b29 58%,#241b0b)' },
  { id: 'veil-crystal', icon: '◆', rarity: 'episch' satisfies Rarity, nameDe: 'Schleierkristall', nameEn: 'Veil Crystal', requirementDe: '50 Ausrüstungs-Drops erhalten', requirementEn: 'Find 50 equipment drops', progress: stat('itemsFound', 50), background: 'radial-gradient(circle at 40% 25%,#e2b8ff,#7850b2 58%,#231336)' },
  { id: 'boss-crown', icon: '♛', rarity: 'mythisch' satisfies Rarity, nameDe: 'Bosskrone', nameEn: 'Boss Crown', requirementDe: '50 Bosse besiegen', requirementEn: 'Defeat 50 bosses', progress: stat('bossesDefeated', 50), background: 'radial-gradient(circle at 40% 25%,#fff0a6,#af6724 55%,#31170c)' },
  { id: 'void-phoenix', icon: 'ϟ', rarity: 'mythisch' satisfies Rarity, nameDe: 'Leerenphönix', nameEn: 'Void Phoenix', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', progress: stat('highestChapter', 5), background: 'radial-gradient(circle at 40% 30%,#f5aeff,#793d9c 38%,#17203f 66%,#080812)' },
  { id: 'night-watch', icon: '☾', rarity: 'mythisch' satisfies Rarity, nameDe: 'Nachtwache', nameEn: 'Night Watch', requirementDe: 'Wöchentlichen Elite-Auftrag „Wächtersturz“ abschließen', requirementEn: 'Complete the weekly elite contract “Wardenfall”', progress: weekly('night-watch'), background: 'radial-gradient(circle at 38% 28%,#dce8ff,#41547d 45%,#0a1022 72%)' },
  { id: 'arcane-eye', icon: '⊙', rarity: 'mythisch' satisfies Rarity, nameDe: 'Arkanes Auge', nameEn: 'Arcane Eye', requirementDe: 'Wöchentlichen Elite-Auftrag „Elite-Verträge“ abschließen', requirementEn: 'Complete the weekly elite contract “Elite Contracts”', progress: weekly('arcane-eye'), background: 'radial-gradient(circle at 50% 50%,#e8d4ff 0 7%,#9f72ff 8% 24%,#3b1d67 44%,#090713 75%)' },
]);
