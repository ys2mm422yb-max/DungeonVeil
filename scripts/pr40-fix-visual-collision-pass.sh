#!/usr/bin/env bash
set -euo pipefail

BRANCH='work/blocks-1-7-production-pass'
SCRIPT='scripts/pr40-fix-visual-collision-pass.sh'
MENU='artifacts/dungeon-rpg/src/components/MainMenuDungeonScene.tsx'
CANVAS='artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx'
ENEMIES='artifacts/dungeon-rpg/src/components/kaykitEnemy3D.ts'
EQUIPMENT='artifacts/dungeon-rpg/src/game/equipmentVisuals.ts'
ENGINE='artifacts/dungeon-rpg/src/game/runEngine.ts'
COLLISION='artifacts/dungeon-rpg/src/game/roomCollision3D.ts'

cd "$(git rev-parse --show-toplevel)"

if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "FEHLER: Aktiver Branch ist nicht $BRANCH"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo 'FEHLER: Der Workspace enthält lokale Änderungen.'
  git status --short
  exit 1
fi

node <<'NODE'
const fs = require('node:fs');

function patch(path, transforms) {
  let text = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) text = transform(text);
  fs.writeFileSync(path, text);
}

function replaceOne(text, pattern, replacement, label) {
  const matches = text.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`${label}: erwartet 1 Treffer, gefunden ${matches?.length ?? 0}`);
  return text.replace(pattern, replacement);
}

patch('artifacts/dungeon-rpg/src/components/MainMenuDungeonScene.tsx', [
  text => replaceOne(text, /import \{ loadKayKitRanger, type KayKitPlayerRig \} from '\.\/kaykitPlayer3D';\n/, '', 'Menü Ranger-Import'),
  text => replaceOne(text, /const GLTF_URL = .*?;\nconst DUNGEON_ROOT = .*?;\n/, '', 'Menü GLTF-Konstanten'),
  text => replaceOne(text, /function prepareStaticModel\(object: any\) \{[\s\S]*?\n\}\n\nexport function MainMenuDungeonScene/, 'export function MainMenuDungeonScene', 'Menü Modellvorbereitung'),
  text => replaceOne(text, /\n    let ranger: KayKitPlayerRig \| null = null;/, '', 'Menü Ranger-Variable'),
  text => replaceOne(text, /      const \{ GLTFLoader \} = await import\([\s\S]*?\) as any;\n      if \(disposed\) return;\n/, '      if (disposed) return;\n', 'Menü Loader'),
  text => replaceOne(text, /      camera\.position\.set\(0, 4\.65, 10\.8\);\n      camera\.lookAt\(0, 2\.25, -7\.8\);/, "      camera.position.set(0, 4.15, 11.8);\n      camera.lookAt(0, 2.35, -7.4);", 'Menü Kamera'),
  text => replaceOne(text, /      const loader = new GLTFLoader\(\);[\s\S]*?\n      scene\.add\(new THREE\.HemisphereLight/, '      scene.add(new THREE.HemisphereLight', 'Menü Mauerblock'),
  text => replaceOne(text, /      const portalLight = new THREE\.PointLight\(0x8868ef, IS_MOBILE \? 4\.2 : 6\.2, 10, 2\);\n      portalLight\.position\.set\(0, 2\.3, -7\.1\);/, "      const portalLight = new THREE.PointLight(0x9a72ff, IS_MOBILE ? 3.6 : 5.4, 11, 2);\n      portalLight.position.set(0, 2.55, -7.0);", 'Menü Portallicht'),
  text => replaceOne(text, /      portal\.position\.set\(0, 2\.55, -8\.25\);\n      portal\.scale\.setScalar\(1\.18\);/, "      portal.position.set(0, 2.7, -7.8);\n      portal.scale.setScalar(1.08);", 'Menü Portalposition'),
  text => replaceOne(text, /\n      ranger = await loadKayKitRanger[\s\S]*?scene\.add\(ranger\.root\);\n/, '\n', 'Menü Ranger-Aufbau'),
  text => replaceOne(text, /\n        ranger\?\.update\(delta\);/, '', 'Menü Ranger-Update'),
  text => replaceOne(text, /\n      ranger\?\.stop\(\);/, '', 'Menü Ranger-Cleanup'),
]);

patch('artifacts/dungeon-rpg/src/components/kaykitEnemy3D.ts', [
  text => replaceOne(text, /const IMPORTED_CREATURES:[\s\S]*?\n\};/, `const IMPORTED_CREATURES: Partial<Record<EnemyType, { path: string; targetHeight: number; rotationY?: number }>> = {
  slime: { path: '/assets/imported/enemies/Slime.glb', targetHeight: 1.02 },
  goblin: { path: '/assets/imported/enemies/Rat.glb', targetHeight: 0.86 },
  spider: { path: '/assets/imported/enemies/Spider.glb', targetHeight: 0.82 },
  vampire: { path: '/assets/imported/enemies/Bat.glb', targetHeight: 0.98 },
  demon: { path: '/assets/imported/enemies/Snake_angry.glb', targetHeight: 1.04 },
};`, 'Gegnergrößen'),
]);

patch('artifacts/dungeon-rpg/src/game/equipmentVisuals.ts', [
  text => replaceOne(text, /const bowPose = .*?;\n/, "const bowPose = [0.08, -0.48, Math.PI / 2] as const;\nconst importedBowPose = [0.02, -0.18, 0] as const;\nconst importedBowRoot = '/assets/imported/medieval-weapons';\n", 'Importierte Bogenkonstanten'),
  text => replaceOne(text, /  'ash-bow':.*?\n  'ember-bow':.*?\n  'hunter-bow':.*?\n  'veil-bow':.*?\n  'warden-bow':.*?\n/, `  'ash-bow': profile(\`${'${importedBowRoot}'}/Bow_Wooden2.glb\`, \`${'${A}'}/bow_withString.gltf\`, importedBowPose, 0.86, 0.7, 0, true, 0.04, 'bow'),
  'ember-bow': profile(\`${'${importedBowRoot}'}/Bow_Golden.glb\`, \`${'${W}'}/bow_A_withString.gltf\`, importedBowPose, 0.86, 0.7, 0, true, 0.06, 'bow'),
  'hunter-bow': profile(\`${'${importedBowRoot}'}/Bow_Wooden.glb\`, \`${'${W}'}/bow_B_withString.gltf\`, importedBowPose, 0.86, 0.7, 0, true, 0.03, 'bow'),
  'veil-bow': profile(\`${'${importedBowRoot}'}/Bow_Evil.glb\`, \`${'${W}'}/bow_A_withString.gltf\`, importedBowPose, 0.86, 0.7, 0, true, 0.05, 'bow'),
  'warden-bow': profile(\`${'${W}'}/bow_B_withString.gltf\`, \`${'${A}'}/bow_withString.gltf\`, bowPose, 0.84, 0.68, 0, true, 0.1, 'bow'),
`, 'Bogenmodelle'),
]);

patch('artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx', [
  text => replaceOne(text, /new THREE\.MeshBasicMaterial\(\{ color: effect\.color, transparent: true, opacity: 0\.9, side: THREE\.DoubleSide, depthWrite: false \}\)/, "new THREE.MeshBasicMaterial({ color: effect.color, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })", 'Kreis-Material'),
  text => replaceOne(text, /          ring\.rotation\.x = -Math\.PI \/ 2;\n          visual\.add\(ring\);/, "          ring.rotation.x = -Math.PI / 2;\n          ring.renderOrder = 12;\n          visual.add(ring);", 'Kreis-Renderorder'),
  text => replaceOne(text, /          if \(!IS_ANDROID && \(effect\.element === 'fire' \|\| effect\.element === 'arcane'\)\) \{/, "          if (!IS_MOBILE && (effect.element === 'fire' || effect.element === 'arcane')) {", 'Kreis-Mobile-Licht'),
  text => replaceOne(text, /        visual\.position\.set\(mapX\(state, effect\.x\), 0\.045, mapZ\(state, effect\.y\)\);/, "        visual.position.set(mapX(state, effect.x), 0.095, mapZ(state, effect.y));", 'Kreis-Höhe'),
]);

patch('artifacts/dungeon-rpg/src/game/runEngine.ts', [
  text => replaceOne(text, /  private moveEntity\(entity: \{ x: number; y: number; width: number; height: number \}, dx: number, dy: number\): void \{[\s\S]*?\n  \}\n\n  private emit/, `  private moveEntity(entity: { x: number; y: number; width: number; height: number }, dx: number, dy: number): void {
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = Math.max(1, Math.ceil(distance / 6));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let step = 0; step < steps; step++) {
      if (stepX !== 0) {
        entity.x += stepX;
        const ex = entity.x + (stepX > 0 ? entity.width : 0);
        const blockedByTiles = !isWalkable(this.state.map, ex, entity.y + entity.height / 2)
          || !isWalkable(this.state.map, ex, entity.y + 2)
          || !isWalkable(this.state.map, ex, entity.y + entity.height - 2);
        if (blockedByTiles || this.blockedByRoomProp(entity)) entity.x -= stepX;
      }
      if (stepY !== 0) {
        entity.y += stepY;
        const ey = entity.y + (stepY > 0 ? entity.height : 0);
        const blockedByTiles = !isWalkable(this.state.map, entity.x + entity.width / 2, ey)
          || !isWalkable(this.state.map, entity.x + 2, ey)
          || !isWalkable(this.state.map, entity.x + entity.width - 2, ey);
        if (blockedByTiles || this.blockedByRoomProp(entity)) entity.y -= stepY;
      }
    }
  }

  private emit`, 'Schrittweise Bewegung'),
]);

patch('artifacts/dungeon-rpg/src/game/roomCollision3D.ts', [
  text => replaceOne(text, /function collidersForRoom\(room: number\): RoomPropCollider\[\] \{[\s\S]*?\n\}/, `function architectureCollidersForRoom(room: number): RoomPropCollider[] {
  const spec = roomBibleSpec(room);
  const portal = portalStagePoint(room);
  const colliders: RoomPropCollider[] = [];
  const add = (x: number, z: number, halfW: number, halfH = halfW) => colliders.push({ x, z, halfW, halfH });

  if (spec.portal.z < -8) {
    const spread = spec.shell === 'veil' ? 2.65 : 2.35;
    const size = spec.shell === 'veil' ? 0.78 : 0.68;
    add(portal.x - spread, portal.z - 1.75, size);
    add(portal.x + spread, portal.z - 1.75, size);
  }

  switch (spec.silhouette) {
    case 'three-lane':
      for (const z of [-5.5, -0.8, 4.1]) { add(-6.6, z, 0.68); add(6.6, z, 0.68); }
      break;
    case 'axial':
      add(-6.4, -5.4, 0.72); add(6.4, -5.4, 0.72);
      break;
    case 'ring':
    case 'orbit':
      for (const [x, z] of [[-5.6, -4.3], [5.6, -4.3], [-5.6, 4.3], [5.6, 4.3]] as const) add(x, z, 0.72);
      break;
    case 'cross':
      for (const [x, z] of [[-5.4, -4.4], [5.4, -4.4], [-5.4, 4.4], [5.4, 4.4]] as const) add(x, z, 0.76);
      break;
    case 'arena':
      for (const [x, z] of [[-7, -6], [7, -6], [-7, 5.6], [7, 5.6]] as const) add(x, z, 0.86);
      break;
    case 'diagonal':
      add(-7.2, -4.9, 1.3, 0.95); add(6.9, 4.7, 1.0, 0.75);
      break;
    case 'zigzag':
    case 's-curve':
    case 's-lane':
      add(-7.2, 5.4, 0.95, 0.72); add(7.1, -5.2, 0.95, 0.72);
      break;
  }

  return colliders;
}

function collidersForRoom(room: number): RoomPropCollider[] {
  const portal = portalStagePoint(room);
  const props = logicalRoomSetpieces(room)
    .filter(piece => piece.collider)
    .filter(piece => Math.hypot(piece.x - portal.x, piece.z - portal.z) > PORTAL_CLEARANCE)
    .map(piece => {
      const base = piece.collider!;
      const scale = (piece.scale ?? 1) * COLLIDER_INSET;
      const localWidth = base[0] * scale;
      const localHeight = base[1] * scale;
      const angle = piece.rotation ?? 0;
      const cos = Math.abs(Math.cos(angle));
      const sin = Math.abs(Math.sin(angle));
      const width = localWidth * cos + localHeight * sin;
      const height = localWidth * sin + localHeight * cos;
      return { x: piece.x, z: piece.z, halfW: width / 2, halfH: height / 2 };
    });
  return [...props, ...architectureCollidersForRoom(room)];
}`, 'Architektur-Kollisionen'),
]);
NODE

rm -- "$SCRIPT"

git diff --check
git add -A -- "$MENU" "$CANVAS" "$ENEMIES" "$EQUIPMENT" "$ENGINE" "$COLLISION" "$SCRIPT"

EXPECTED_RE='^(artifacts/dungeon-rpg/src/components/MainMenuDungeonScene\.tsx|artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D\.tsx|artifacts/dungeon-rpg/src/components/kaykitEnemy3D\.ts|artifacts/dungeon-rpg/src/game/equipmentVisuals\.ts|artifacts/dungeon-rpg/src/game/runEngine\.ts|artifacts/dungeon-rpg/src/game/roomCollision3D\.ts|scripts/pr40-fix-visual-collision-pass\.sh)$'
if git diff --cached --name-only | grep -v -E "$EXPECTED_RE" | grep -q .; then
  echo 'FEHLER: Unerwartete Dateien wurden vorgemerkt.'
  git diff --cached --name-only
  git reset
  exit 1
fi

git diff --cached --stat
git commit -m 'Fix menu composition, collisions, enemy scale and weapon variety'
git push origin "$BRANCH"

echo '=== Korrekturpass fertig ==='
echo "Commit: $(git rev-parse HEAD)"
