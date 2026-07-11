#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "Falscher Branch: $CURRENT_BRANCH"
  echo "Erwartet: $BRANCH"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo 'Arbeitsbaum ist nicht sauber. Bitte keine lokalen Änderungen offen lassen.'
  git status --short
  exit 1
fi

git pull --ff-only origin "$BRANCH"

node <<'NODE'
const fs = require('node:fs');
const target = 'scripts/pr40-block4-world-expansion.mjs';
let source = fs.readFileSync(target, 'utf8');
const startMarker = 'const expansion = String.raw`';
const closeMarker = "`;\nwrite('src/game/expandedWorldRooms.ts', expansion);";
const start = source.indexOf(startMarker);
const close = source.indexOf(closeMarker, start + startMarker.length);
if (start < 0 || close < 0) {
  throw new Error('Block-4 generator markers were not found');
}
const generatedTypeScript = source.slice(start + startMarker.length, close);
const safeDeclaration = `const expansion = ${JSON.stringify(generatedTypeScript)};\nwrite('src/game/expandedWorldRooms.ts', expansion);`;
source = source.slice(0, start) + safeDeclaration + source.slice(close + closeMarker.length);
fs.writeFileSync(target, source);
console.log('Block-4 generator quoting repaired.');
NODE

node --check scripts/pr40-block4-world-expansion.mjs
node scripts/pr40-block4-world-expansion.mjs
pnpm --filter @workspace/dungeon-rpg audit:assets
pnpm --filter @workspace/dungeon-rpg typecheck
pnpm --filter @workspace/dungeon-rpg build

rm -f \
  scripts/pr40-block4-world-expansion.mjs \
  scripts/pr40-run-block4-world-expansion.sh \
  scripts/pr40-run-block4-world-expansion-fixed.sh

git add -A \
  artifacts/dungeon-rpg/src \
  artifacts/dungeon-rpg/public/assets/kaykit/asset-audit.json \
  scripts/pr40-block4-world-expansion.mjs \
  scripts/pr40-run-block4-world-expansion.sh \
  scripts/pr40-run-block4-world-expansion-fixed.sh

git diff --cached --check

git commit -m 'Expand the run with meadow, darkwood and ember fortress regions'
git push origin "$BRANCH"

echo '=== Block 4 fertig ==='
git rev-parse HEAD
