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
node scripts/pr40-block3-asset-audit.mjs
pnpm --filter @workspace/dungeon-rpg audit:assets
pnpm --filter @workspace/dungeon-rpg typecheck
pnpm --filter @workspace/dungeon-rpg build

rm -f scripts/pr40-block3-asset-audit.mjs scripts/pr40-run-block3-asset-audit.sh

git add \
  artifacts/dungeon-rpg/package.json \
  artifacts/dungeon-rpg/src/game/worldAssetCatalog.ts \
  artifacts/dungeon-rpg/scripts/audit-kaykit-assets.mjs \
  artifacts/dungeon-rpg/public/assets/kaykit/asset-audit.json \
  scripts/pr40-block3-asset-audit.mjs \
  scripts/pr40-run-block3-asset-audit.sh

git diff --cached --check

git commit -m 'Catalog all asset packs and define world biome palettes'
git push origin "$BRANCH"

echo '=== Block 3 fertig ==='
git rev-parse HEAD
