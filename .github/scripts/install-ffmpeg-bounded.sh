#!/usr/bin/env bash
set -euo pipefail

readonly apt_bounds_file="/etc/apt/apt.conf.d/99dungeon-veil-network-bounds"
readonly apt_mirrors_file="/etc/apt/apt-mirrors.txt"
readonly fallback_mirror="http://us.archive.ubuntu.com/ubuntu/"
readonly attempt_timeout_seconds=180
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
      echo "apt/dpkg locks remained busy after ${package_lock_wait_seconds}s; refusing to continue ffmpeg provisioning." >&2
      return 1
    fi
    sleep 2
  done
}

terminate_session() {
  local session_pid="$1"
  sudo kill -TERM -- "-$session_pid" >/dev/null 2>&1 || true
  for _ in {1..10}; do
    if ! sudo kill -0 -- "-$session_pid" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if sudo kill -0 -- "-$session_pid" >/dev/null 2>&1; then
    sudo kill -KILL -- "-$session_pid" >/dev/null 2>&1 || true
  fi
  wait "$session_pid" >/dev/null 2>&1 || true
}

provision_ffmpeg() {
  local session_pid watcher_status
  wait_for_package_manager

  setsid bash -c 'set -euo pipefail; sudo apt-get update; sudo apt-get install --yes --no-install-recommends ffmpeg' &
  session_pid=$!

  if timeout --signal=TERM --kill-after=5s "${attempt_timeout_seconds}s" \
    bash -c 'pid="$1"; while kill -0 "$pid" >/dev/null 2>&1; do sleep 1; done' bash "$session_pid"; then
    wait "$session_pid"
    return $?
  else
    watcher_status=$?
  fi

  echo "ffmpeg apt provisioning exceeded the bounded attempt; terminating its complete process group before fallback." >&2
  terminate_session "$session_pid"
  wait_for_package_manager
  return "$watcher_status"
}

if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -version | head -n 1
  exit 0
fi

if provision_ffmpeg; then
  command -v ffmpeg
  ffmpeg -version | head -n 1
  exit 0
fi

echo "Default Ubuntu package source did not complete bounded ffmpeg provisioning; switching to the explicit fallback mirror." >&2
wait_for_package_manager

if [[ -f "$apt_mirrors_file" ]]; then
  printf '%s\n' "$fallback_mirror" | sudo tee "$apt_mirrors_file" >/dev/null
fi

for sources_file in /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do
  [[ -f "$sources_file" ]] || continue
  sudo sed -i -E \
    -e "s#https?://(azure\.)?archive\.ubuntu\.com/ubuntu/?#${fallback_mirror}#g" \
    -e "s#https?://security\.ubuntu\.com/ubuntu/?#${fallback_mirror}#g" \
    "$sources_file"
done

sudo rm -rf /var/lib/apt/lists/*
sudo dpkg --configure -a
provision_ffmpeg
command -v ffmpeg
ffmpeg -version | head -n 1
