#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
PATCH_SCRIPT='scripts/pr40-block2-enemy-motion.mjs'
RUNNER='scripts/pr40-run-block2-enemy-motion.sh'

printf '\n=== Branch pruefen ===\n'
current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$BRANCH" ]]; then
  echo "Falscher Branch: $current_branch"
  echo "Erwartet: $BRANCH"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Arbeitsbaum ist nicht sauber. Bitte nichts manuell loeschen.'
  git status --short
  exit 1
fi

printf '\n=== Branch synchronisieren ===\n'
git pull --ff-only origin "$BRANCH"

printf '\n=== Block 2 anwenden ===\n'
node "$PATCH_SCRIPT"

printf '\n=== TypeScript pruefen ===\n'
pnpm --filter @workspace/dungeon-rpg typecheck

printf '\n=== Produktions-Build pruefen ===\n'
pnpm --filter @workspace/dungeon-rpg build

printf '\n=== Diff pruefen ===\n'
git diff --check
git diff --stat

printf '\n=== Commit und Push ===\n'
git add \
  artifacts/dungeon-rpg/src/components/kaykitEnemy3D.ts \
  artifacts/dungeon-rpg/src/game/runEngine.ts \
  artifacts/dungeon-rpg/src/game/enemyRunAI.ts

git rm -f "$PATCH_SCRIPT" "$RUNNER"
git diff --cached --check

git commit -m 'Tune humanoid movement and attack timing'
git push origin "$BRANCH"

printf '\n=== Block 2 fertig ===\n'
git rev-parse HEAD
