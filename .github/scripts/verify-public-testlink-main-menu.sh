#!/usr/bin/env bash
set -euo pipefail

page_url="https://ys2mm422yb-max.github.io/DungeonVeil/"
origin="https://ys2mm422yb-max.github.io"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
mkdir -p "$workdir/assets"

curl --fail --silent --show-error --location \
  --max-time 45 \
  --dump-header "$workdir/headers.txt" \
  --output "$workdir/index.html" \
  "$page_url"

mapfile -t queue < <(grep -oE '<script[^>]+src="[^"]+\.js"' "$workdir/index.html" \
  | sed -E 's/.*src="([^"]+)".*/\1/' \
  | sort -u)

if [[ ${#queue[@]} -eq 0 ]]; then
  echo "PUBLIC_TESTLINK_INDEX_HAS_NO_SCRIPT"
  head -n 40 "$workdir/index.html" || true
  exit 1
fi

declare -A seen=()
: > "$workdir/combined.js"
index=0

while [[ $index -lt ${#queue[@]} && $index -lt 200 ]]; do
  asset_path="${queue[$index]}"
  index=$((index + 1))

  case "$asset_path" in
    https://*) asset_url="$asset_path" ;;
    /*) asset_url="${origin}${asset_path}" ;;
    *) asset_url="${page_url}${asset_path#./}" ;;
  esac

  if [[ -n "${seen[$asset_url]:-}" ]]; then
    continue
  fi
  seen[$asset_url]=1

  asset_file="$workdir/assets/$(printf '%s' "$asset_url" | sha256sum | awk '{print $1}').js"
  if ! curl --fail --silent --show-error --location --max-time 90 --output "$asset_file" "$asset_url"; then
    echo "PUBLIC_ASSET_FETCH_FAILED=$asset_url"
    continue
  fi

  echo "PUBLIC_ASSET=$asset_url"
  cat "$asset_file" >> "$workdir/combined.js"
  printf '\n' >> "$workdir/combined.js"

  while IFS= read -r dependency; do
    queue+=("$dependency")
  done < <(grep -oE 'assets/[A-Za-z0-9._-]+\.js' "$asset_file" | sort -u || true)
done

missing=0
for marker in \
  main-menu-equipment-navigation \
  equipment-companion-section \
  equipment-category-tabs \
  inventory-tab-; do
  count="$(grep -Foc "$marker" "$workdir/combined.js" || true)"
  echo "MARKER_${marker}=$count"
  if [[ "$count" -lt 1 ]]; then
    missing=1
  fi
done

legacy_count="$(grep -Foc 'main-menu-companion-navigation' "$workdir/combined.js" || true)"
echo "MARKER_main-menu-companion-navigation=$legacy_count"
if [[ "$legacy_count" -ne 0 ]]; then
  missing=1
fi

echo "PUBLIC_ASSET_COUNT=${#seen[@]}"
echo "PUBLIC_COMBINED_SHA256=$(sha256sum "$workdir/combined.js" | awk '{print $1}')"

if [[ "$missing" -ne 0 ]]; then
  echo "PUBLIC_TESTLINK_PROOF=failure"
  exit 1
fi

echo "PUBLIC_TESTLINK_PROOF=success"
echo "PUBLIC_TESTLINK_URL=$page_url"
