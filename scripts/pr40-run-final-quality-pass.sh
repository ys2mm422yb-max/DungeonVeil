#!/usr/bin/env bash
set -euo pipefail

SOURCE="scripts/pr40-final-quality-pass.sh"
RUNNER="scripts/pr40-run-final-quality-pass.sh"
TEMP_SCRIPT="$(mktemp)"
trap 'rm -f "$TEMP_SCRIPT"' EXIT

awk -v runner="$RUNNER" '
  BEGIN { aliasesAdded = 0 }
  /^const ROOM_OVERRIDES:/ && aliasesAdded == 0 {
    print "const H = '\''halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf'\'';"
    print "const A = '\''adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf'\'';"
    print ""
    aliasesAdded = 1
  }
  $0 == "git rm \"$SCRIPT_PATH\"" {
    print "git rm \"$SCRIPT_PATH\" \"" runner "\""
    next
  }
  { print }
' "$SOURCE" > "$TEMP_SCRIPT"

bash "$TEMP_SCRIPT"
