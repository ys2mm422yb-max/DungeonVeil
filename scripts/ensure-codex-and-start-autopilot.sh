#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Fehler: Dieses Verzeichnis ist kein Git-Repository." >&2
  exit 2
fi
cd "$repo_root"

lock_dir="$repo_root/.git/dungeon-veil-autopilot.lock"
active_launcher_pattern='[s]tart-dungeon-veil-autopilot\.sh|[d]ungeon-veil-autopilot-full-access-runtime-[0-9]+\.sh'
if [[ -d "$lock_dir" ]]; then
  if pgrep -af "$active_launcher_pattern" >/dev/null 2>&1; then
    echo "Der Dungeon-Veil-Autopilot läuft bereits in diesem Codespace." >&2
    echo "Öffne das vorhandene Autopilot-Terminal, statt einen zweiten Lauf zu starten." >&2
    exit 3
  fi
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

canonical_launcher="$repo_root/scripts/start-dungeon-veil-autopilot.sh"
runtime_launcher="$repo_root/.git/dungeon-veil-autopilot-full-access-runtime-$$.sh"

# The canonical launcher intentionally keeps its conservative default. The saved
# Codespaces task is the explicitly trusted development worker, so it needs access
# to .git, browser processes and authenticated GitHub network operations.
sed \
  -e 's/--sandbox workspace-write/--sandbox danger-full-access/' \
  -e '/sandbox_workspace_write\.network_access=true/d' \
  "$canonical_launcher" > "$runtime_launcher"

if ! grep -q -- '--sandbox danger-full-access' "$runtime_launcher"; then
  rm -f "$runtime_launcher"
  echo "Fehler: Der Autopilot-Launcher konnte nicht auf Codespaces-Vollzugriff vorbereitet werden." >&2
  exit 5
fi

cleanup_runtime_launcher() {
  rm -f "$runtime_launcher"
}
trap cleanup_runtime_launcher EXIT

set +e
bash "$runtime_launcher"
status=$?
set -e
exit "$status"
