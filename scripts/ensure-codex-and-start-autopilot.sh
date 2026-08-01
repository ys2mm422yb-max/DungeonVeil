#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Fehler: Dieses Verzeichnis ist kein Git-Repository." >&2
  exit 2
fi
cd "$repo_root"

lock_dir="$repo_root/.git/dungeon-veil-autopilot.lock"
if [[ -d "$lock_dir" ]] && ! pgrep -af '[s]tart-dungeon-veil-autopilot\.sh' >/dev/null 2>&1; then
  rmdir "$lock_dir" 2>/dev/null || true
  echo "Verwaiste Autopilot-Sperre nach Codespace-Neustart entfernt."
fi

codex_prefix="${DUNGEON_VEIL_CODEX_PREFIX:-$HOME/.local}"
export npm_config_prefix="$codex_prefix"
export PATH="$codex_prefix/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo "Fehler: npm fehlt in diesem Codespace. Baue den Container neu auf." >&2
  exit 4
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI fehlt und wird jetzt automatisch installiert ..."
  mkdir -p "$codex_prefix/bin" "$codex_prefix/lib"
  npm install --global @openai/codex@latest
  hash -r
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Fehler: Codex CLI konnte nicht installiert werden." >&2
  exit 4
fi

exec bash "$repo_root/scripts/start-dungeon-veil-autopilot.sh"
