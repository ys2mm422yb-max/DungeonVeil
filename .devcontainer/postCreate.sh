#!/usr/bin/env bash
set -u -o pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

codex_prefix="${DUNGEON_VEIL_CODEX_PREFIX:-$HOME/.local}"
export npm_config_prefix="$codex_prefix"
export PATH="$codex_prefix/bin:$PATH"

mkdir -p "$codex_prefix/bin" "$codex_prefix/lib"

if ! command -v codex >/dev/null 2>&1; then
  echo "Installing Codex CLI into $codex_prefix ..."
  if ! npm install --global @openai/codex@latest; then
    echo "Warning: Codex CLI installation failed during container creation. The Autopilot build task will retry automatically." >&2
  fi
fi

if ! corepack prepare pnpm@9.15.9 --activate; then
  echo "Warning: pnpm activation failed during container creation. Retry from the terminal if dependency installation is needed." >&2
elif ! pnpm install --frozen-lockfile; then
  echo "Warning: workspace dependency installation failed during container creation. The Codespace remains usable; retry pnpm install later." >&2
fi

cat <<'MESSAGE'
Dungeon Veil Codespace is ready.

Next steps:
  1. Run the default build task `Dungeon Veil: Autopilot starten`.
  2. The task installs or repairs the Codex CLI automatically when needed.
  3. Read AGENTS.md and Issue #376 before changing files.
  4. Create or switch to a focused branch before committing.
  5. Start the game with `pnpm --filter @workspace/dungeon-rpg dev`.
MESSAGE
