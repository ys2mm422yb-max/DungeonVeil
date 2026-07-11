#!/usr/bin/env bash
set -euo pipefail

BRANCH="work/blocks-1-7-production-pass"
MIGRATION="scripts/pr40-live-master-pass.mjs"
RUNNER="scripts/pr40-run-live-master-pass.sh"
ROOT="artifacts/dungeon-rpg"

printf '=== Branch synchronisieren ===\n'
git fetch origin
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "FEHLER: Arbeitsverzeichnis ist nicht sauber."
  git status --short
  exit 1
fi

printf '=== Migrationsdatei validieren ===\n'
MIGRATION="$MIGRATION" node --input-type=commonjs <<'NODE'
const fs = require('fs');
const file = process.env.MIGRATION;
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('const roomBlock = String.raw`');
const end = source.indexOf('\n\nlet rooms = read(files.rooms);', start);
if (start < 0 || end < 0) throw new Error('Raum-Template der Migration wurde nicht gefunden');
let segment = source.slice(start, end)
  .replace('const roomBlock = String.raw`', 'const roomBlock = `')
  .replace(/\$\{([FDRTHA])\}/g, (_match, name) => `\\\${${name}}`);
source = source.slice(0, start) + segment + source.slice(end);
fs.writeFileSync(file, source);
NODE
node --check "$MIGRATION"

printf '=== Kernfehler und Räume 1–20 überarbeiten ===\n'
node "$MIGRATION"

printf '=== Statische Prüfungen ===\n'
git diff --check
grep -q "private shotPathBlocked" "$ROOT/src/game/runEngine.ts"
grep -q "size: 74" "$ROOT/src/game/runEngine.ts"
grep -q "centerSceneOnRoot" "$ROOT/src/components/kaykitEnemy3D.ts"
grep -q "BOSSHEILIGTUM" "$ROOT/src/components/CombatStage.tsx"

printf '=== TypeScript und Produktions-Build ===\n'
pnpm --filter @workspace/dungeon-rpg typecheck
pnpm --filter @workspace/dungeon-rpg build

printf '=== Geänderte Dateien prüfen ===\n'
git diff --stat
unexpected="$(git diff --name-only | grep -Ev '^(artifacts/dungeon-rpg/src/(game/(runEngine|roomCollision3D|logicalRoomSetpieces)\.ts|components/(RunCameraRig\.ts|GameCanvasKayKit3D\.tsx|kaykitRoom3D\.ts|kaykitRoomThemes3D\.ts|kaykitEnemy3D\.ts|HUD\.tsx|CombatStage\.tsx))|scripts/pr40-(live-master-pass\.mjs|run-live-master-pass\.sh))$' || true)"
if [[ -n "$unexpected" ]]; then
  echo "FEHLER: Unerwartete Dateien wurden verändert:"
  printf '%s\n' "$unexpected"
  exit 1
fi

printf '=== Commit und Push ===\n'
git add \
  "$ROOT/src/game/runEngine.ts" \
  "$ROOT/src/game/roomCollision3D.ts" \
  "$ROOT/src/game/logicalRoomSetpieces.ts" \
  "$ROOT/src/components/RunCameraRig.ts" \
  "$ROOT/src/components/GameCanvasKayKit3D.tsx" \
  "$ROOT/src/components/kaykitRoom3D.ts" \
  "$ROOT/src/components/kaykitRoomThemes3D.ts" \
  "$ROOT/src/components/kaykitEnemy3D.ts" \
  "$ROOT/src/components/HUD.tsx" \
  "$ROOT/src/components/CombatStage.tsx"

git rm "$MIGRATION" "$RUNNER"
git commit -m "Finish room quality, projectile collision and boss targeting"
git push origin "$BRANCH"

printf '=== Live-Master-Pass fertig ===\n'
printf 'Commit: '
git rev-parse HEAD
