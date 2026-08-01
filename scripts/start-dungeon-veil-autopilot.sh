#!/usr/bin/env bash
set -Eeuo pipefail

parse_task_status() {
  local status_file="$1"
  [[ -f "$status_file" ]] || return 0
  sed -nE 's/^AUTOPILOT_TASK_STATUS:[[:space:]]*(continue|completed|waiting_external|blocked_external|released)[[:space:]]*$/\1/p' "$status_file" | tail -n 1
}

parse_queue_status() {
  local status_file="$1"
  [[ -f "$status_file" ]] || return 0
  sed -nE 's/^AUTOPILOT_QUEUE_STATUS:[[:space:]]*(same_task|next_task|empty|globally_blocked|budget_exhausted)[[:space:]]*$/\1/p' "$status_file" | tail -n 1
}

parse_legacy_status() {
  local status_file="$1"
  [[ -f "$status_file" ]] || return 0
  sed -nE 's/^AUTOPILOT_STATUS:[[:space:]]*(completed|continue|waiting_external|blocked_external|released)[[:space:]]*$/\1/p' "$status_file" | tail -n 1
}

normalize_status_pair() {
  local status_file="$1"
  local task_status queue_status legacy_status

  task_status="$(parse_task_status "$status_file")"
  queue_status="$(parse_queue_status "$status_file")"

  if [[ -z "$task_status" || -z "$queue_status" ]]; then
    legacy_status="$(parse_legacy_status "$status_file")"
    if [[ -n "$legacy_status" ]]; then
      case "$legacy_status" in
        continue)
          task_status="continue"
          queue_status="same_task"
          ;;
        completed|waiting_external|released)
          task_status="$legacy_status"
          queue_status="next_task"
          ;;
        blocked_external)
          task_status="blocked_external"
          queue_status="globally_blocked"
          ;;
      esac
    fi
  fi

  printf '%s|%s\n' "$task_status" "$queue_status"
}

run_status_parser_self_test() {
  local tmp_dir case_file actual expected
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  assert_pair() {
    local name="$1"
    expected="$2"
    shift 2
    case_file="$tmp_dir/$name.txt"
    printf '%s\n' "$@" > "$case_file"
    actual="$(normalize_status_pair "$case_file")"
    if [[ "$actual" != "$expected" ]]; then
      echo "Status parser self-test failed: $name expected $expected, got $actual" >&2
      return 1
    fi
  }

  assert_pair same-task "continue|same_task" \
    "AUTOPILOT_TASK_STATUS: continue" \
    "AUTOPILOT_QUEUE_STATUS: same_task" \
    "AUTOPILOT_NEXT: keep fixing the current exact-head defect"

  assert_pair next-task "waiting_external|next_task" \
    "AUTOPILOT_TASK_STATUS: waiting_external" \
    "AUTOPILOT_QUEUE_STATUS: next_task" \
    "AUTOPILOT_NEXT: select the next independent product task"

  assert_pair queue-empty "completed|empty" \
    "AUTOPILOT_TASK_STATUS: completed" \
    "AUTOPILOT_QUEUE_STATUS: empty" \
    "AUTOPILOT_NEXT: none"

  assert_pair global-block "blocked_external|globally_blocked" \
    "AUTOPILOT_TASK_STATUS: blocked_external" \
    "AUTOPILOT_QUEUE_STATUS: globally_blocked" \
    "AUTOPILOT_NEXT: restore GitHub authentication"

  assert_pair budget "released|budget_exhausted" \
    "AUTOPILOT_TASK_STATUS: released" \
    "AUTOPILOT_QUEUE_STATUS: budget_exhausted" \
    "AUTOPILOT_NEXT: start the launcher again"

  assert_pair legacy-wait "waiting_external|next_task" \
    "AUTOPILOT_STATUS: waiting_external" \
    "AUTOPILOT_NEXT: old launcher compatibility"

  assert_pair legacy-continue "continue|same_task" \
    "AUTOPILOT_STATUS: continue" \
    "AUTOPILOT_NEXT: old launcher compatibility"

  echo "Dungeon Veil Autopilot status parser self-test passed."
}

if [[ "${1:-}" == "--self-test-status-parser" ]]; then
  run_status_parser_self_test
  exit 0
fi

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
max_work_passes="${DUNGEON_VEIL_AUTOPILOT_MAX_PASSES:-16}"
max_runtime_minutes="${DUNGEON_VEIL_AUTOPILOT_MAX_RUNTIME_MINUTES:-180}"
start_epoch="$(date +%s)"

if [[ ! "$max_work_passes" =~ ^([1-9]|[12][0-9]|3[0-2])$ ]]; then
  echo "Fehler: DUNGEON_VEIL_AUTOPILOT_MAX_PASSES muss zwischen 1 und 32 liegen." >&2
  exit 2
fi

if [[ ! "$max_runtime_minutes" =~ ^[0-9]+$ ]] || (( max_runtime_minutes < 15 || max_runtime_minutes > 720 )); then
  echo "Fehler: DUNGEON_VEIL_AUTOPILOT_MAX_RUNTIME_MINUTES muss zwischen 15 und 720 liegen." >&2
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

if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Der Dungeon-Veil-Autopilot läuft bereits in diesem Codespace." >&2
  echo "Öffne das vorhandene Autopilot-Terminal, statt einen zweiten Lauf zu starten." >&2
  exit 3
fi
trap cleanup EXIT

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
printf 'Maximale Laufzeit: %s Minuten\n' "$max_runtime_minutes"
printf 'Log: %s\n\n' "$log_file"

runtime_budget_reached() {
  local now elapsed
  now="$(date +%s)"
  elapsed=$(( now - start_epoch ))
  (( elapsed >= max_runtime_minutes * 60 ))
}

build_work_prompt() {
  local pass_number="$1"
  local queue_mode="$2"
  {
    cat "$prompt_file"
    cat <<EOF_PASS

## Dynamischer Launcher-Kontext

- launcher_run_id: $run_id
- work_pass: $pass_number/$max_work_passes
- queue_mode: $queue_mode
- previous_summary: $last_message_file
- max_runtime_minutes: $max_runtime_minutes

Dies ist ein Arbeitspass innerhalb desselben gestarteten Autopilot-Laufs.

- Bei `queue_mode: resume_current_task` nimm die bereits von diesem `launcher_run_id` gehaltene aktive Lease wieder auf und verlängere sie.
- Bei `queue_mode: select_next_task` muss die vorherige Aufgaben-Lease bereits terminal sein. Rekonstruiere die Queue vollständig neu, wähle die höchste sichere freie Produktaufgabe und lege erst dann eine neue Lease mit demselben `launcher_run_id` an.
- Eine reine Bestandsaufnahme, ein Branchwechsel, das Warten auf eine einzelne PR-Prüfung oder das bloße Dokumentieren eines behebbaren Fehlers beendet den Gesamtlauf nicht.
- Läuft eine Prüfung für die aktuelle Aufgabe, terminalisiere deren Lease korrekt und wähle `next_task`, sobald eine unabhängige Produktaufgabe frei ist.
EOF_PASS
  } > "$pass_prompt_file"
}

build_cleanup_prompt() {
  cat > "$cleanup_prompt_file" <<EOF_CLEANUP
# Dungeon Veil Autopilot – erzwungener Abschluss-Handoff

Lies AGENTS.md und den aktuellen Live-Stand von Issue #376. Dies ist ausschließlich der Abschluss- und Handoff-Pass für launcher_run_id \`$run_id\`.

- Starte keine neue Produktaufgabe.
- Sichere bereits begonnene Arbeit: prüfe Diff und Tests, committe und pushe sichere vollständige Änderungen soweit möglich.
- Aktualisiere den betroffenen PR, das fachliche Issue, Roadmap #323 und Issue #376 faktisch.
- Eine eigene Lease mit \`launcher_run_id: $run_id\` darf nicht aktiv bleiben. Setze sie passend auf \`completed\`, \`released\`, \`waiting_external\` oder \`blocked_external\` und nenne eine exakte Resume-Operation.
- Falls keine eigene aktive Lease existiert, dokumentiere nur den tatsächlichen Zustand; erfinde keine.
- Gib am Ende genau diese drei Zeilen aus:
  \`AUTOPILOT_TASK_STATUS: completed|waiting_external|blocked_external|released\`
  \`AUTOPILOT_QUEUE_STATUS: empty|globally_blocked|budget_exhausted\`
  \`AUTOPILOT_NEXT: konkrete nächste Operation\`
EOF_CLEANUP
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

queue_mode="select_next_task"
terminal_status=""
overall_status=0
needs_cleanup=0
completed_passes=0

for ((pass_number = 1; pass_number <= max_work_passes; pass_number++)); do
  if runtime_budget_reached; then
    terminal_status="budget_exhausted"
    needs_cleanup=1
    break
  fi

  build_work_prompt "$pass_number" "$queue_mode"

  if run_codex_pass "pass-${pass_number}" "$pass_prompt_file"; then
    :
  else
    overall_status=$?
    [[ $overall_status -ne 0 ]] || overall_status=1
    terminal_status="codex_error"
    needs_cleanup=1
    break
  fi

  completed_passes=$pass_number
  status_pair="$(normalize_status_pair "$last_message_file")"
  task_status="${status_pair%%|*}"
  queue_status="${status_pair#*|}"

  case "$queue_status" in
    same_task)
      if [[ "$task_status" != "continue" ]]; then
        echo "Ungültige Statuskombination: $task_status / $queue_status" >&2
        terminal_status="invalid_status"
        needs_cleanup=1
        break
      fi
      queue_mode="resume_current_task"
      ;;
    next_task)
      case "$task_status" in
        completed|waiting_external|blocked_external|released)
          queue_mode="select_next_task"
          ;;
        *)
          echo "Ungültige Statuskombination: $task_status / $queue_status" >&2
          terminal_status="invalid_status"
          needs_cleanup=1
          break 2
          ;;
      esac
      ;;
    empty)
      case "$task_status" in
        completed|waiting_external|blocked_external|released)
          terminal_status="queue_empty"
          ;;
        *)
          terminal_status="invalid_status"
          needs_cleanup=1
          ;;
      esac
      break
      ;;
    globally_blocked)
      case "$task_status" in
        waiting_external|blocked_external|released)
          terminal_status="globally_blocked"
          ;;
        *)
          terminal_status="invalid_status"
          needs_cleanup=1
          ;;
      esac
      break
      ;;
    budget_exhausted)
      case "$task_status" in
        completed|waiting_external|blocked_external|released)
          terminal_status="budget_exhausted"
          ;;
        *)
          terminal_status="invalid_status"
          needs_cleanup=1
          ;;
      esac
      break
      ;;
    *)
      echo "Der Arbeitspass lieferte keine gültigen Aufgaben-/Queue-Statusmarker." >&2
      terminal_status="invalid_status"
      needs_cleanup=1
      break
      ;;
  esac
done

if [[ -z "$terminal_status" && $completed_passes -ge $max_work_passes ]]; then
  terminal_status="budget_exhausted"
  needs_cleanup=1
fi

if [[ $needs_cleanup -eq 1 ]]; then
  build_cleanup_prompt
  if run_codex_pass "cleanup" "$cleanup_prompt_file"; then
    cleanup_pair="$(normalize_status_pair "$last_message_file")"
    cleanup_task_status="${cleanup_pair%%|*}"
    cleanup_queue_status="${cleanup_pair#*|}"
    case "$cleanup_task_status|$cleanup_queue_status" in
      completed\|empty|waiting_external\|empty|released\|empty|blocked_external\|globally_blocked|waiting_external\|globally_blocked|released\|globally_blocked|completed\|budget_exhausted|waiting_external\|budget_exhausted|blocked_external\|budget_exhausted|released\|budget_exhausted)
        ;;
      *)
        echo "Der Abschluss-Handoff lieferte keinen gültigen terminalen Aufgaben-/Queue-Status." >&2
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
  printf 'Arbeitspässe: %s/%s\n' "$completed_passes" "$max_work_passes"
  printf 'Letzte Zusammenfassung: %s\n' "$last_message_file"
else
  printf '\nDungeon Veil Autopilot endete ohne terminalen Status.\n' >&2
  printf 'Prüfe das Log: %s\n' "$log_file" >&2
  [[ $overall_status -ne 0 ]] || overall_status=8
fi

exit "$overall_status"
