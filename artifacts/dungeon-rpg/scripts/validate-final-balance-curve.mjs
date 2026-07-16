import { simulateFinalBalanceCurve } from './final-balance-curve-simulator.mjs';

const report = simulateFinalBalanceCurve();
const byKey = new Map(report.rows.map(row => [`${row.chapter}:${row.room}`, row]));
const checks = [
  [report.scenario === 'final-central-enemy-curve', 'enemy simulator uses the wrong scenario'],
  [byKey.get('1:1')?.normalHitsToKill >= 4 && byKey.get('1:1')?.normalHitsToKill <= 5, 'chapter-one opening TTK left the intended reference band'],
  [byKey.get('1:50')?.normalHitsToKill >= 7 && byKey.get('1:50')?.normalHitsToKill <= 8, 'chapter-one late-room TTK left the intended reference band'],
  [byKey.get('6:50')?.normalHitsToKill >= 10 && byKey.get('6:50')?.normalHitsToKill <= 13, 'chapter-six late-room TTK left the intended reference band'],
  [byKey.get('1:1')?.playerHitsSurvived >= 15, 'opening enemies are too lethal for the reference player'],
  [byKey.get('6:50')?.playerHitsSurvived >= 5, 'chapter-six late enemies defeat the reference player in fewer than five hits'],
  [byKey.get('12:50')?.playerHitsSurvived >= 3, 'post-chapter-six overflow becomes an unavoidable one-shot curve'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final balance curve audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('Final balance curve audit passed: room pressure rises while the reference player retains a multi-hit survival window through chapter twelve.');
