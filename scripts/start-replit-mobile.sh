#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pkill -f "vite --config vite.config.ts" 2>/dev/null || true
rm -f /tmp/dungeon-veil-vite.log

nohup pnpm dev >/tmp/dungeon-veil-vite.log 2>&1 &
server_pid=$!

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat /tmp/dungeon-veil-vite.log
    exit 1
  fi
  sleep 1
done

if ! curl -fsS http://127.0.0.1:3000/ >/dev/null 2>&1; then
  echo "Dungeon Veil konnte Port 3000 nicht öffnen." >&2
  cat /tmp/dungeon-veil-vite.log
  exit 1
fi

echo
echo "Dungeon Veil läuft auf Port 3000."
if [[ -n "${REPLIT_DEV_DOMAIN:-}" ]]; then
  echo "Öffnen: https://${REPLIT_DEV_DOMAIN}"
else
  echo "Öffne den von Replit für Port 3000 angezeigten replit.dev-Link."
fi
echo
tail -n 12 /tmp/dungeon-veil-vite.log
