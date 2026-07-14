from pathlib import Path

meta = Path('artifacts/dungeon-rpg/src/game/metaProgression.ts')
text = meta.read_text()
old = """const UPGRADE_COSTS: Record<number, EquipmentUpgradeCost> = {
  1: { gold: 250, copies: 1 },
  2: { gold: 650, copies: 2 },
  3: { gold: 1300, copies: 3 },
  4: { gold: 2400, copies: 5 },
};
"""
new = """const UPGRADE_COSTS: Record<number, EquipmentUpgradeCost> = {
  1: { gold: 1000, copies: 1 },
  2: { gold: 2800, copies: 2 },
  3: { gold: 6000, copies: 3 },
  4: { gold: 11000, copies: 5 },
};
"""
if old not in text:
    raise SystemExit('upgrade cost block missing')
meta.write_text(text.replace(old, new, 1))

audit = Path('artifacts/dungeon-rpg/scripts/validate-upgrade-economy.mjs')
audit.write_text("""import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/game/metaProgression.ts', import.meta.url), 'utf8');
const expected = [
  '1: { gold: 1000, copies: 1 }',
  '2: { gold: 2800, copies: 2 }',
  '3: { gold: 6000, copies: 3 }',
  '4: { gold: 11000, copies: 5 }',
];

const failures = expected.filter(marker => !source.includes(marker));
if (failures.length) {
  console.error('Upgrade economy audit failed:');
  failures.forEach(marker => console.error(`  - missing ${marker}`));
  process.exit(1);
}
if (source.includes('1: { gold: 250') || source.includes('4: { gold: 2400')) {
  console.error('Upgrade economy audit failed: legacy low costs are still active.');
  process.exit(1);
}
console.log('Upgrade economy audit passed: gold costs scale 1000 / 2800 / 6000 / 11000 while copy requirements stay unchanged.');
""")

package = Path('artifacts/dungeon-rpg/package.json')
text = package.read_text()
marker = 'node scripts/validate-menu-copy-relic-progression.mjs"'
replacement = 'node scripts/validate-menu-copy-relic-progression.mjs && node scripts/validate-upgrade-economy.mjs"'
if text.count(marker) != 2:
    raise SystemExit(f'expected two package audit markers, found {text.count(marker)}')
package.write_text(text.replace(marker, replacement))
