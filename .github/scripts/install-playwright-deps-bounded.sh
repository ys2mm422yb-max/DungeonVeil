#!/usr/bin/env bash
set -euo pipefail

browser="${1:?browser is required}"
readonly apt_bounds_file="/etc/apt/apt.conf.d/99dungeon-veil-network-bounds"
readonly fallback_mirror="http://us.archive.ubuntu.com/ubuntu/"

sudo tee "$apt_bounds_file" >/dev/null <<'EOF'
Acquire::Retries "1";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::ForceIPv4 "true";
DPkg::Lock::Timeout "30";
EOF

install_deps() {
  timeout --signal=TERM --kill-after=30s 5m \
    pnpm --dir artifacts/dungeon-rpg exec playwright install-deps "$browser"
}

if install_deps; then
  exit 0
fi

echo "Default Ubuntu package source did not complete Playwright install-deps within the bounded attempt; switching to the explicit fallback mirror." >&2

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
