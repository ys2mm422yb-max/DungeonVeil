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
node --check scripts/pr40-block5-total-room-audit.mjs
node scripts/pr40-block5-total-room-audit.mjs
node --check artifacts/dungeon-rpg/scripts/validate-all-rooms.mjs
pnpm --filter @workspace/dungeon-rpg audit:assets
pnpm --filter @workspace/dungeon-rpg audit:rooms
pnpm --filter @workspace/dungeon-rpg typecheck
pnpm --filter @workspace/dungeon-rpg build

rm -f scripts/pr40-block5-total-room-audit.mjs scripts/pr40-run-block5-total-room-audit.sh

git add -A
git diff --cached --check

git commit -m 'Validate all 50 rooms and fix expanded-world collision gaps'
git push origin "$BRANCH"

echo '=== Block 5 fertig ==='
git rev-parse HEAD
