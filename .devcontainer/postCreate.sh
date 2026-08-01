#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile

if ! command -v codex >/dev/null 2>&1; then
  npm install --global @openai/codex@latest
fi

cat <<'MESSAGE'
Dungeon Veil Codespace is ready.

Next steps:
  1. Run `codex` and sign in with ChatGPT (no API key required).
  2. Read AGENTS.md and Issue #376 before changing files.
  3. Create or switch to a focused branch before committing.
  4. Start the game with `pnpm --filter @workspace/dungeon-rpg dev`.
MESSAGE
