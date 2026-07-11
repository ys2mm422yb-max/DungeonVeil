#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
ROOT='asset-imports/extracted'
DEST='artifacts/dungeon-rpg/public/assets/imported/enemies'
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$(git rev-parse --show-toplevel)"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "FEHLER: Aktiver Branch ist nicht $BRANCH"
  exit 1
fi

if ! git check-ignore -q "$ROOT/"; then
  echo "FEHLER: $ROOT ist nicht durch .gitignore geschützt."
  exit 1
fi

command -v node >/dev/null 2>&1 || {
  echo 'FEHLER: Node.js fehlt.'
  exit 1
}
command -v npx >/dev/null 2>&1 || {
  echo 'FEHLER: npx fehlt.'
  exit 1
}

NAMES=(Rat Spider Snake_angry Bat Slime)

find_source() {
  local name="$1"
  local extension="$2"
  find "$ROOT" -type f -iname "${name}.${extension}" -print -quit
}

convert_fbx() {
  local source="$1"
  local name="$2"
  local outbase="$TMP/$name"
  local produced=''

  if command -v FBX2glTF >/dev/null 2>&1; then
    FBX2glTF -i "$source" -o "$outbase" --binary
  elif command -v fbx2gltf >/dev/null 2>&1; then
    fbx2gltf -i "$source" -o "$outbase" --binary
  else
    echo "=== Temporärer FBX2glTF-Aufruf für $name ==="
    if ! npx --yes fbx2gltf -i "$source" -o "$outbase" --binary; then
      npx --yes fbx2gltf --input "$source" --output "$outbase" --binary
    fi
  fi

  for candidate in "$outbase.glb" "$outbase/${name}.glb" "$outbase.glb.glb"; do
    if [ -s "$candidate" ]; then
      produced="$candidate"
      break
    fi
  done
  if [ -z "$produced" ]; then
    produced="$(find "$TMP" -type f -iname "${name}*.glb" -print -quit)"
  fi
  if [ -z "$produced" ] || [ ! -s "$produced" ]; then
    echo "FEHLER: Für $name wurde keine GLB-Datei erzeugt."
    exit 1
  fi
  cp -- "$produced" "$TMP/$name.glb"
}

validate_glb() {
  local file="$1"
  local name="$2"
  node - "$file" "$name" <<'NODE'
const fs = require('node:fs');
const [file, name] = process.argv.slice(2);
const data = fs.readFileSync(file);
if (data.length < 24 || data.toString('ascii', 0, 4) !== 'glTF') {
  throw new Error(`${name}: ungültiger GLB-Header`);
}
if (data.readUInt32LE(4) !== 2) throw new Error(`${name}: GLB-Version ist nicht 2`);
const jsonLength = data.readUInt32LE(12);
const jsonType = data.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error(`${name}: erster Chunk ist kein JSON`);
const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim());
const meshes = Array.isArray(json.meshes) ? json.meshes.length : 0;
const animations = Array.isArray(json.animations) ? json.animations.length : 0;
if (meshes < 1) throw new Error(`${name}: kein Mesh enthalten`);
if (animations < 1) throw new Error(`${name}: keine Animation enthalten`);
console.log(`${name}: ${meshes} Mesh(es), ${animations} Animation(en), ${data.length} Bytes`);
NODE
}

echo '=== Quellen suchen und konvertieren ==='
for name in "${NAMES[@]}"; do
  glb="$(find_source "$name" glb || true)"
  gltf="$(find_source "$name" gltf || true)"
  fbx="$(find_source "$name" fbx || true)"

  if [ -n "$glb" ]; then
    cp -- "$glb" "$TMP/$name.glb"
  elif [ -n "$gltf" ]; then
    npx --yes @gltf-transform/cli@4.2.1 copy "$gltf" "$TMP/$name.glb"
  elif [ -n "$fbx" ]; then
    convert_fbx "$fbx" "$name"
  else
    echo "FEHLER: Keine Quelle für $name gefunden."
    exit 1
  fi

  validate_glb "$TMP/$name.glb" "$name"
done

echo '=== Zielordner ersetzen ==='
mkdir -p "$DEST"
for name in "${NAMES[@]}"; do
  cp -- "$TMP/$name.glb" "$DEST/$name.glb"
  rm -f -- "$DEST/$name.fbx"
done

echo '=== Ergebnis prüfen ==='
for name in "${NAMES[@]}"; do
  validate_glb "$DEST/$name.glb" "$name"
done
find "$DEST" -maxdepth 1 -type f -printf '%12s Bytes  %f\n' | sort -k3
du -sh "$DEST"

if find "$DEST" -maxdepth 1 -type f -iname '*.fbx' -print -quit | grep -q .; then
  echo 'FEHLER: Im Zielordner liegen noch FBX-Dateien.'
  exit 1
fi

rm -- scripts/pr40-convert-enemies-to-glb.sh
git add -A -- "$DEST" scripts/pr40-convert-enemies-to-glb.sh

if git diff --cached --name-only | grep -v -E "^(${DEST}/|scripts/pr40-convert-enemies-to-glb.sh$)" | grep -q .; then
  echo 'FEHLER: Unerwartete Dateien wurden vorgemerkt.'
  git diff --cached --name-only
  git reset
  exit 1
fi

git diff --cached --stat
git commit -m 'Convert selected animated enemies to GLB'
git push origin "$BRANCH"

echo '=== Gegner-GLB-Konvertierung fertig ==='
echo "Commit: $(git rev-parse HEAD)"
