import { LanguageProvider } from '../i18n/LanguageContext';
import type { VeilRelicProfile } from '../game/veilRelics';
import { VeilChamberScreen } from './screens/VeilChamberScreenV4';

let seeded = false;

function seedRelicQa(): void {
  if (seeded) return;
  seeded = true;
  localStorage.setItem('dungeon-veil-language', 'de');
  const profile: VeilRelicProfile = {
    version: 2,
    owned: [
      'ash-eye',
      'marked-claw',
      'night-hunt-sigil',
      'veil-heart',
      'broken-guardian-crown',
      'depth-rune-shard',
      'world-core',
    ],
    equipped: 'world-core',
    consumedHeartRuns: [],
    activatedWorldCoreRuns: [],
    relicMisses: { hunt: 0, boss: 0 },
    crownRunStacks: {},
  };
  localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify(profile));
}

export function RelicInventoryQa() {
  seedRelicQa();
  return <div data-testid="relic-inventory-qa" data-contract="seven-relic-responsive-audit-v4" className="fixed inset-0 bg-[#080706]">
    <LanguageProvider><VeilChamberScreen onBack={() => {}} /></LanguageProvider>
  </div>;
}
