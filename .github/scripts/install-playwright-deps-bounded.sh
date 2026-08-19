#!/usr/bin/env bash
set -euo pipefail

browser="${1:?browser is required}"
readonly apt_bounds_file="/etc/apt/apt.conf.d/99dungeon-veil-network-bounds"
readonly fallback_mirror="http://us.archive.ubuntu.com/ubuntu/"
readonly install_timeout_seconds=300
readonly package_lock_wait_seconds=90

sudo tee "$apt_bounds_file" >/dev/null <<'EOF'
Acquire::Retries "1";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::ForceIPv4 "true";
DPkg::Lock::Timeout "30";
EOF

package_manager_busy() {
  local lock
  for lock in \
    /var/lib/dpkg/lock-frontend \
    /var/lib/dpkg/lock \
    /var/cache/apt/archives/lock \
    /var/lib/apt/lists/lock; do
    [[ -e "$lock" ]] || continue
    if sudo fuser "$lock" >/dev/null 2>&1; then
      return 0
    fi
  done
  return 1
}

wait_for_package_manager() {
  local deadline=$((SECONDS + package_lock_wait_seconds))
  while package_manager_busy; do
    if (( SECONDS >= deadline )); then
      echo "apt/dpkg locks remained busy after ${package_lock_wait_seconds}s; refusing to mutate package sources while a package manager is active." >&2
      return 1
    fi
    sleep 2
  done
}

terminate_install_session() {
  local session_pid="$1"

  kill -TERM -- "-$session_pid" >/dev/null 2>&1 || true
  for _ in {1..10}; do
    if ! kill -0 "$session_pid" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if kill -0 "$session_pid" >/dev/null 2>&1; then
    kill -KILL -- "-$session_pid" >/dev/null 2>&1 || true
  fi
  wait "$session_pid" >/dev/null 2>&1 || true
}

install_deps() {
  local session_pid watcher_status

  setsid pnpm --dir artifacts/dungeon-rpg exec playwright install-deps "$browser" &
  session_pid=$!

  if timeout --signal=TERM --kill-after=5s "${install_timeout_seconds}s" \
    bash -c 'pid="$1"; while kill -0 "$pid" >/dev/null 2>&1; do sleep 1; done' bash "$session_pid"; then
    wait "$session_pid"
    return $?
  else
    watcher_status=$?
  fi

  echo "Playwright install-deps exceeded the bounded attempt; terminating its complete process group before fallback." >&2
  terminate_install_session "$session_pid"
  wait_for_package_manager
  return "$watcher_status"
}

if install_deps; then
  exit 0
fi

echo "Default Ubuntu package source did not complete Playwright install-deps within the bounded attempt; switching to the explicit fallback mirror." >&2

# The failed attempt must be completely quiescent before package metadata or dpkg state is touched.
wait_for_package_manager

for sources_file in /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do
  [[ -f "$sources_file" ]] || continue
  sudo sed -i -E \
    -e "s#https?://(azure\.)?archive\.ubuntu\.com/ubuntu/?#${fallback_mirror}#g" \
    -e "s#https?://security\.ubuntu\.com/ubuntu/?#${fallback_mirror}#g" \
    "$sources_file"
done

sudo rm -rf /var/lib/apt/lists/*
sudo dpkg --configure -a

install_deps
