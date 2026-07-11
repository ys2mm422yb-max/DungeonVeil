#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
ROOT='asset-imports/extracted'
DEST='artifacts/dungeon-rpg/public/assets/imported'
SCRIPT_PATH='scripts/pr40-import-selected-assets.sh'

cd "$(git rev-parse --show-toplevel)"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "FEHLER: Aktiver Branch ist nicht $BRANCH"
  exit 1
fi

if ! git check-ignore -q "$ROOT/"; then
  echo "FEHLER: $ROOT ist nicht durch .gitignore geschützt."
  exit 1
fi

if git ls-files 'asset-imports/**' | grep -q .; then
  echo 'FEHLER: Dateien aus asset-imports werden bereits von Git erfasst.'
  git ls-files 'asset-imports/**'
  exit 1
fi

if ! git diff --cached --quiet; then
  echo 'FEHLER: Im Git-Index liegen bereits vorgemerkte Änderungen.'
  git diff --cached --name-only
  exit 1
fi

require_file() {
  if [ ! -s "$1" ]; then
    echo "FEHLER: Datei fehlt oder ist leer: $1"
    exit 1
  fi
}

EASY_FBX="$ROOT/easy-enemies/Easy Animated Enemy Pack - Jan 2019/FBX"
MONSTER_FBX="$ROOT/monsters/FBX"
PROP_GLTF="$ROOT/fantasy-props/Exports/glTF"
WEAPON_OBJ="$ROOT/medieval-weapons/OBJ"

ENEMIES=(Rat Spider Snake_angry)
MONSTERS=(Bat Slime)
PROPS=(
  Book_5 Book_7 Key_Metal Shelf_Simple Crate_Wooden Barrel_Holder
  FarmCrate_Apple Shelf_Small_Bottles Crate_Metal Barrel_Apples
  FarmCrate_Carrot Table_Large Chair_1 Table_Plate Table_Fork
  Banner_1_Cloth Banner_2_Cloth Torch_Metal CandleStick_Triple
  Barrel Anvil_Log Anvil
)
BOWS=(Bow_Wooden Bow_Wooden2 Bow_Evil Bow_Golden)

for name in "${ENEMIES[@]}"; do
  require_file "$EASY_FBX/$name.fbx"
done
for name in "${MONSTERS[@]}"; do
  require_file "$MONSTER_FBX/$name.fbx"
done
for name in "${PROPS[@]}"; do
  require_file "$PROP_GLTF/$name.gltf"
done
for name in "${BOWS[@]}"; do
  require_file "$WEAPON_OBJ/$name.obj"
done

command -v npx >/dev/null 2>&1 || {
  echo 'FEHLER: npx ist nicht installiert.'
  exit 1
}

GLTF_TRANSFORM=(npx --yes @gltf-transform/cli@4.2.1)
OBJ2GLTF=(npx --yes obj2gltf@3.1.6)

echo '=== Zielordner erstellen ==='
rm -rf "$DEST"
mkdir -p "$DEST/enemies" "$DEST/fantasy-props" "$DEST/medieval-weapons"

echo '=== Gegner kopieren ==='
for name in "${ENEMIES[@]}"; do
  cp -- "$EASY_FBX/$name.fbx" "$DEST/enemies/$name.fbx"
done
for name in "${MONSTERS[@]}"; do
  cp -- "$MONSTER_FBX/$name.fbx" "$DEST/enemies/$name.fbx"
done

echo '=== Fantasy-Props in GLB umwandeln ==='
for name in "${PROPS[@]}"; do
  "${GLTF_TRANSFORM[@]}" copy \
    "$PROP_GLTF/$name.gltf" \
    "$DEST/fantasy-props/$name.glb"
done

echo '=== Bögen in GLB umwandeln ==='
for name in "${BOWS[@]}"; do
  "${OBJ2GLTF[@]}" \
    -i "$WEAPON_OBJ/$name.obj" \
    -o "$DEST/medieval-weapons/$name.glb" \
    --binary
done

cat > "$DEST/LICENSES.md" <<'EOF'
# Imported asset licenses

The selected assets in this directory were created by Quaternius and published
under the Creative Commons Zero 1.0 Universal license, CC0 1.0.

Source packs:
- Fantasy Props MegaKit — https://quaternius.itch.io/fantasy-props-megakit
- LowPoly Animated Easy Enemies — https://quaternius.itch.io/animated-easy-enemies
- LowPoly Animated Monsters — https://quaternius.itch.io/lowpoly-animated-monsters
- LowPoly Medieval Weapons — https://quaternius.itch.io/lowpoly-medieval-weapons

Only assets actively used by Dungeon Veil are included in this repository.

CC0 1.0:
https://creativecommons.org/publicdomain/zero/1.0/
EOF

EXPECTED='/tmp/dungeon-veil-expected-assets.txt'
ACTUAL='/tmp/dungeon-veil-actual-assets.txt'

{
  echo 'LICENSES.md'
  for name in "${ENEMIES[@]}" "${MONSTERS[@]}"; do
    echo "enemies/$name.fbx"
  done
  for name in "${PROPS[@]}"; do
    echo "fantasy-props/$name.glb"
  done
  for name in "${BOWS[@]}"; do
    echo "medieval-weapons/$name.glb"
  done
} | sort > "$EXPECTED"

find "$DEST" -type f -printf '%P\n' | sort > "$ACTUAL"

if ! diff -u "$EXPECTED" "$ACTUAL"; then
  echo 'FEHLER: Im Zielordner fehlen Dateien oder es liegen unerwartete Dateien darin.'
  exit 1
fi

while IFS= read -r file; do
  require_file "$DEST/$file"
done < "$ACTUAL"

while IFS= read -r file; do
  if [ "$(head -c 4 "$file")" != 'glTF' ]; then
    echo "FEHLER: Keine gültige binäre GLB-Datei: $file"
    exit 1
  fi
done < <(find "$DEST" -type f -name '*.glb' | sort)

if find "$DEST" -type f \( \
  -iname '*.zip' -o \
  -iname '*.blend' -o \
  -iname '*.obj' -o \
  -iname '*.mtl' -o \
  -iname '*.gltf' -o \
  -iname '*.bin' \
\) -print -quit | grep -q .; then
  echo 'FEHLER: Rohdateien oder komplette Paketbestandteile sind im Zielordner.'
  exit 1
fi

echo '=== Dateigrößen ==='
find "$DEST" -type f -printf '%12s Bytes  %P\n' | sort -k3
du -sh "$DEST"

echo '=== Asset-Commit vorbereiten ==='
rm -- "$SCRIPT_PATH"
git add -A -- "$DEST" "$SCRIPT_PATH"

if git diff --cached --name-only | grep -v -E "^(${DEST}/|${SCRIPT_PATH}$)" | grep -q .; then
  echo 'FEHLER: Unerwartete Dateien wurden vorgemerkt.'
  git diff --cached --name-only
  git reset
  exit 1
fi

git diff --cached --stat
git commit -m 'Add selected Quaternius production assets'
git push origin "$BRANCH"

echo '=== Fertig ==='
echo "Commit: $(git rev-parse HEAD)"
git status --short
