#!/usr/bin/env bash
set -euo pipefail

BRANCH="work/blocks-1-7-production-pass"
MIGRATION="scripts/pr40-block1-room-finish.mjs"
RUNNER="scripts/pr40-run-block1-room-finish.sh"
ROOT="artifacts/dungeon-rpg"

printf '=== Block 1: Branch synchronisieren ===\n'
git fetch origin
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "FEHLER: Arbeitsverzeichnis ist nicht sauber."
  git status --short
  exit 1
fi

printf '=== Block 1: Räume 1–10 finalisieren ===\n'
node "$MIGRATION"

git diff --check
grep -q "verticalScale = spec.room === 3 ? 2.75" "$ROOT/src/components/kaykitRoom3D.ts"
grep -q "cleanFloorRoom" "$ROOT/src/components/kaykitRoom3D.ts"
grep -q "maxRadius: 64" "$ROOT/src/game/runEngine.ts"

printf '=== Block 1: TypeScript und Produktions-Build ===\n'
pnpm --filter @workspace/dungeon-rpg typecheck
pnpm --filter @workspace/dungeon-rpg build

printf '=== Block 1: Geänderte Dateien ===\n'
git diff --stat
unexpected="$(git diff --name-only | grep -Ev '^(artifacts/dungeon-rpg/src/(components/kaykitRoom3D\.ts|game/(roomBible|runEngine)\.ts)|scripts/pr40-(block1-room-finish\.mjs|run-block1-room-finish\.sh))$' || true)"
if [[ -n "$unexpected" ]]; then
  echo "FEHLER: Unerwartete Dateien wurden verändert:"
  printf '%s\n' "$unexpected"
  exit 1
fi

printf '=== Block 1: Commit und Push ===\n'
git add \
  "$ROOT/src/components/kaykitRoom3D.ts" \
  "$ROOT/src/game/roomBible.ts" \
  "$ROOT/src/game/runEngine.ts"
git rm -f "$MIGRATION" "$RUNNER"
git commit -m "Finish rooms 1-10 architecture and portal staging"
git push origin "$BRANCH"

printf '=== Block 1 fertig ===\n'
printf 'Commit: '
git rev-parse HEAD
