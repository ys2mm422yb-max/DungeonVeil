#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
ROOT='asset-imports/extracted'
DEST='artifacts/dungeon-rpg/public/assets/imported/enemies'
CANVAS='artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx'
SCRIPT='scripts/pr40-convert-enemies-to-glb.sh'
TMP="$(mktemp -d)"
TOOL_DIR="$TMP/fbx2gltf-tool"
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

command -v node >/dev/null 2>&1 || { echo 'FEHLER: Node.js fehlt.'; exit 1; }
command -v npm >/dev/null 2>&1 || { echo 'FEHLER: npm fehlt.'; exit 1; }
command -v npx >/dev/null 2>&1 || { echo 'FEHLER: npx fehlt.'; exit 1; }

NAMES=(Rat Spider Snake_angry Bat Slime)

find_source() {
  local name="$1"
  local extension="$2"
  find "$ROOT" -type f -iname "${name}.${extension}" -print -quit
}

ensure_fbx_wrapper() {
  if [ -d "$TOOL_DIR/node_modules/fbx2gltf" ]; then
    return
  fi
  echo '=== Temporäres offizielles fbx2gltf-Modul installieren ==='
  mkdir -p "$TOOL_DIR"
  npm install --prefix "$TOOL_DIR" --no-save --no-audit --no-fund fbx2gltf@0.9.7-p1
}

convert_fbx() {
  local source="$1"
  local name="$2"
  local output="$TMP/$name.glb"

  if command -v FBX2glTF >/dev/null 2>&1; then
    FBX2glTF --input "$source" --output "$output" --binary
  elif command -v fbx2gltf >/dev/null 2>&1; then
    fbx2gltf --input "$source" --output "$output" --binary
  else
    ensure_fbx_wrapper
    node - "$TOOL_DIR/node_modules/fbx2gltf" "$source" "$output" <<'NODE'
const modulePath = process.argv[2];
const source = process.argv[3];
const output = process.argv[4];
const convert = require(modulePath);
convert(source, output, [])
  .then(result => {
    console.log(`Konvertiert: ${result}`);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
NODE
  fi

  if [ ! -s "$output" ]; then
    echo "FEHLER: Für $name wurde keine GLB-Datei erzeugt."
    exit 1
  fi
}

validate_glb() {
  local file="$1"
  local name="$2"
  node - "$file" "$name" <<'NODE'
const fs = require('node:fs');
const [file, name] = process.argv.slice(2);
const data = fs.readFileSync(file);
if (data.length < 24 || data.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${name}: ungültiger GLB-Header`);
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

echo '=== Gegnerquellen konvertieren ==='
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

echo '=== iPhone-Leistungsprofil einbauen ==='
cp -- "$CANVAS" "$TMP/GameCanvasKayKit3D.before.tsx"
node - "$CANVAS" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
let text = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    "const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);\nconst IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);\nconst MAX_PARTICLES = IS_ANDROID ? 38 : IS_MOBILE ? 64 : 110;",
    "const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);\nconst IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);\nconst IS_MOBILE = typeof navigator !== 'undefined' && (IS_IOS || IS_ANDROID || navigator.maxTouchPoints > 1);\nconst MAX_PARTICLES = IS_ANDROID ? 36 : IS_IOS ? 40 : IS_MOBILE ? 44 : 96;",
  ],
  ["platform: IS_ANDROID ? 'android-balanced' : IS_MOBILE ? 'mobile' : 'desktop',", "platform: IS_ANDROID ? 'android-balanced' : IS_IOS ? 'ios-balanced' : IS_MOBILE ? 'mobile-balanced' : 'desktop',"],
  ["renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 1 : 1.25));", "renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.2));"],
  ["renderer.shadowMap.enabled = !IS_ANDROID;", "renderer.shadowMap.enabled = !IS_MOBILE;"],
  ["keyLight.castShadow = !IS_ANDROID;", "keyLight.castShadow = !IS_MOBILE;"],
  ["keyLight.shadow.mapSize.set(IS_ANDROID ? 512 : 1024, IS_ANDROID ? 512 : 1024);", "keyLight.shadow.mapSize.set(IS_MOBILE ? 512 : 1024, IS_MOBILE ? 512 : 1024);"],
  ["const core = new THREE.PointLight(0x9d76ff, IS_ANDROID ? 4.8 : IS_MOBILE ? 7.2 : 9.5, 8.5, 2);", "const core: any = IS_MOBILE ? new THREE.Object3D() : new THREE.PointLight(0x9d76ff, 8.8, 8.5, 2);\n        core.intensity = IS_MOBILE ? 0 : core.intensity;"],
  ["portal.userData.core.intensity = ((IS_ANDROID ? 4.4 : IS_MOBILE ? 6.5 : 8.8) + pulse * 2.2) * activateProgress;", "if (!IS_MOBILE) portal.userData.core.intensity = (8.8 + pulse * 2.2) * activateProgress;"],
];

for (const [oldText, newText] of replacements) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`FEHLER: Erwartete Stelle nicht eindeutig gefunden (${count} Treffer): ${oldText.slice(0, 80)}`);
  text = text.replace(oldText, newText);
}

const mobileLightCount = text.split('if (!IS_ANDROID) {').length - 1;
if (mobileLightCount < 3) throw new Error(`FEHLER: Mobile-Lichtstellen unvollständig gefunden (${mobileLightCount})`);
text = text.replaceAll('if (!IS_ANDROID) {', 'if (!IS_MOBILE) {');

const oldBlock = `      if (IS_ANDROID) {
         lowFpsWindows = fps < 42 ? lowFpsWindows + 1 : Math.max(0, lowFpsWindows - 1);
         if (lowFpsWindows >= 2 && particleBudget > 26) {
           particleBudget = 26;
           try { sessionStorage.setItem(LOW_GPU_KEY, '1'); } catch {}
         }
       }`;
const newBlock = `      if (IS_MOBILE) {
         lowFpsWindows = fps < 44 ? lowFpsWindows + 1 : Math.max(0, lowFpsWindows - 1);
         if (lowFpsWindows >= 2 && particleBudget > 24) {
           particleBudget = 24;
           try { sessionStorage.setItem(LOW_GPU_KEY, '1'); } catch {}
         }
       }`;

const blockCount = text.split(oldBlock).length - 1;
if (blockCount !== 1) throw new Error(`FEHLER: FPS-Anpassungsblock nicht gefunden (${blockCount})`);
text = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, text);
NODE

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

rm -- "$SCRIPT"
git add -A -- "$DEST" "$CANVAS" "$SCRIPT"

if git diff --cached --name-only | grep -v -E "^(${DEST}/|${CANVAS}|${SCRIPT})$" | grep -q .; then
  echo 'FEHLER: Unerwartete Dateien wurden vorgemerkt.'
  git diff --cached --name-only
  git reset
  cp -- "$TMP/GameCanvasKayKit3D.before.tsx" "$CANVAS"
  exit 1
fi

git diff --cached --stat
git commit -m 'Convert animated enemies to GLB and tune iPhone rendering'
git push origin "$BRANCH"

echo '=== Produktionspass fertig ==='
echo "Commit: $(git rev-parse HEAD)"