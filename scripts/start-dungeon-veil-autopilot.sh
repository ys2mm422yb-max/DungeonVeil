#!/usr/bin/env bash
set -Eeuo pipefail

repo_full_name="ys2mm422yb-max/DungeonVeil"
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
pass_prompt_file="$repo_root/.git/dungeon-veil-autopilot-pass-prompt.md"
cleanup_prompt_file="$repo_root/.git/dungeon-veil-autopilot-cleanup-prompt.md"
run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
max_work_passes="${DUNGEON_VEIL_AUTOPILOT_MAX_PASSES:-4}"

if [[ ! "$max_work_passes" =~ ^[1-8]$ ]]; then
  echo "Fehler: DUNGEON_VEIL_AUTOPILOT_MAX_PASSES muss zwischen 1 und 8 liegen." >&2
  exit 2
fi

release_active_launcher_lease_best_effort() {
  command -v gh >/dev/null 2>&1 || return 0
  command -v jq >/dev/null 2>&1 || return 0

  local matches encoded decoded comment_id body updated_body
  matches="$(
    gh api --paginate "repos/$repo_full_name/issues/376/comments?per_page=100" \
      --jq ".[] | select((.body // \"\") | contains(\"launcher_run_id: $run_id\")) | select((.body // \"\") | contains(\"status: active\")) | [.id, .body] | @base64" \
      2>/dev/null || true
  )"

  while IFS= read -r encoded; do
    [[ -n "$encoded" ]] || continue
    decoded="$(printf '%s' "$encoded" | base64 --decode 2>/dev/null || true)"
    [[ -n "$decoded" ]] || continue
    comment_id="$(printf '%s' "$decoded" | jq -r '.[0] // empty' 2>/dev/null || true)"
    body="$(printf '%s' "$decoded" | jq -r '.[1] // empty' 2>/dev/null || true)"
    [[ -n "$comment_id" && -n "$body" ]] || continue

    updated_body="$(
      printf '%s\n' "$body" | awk '
        BEGIN { replaced = 0 }
        {
          if (!replaced && $0 == "status: active") {
            print "status: released"
            replaced = 1
          } else {
            print
          }
        }
      '
    )"
    updated_body+=$'\n'"released_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    updated_body+=$'\n'"release_reason: launcher_exit_cleanup"
    updated_body+=$'\n'"resume: Start the Dungeon Veil Autopilot build task again; re-read live GitHub state and continue from the documented exact head."

    gh api --method PATCH "repos/$repo_full_name/issues/comments/$comment_id" \
      -f body="$updated_body" >/dev/null 2>&1 || true
  done <<< "$matches"
}

cleanup() {
  release_active_launcher_lease_best_effort
  rm -f "$pass_prompt_file" "$cleanup_prompt_file"
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

: > "$log_file"
: > "$last_message_file"

printf '\nDungeon Veil Autopilot startet.\n'
printf 'Repository: %s\n' "$repo_root"
printf 'Branch: %s\n' "$(git branch --show-current)"
printf 'Launcher-Run: %s\n' "$run_id"
printf 'Maximale Arbeitspässe: %s\n' "$max_work_passes"
printf 'Log: %s\n\n' "$log_file"

build_work_prompt() {
  local pass_number="$1"
  {
    cat "$prompt_file"
    cat <<EOF_PASS

## Dynamischer Launcher-Kontext

- launcher_run_id: $run_id
- work_pass: $pass_number/$max_work_passes
- previous_summary: $last_message_file

Dies ist ein Arbeitspass innerhalb desselben gestarteten Autopilot-Laufs. Nimm eine bereits von diesem launcher_run_id gehaltene aktive Lease wieder auf und verlängere sie, statt wegen des Passwechsels eine konkurrierende Lease anzulegen. Ein Pass, der nur GitHub liest, die Queue rekonstruiert, einen Branch wechselt, einen Fehler beschreibt oder auf bereits abgeschlossene Checks schaut, ist nicht abgeschlossen. Solange die gewählte Aufgabe lokal oder über GitHub weiter bearbeitbar ist, arbeite weiter und beende mit `AUTOPILOT_STATUS: continue`.
EOF_PASS
  } > "$pass_prompt_file"
}

build_cleanup_prompt() {
  cat > "$cleanup_prompt_file" <<EOF_CLEANUP
# Dungeon Veil Autopilot – erzwungener Abschluss-Handoff

Lies AGENTS.md und den aktuellen Live-Stand von Issue #376. Dies ist ausschließlich der Abschluss- und Handoff-Pass für launcher_run_id `$run_id`.

- Starte keine neue Produktaufgabe.
- Sichere bereits begonnene Arbeit: prüfe Diff und Tests, committe und pushe sichere vollständige Änderungen soweit möglich.
- Aktualisiere den betroffenen PR, das fachliche Issue und Issue #376 faktisch.
- Eine eigene Lease mit `launcher_run_id: $run_id` darf nicht aktiv bleiben. Setze sie passend auf `completed`, `released`, `waiting_external` oder `blocked_external` und nenne eine exakte Resume-Operation.
- Falls keine eigene aktive Lease existiert, dokumentiere nur den tatsächlichen Zustand; erfinde keine.
- Gib am Ende genau einen terminalen Marker aus:
  `AUTOPILOT_STATUS: completed`, `AUTOPILOT_STATUS: released`, `AUTOPILOT_STATUS: waiting_external` oder `AUTOPILOT_STATUS: blocked_external`.
- Gib danach eine Zeile `AUTOPILOT_NEXT: ...` mit der konkreten nächsten Operation aus.
EOF_CLEANUP
}

extract_status() {
  [[ -f "$last_message_file" ]] || return 0
  sed -nE 's/^AUTOPILOT_STATUS:[[:space:]]*(completed|continue|waiting_external|blocked_external|released)[[:space:]]*$/\1/p' "$last_message_file" | tail -n 1
}

run_codex_pass() {
  local label="$1"
  local input_file="$2"
  local pass_log="$repo_root/.git/dungeon-veil-autopilot-${label}.log"
  local pass_message="$repo_root/.git/dungeon-veil-autopilot-${label}-last-message.txt"
  local codex_status

  : > "$pass_log"
  : > "$pass_message"
  printf '\n===== Autopilot %s =====\n' "$label" | tee -a "$log_file"

  set +e
  codex exec \
    --sandbox workspace-write \
    -c approval_policy=never \
    -c sandbox_workspace_write.network_access=true \
    --output-last-message "$pass_message" \
    - < "$input_file" 2>&1 | tee -a "$log_file" "$pass_log"
  codex_status=${PIPESTATUS[0]}
  set -e

  if [[ -f "$pass_message" ]]; then
    cp "$pass_message" "$last_message_file"
  fi

  return "$codex_status"
}

terminal_status=""
overall_status=0
needs_cleanup=0

for ((pass_number = 1; pass_number <= max_work_passes; pass_number++)); do
  build_work_prompt "$pass_number"

  if run_codex_pass "pass-${pass_number}" "$pass_prompt_file"; then
    :
  else
    overall_status=$?
    [[ $overall_status -ne 0 ]] || overall_status=1
    needs_cleanup=1
    break
  fi

  pass_status="$(extract_status)"
  case "$pass_status" in
    completed|waiting_external|blocked_external|released)
      terminal_status="$pass_status"
      break
      ;;
    continue|"")
      if (( pass_number == max_work_passes )); then
        needs_cleanup=1
      fi
      ;;
    *)
      needs_cleanup=1
      ;;
  esac

done

if [[ -z "$terminal_status" && $needs_cleanup -eq 1 ]]; then
  build_cleanup_prompt
  if run_codex_pass "cleanup" "$cleanup_prompt_file"; then
    terminal_status="$(extract_status)"
    case "$terminal_status" in
      completed|waiting_external|blocked_external|released) ;;
      *)
        echo "Der Abschluss-Handoff lieferte keinen gültigen terminalen Statusmarker." >&2
        [[ $overall_status -ne 0 ]] || overall_status=7
        ;;
    esac
  else
    cleanup_status=$?
    [[ $overall_status -ne 0 ]] || overall_status=$cleanup_status
  fi
fi

if [[ -n "$terminal_status" ]]; then
  printf '\nDungeon Veil Autopilot wurde sauber beendet.\n'
  printf 'Status: %s\n' "$terminal_status"
  printf 'Letzte Zusammenfassung: %s\n' "$last_message_file"
else
  printf '\nDungeon Veil Autopilot endete ohne terminalen Status.\n' >&2
  printf 'Prüfe das Log: %s\n' "$log_file" >&2
  [[ $overall_status -ne 0 ]] || overall_status=8
fi

exit "$overall_status"
