#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Fehler: Dieses Verzeichnis ist kein Git-Repository." >&2
  exit 2
fi
cd "$repo_root"

prompt_file="$repo_root/.github/prompts/dungeon-veil-autopilot.md"
lock_dir="$repo_root/.git/dungeon-veil-autopilot.lock"
log_file="$repo_root/.git/dungeon-veil-autopilot.log"
last_message_file="$repo_root/.git/dungeon-veil-autopilot-last-message.txt"

cleanup() {
  rmdir "$lock_dir" 2>/dev/null || true
}
trap cleanup EXIT

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Der Dungeon-Veil-Autopilot läuft bereits in diesem Codespace." >&2
  echo "Öffne das vorhandene Autopilot-Terminal, statt einen zweiten Lauf zu starten." >&2
  exit 3
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Fehler: Codex CLI ist nicht installiert. Baue den Codespace neu auf oder führe .devcontainer/postCreate.sh aus." >&2
  exit 4
fi

if [[ ! -f "$repo_root/AGENTS.md" || ! -f "$prompt_file" ]]; then
  echo "Fehler: AGENTS.md oder der universelle Autopilot-Prompt fehlt." >&2
  exit 5
fi

worktree_state="$(git status --porcelain --untracked-files=normal)"
if [[ -n "$worktree_state" ]]; then
  echo "Sicherheitsstopp: Im Codespace liegen noch nicht committete Änderungen:" >&2
  printf '%s\n' "$worktree_state" >&2
  echo "Committe, stash oder verwerfe diese Änderungen, bevor du den Autopiloten erneut startest." >&2
  exit 6
fi

printf '\nDungeon Veil Autopilot startet.\n'
printf 'Repository: %s\n' "$repo_root"
printf 'Branch: %s\n' "$(git branch --show-current)"
printf 'Log: %s\n\n' "$log_file"

set +e
codex exec \
  --sandbox workspace-write \
  -c approval_policy=never \
  -c sandbox_workspace_write.network_access=true \
  --output-last-message "$last_message_file" \
  - < "$prompt_file" 2>&1 | tee "$log_file"
status=${PIPESTATUS[0]}
set -e

if [[ $status -eq 0 ]]; then
  printf '\nDungeon Veil Autopilot wurde sauber beendet.\n'
  printf 'Letzte Zusammenfassung: %s\n' "$last_message_file"
else
  printf '\nDungeon Veil Autopilot endete mit Status %s.\n' "$status" >&2
  printf 'Prüfe das Log: %s\n' "$log_file" >&2
fi

exit "$status"
