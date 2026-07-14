from pathlib import Path
import re

rooms = Path('artifacts/dungeon-rpg/src/game/logicalRoomSetpieces.ts')
text = rooms.read_text()
replacement = '''  // 4 — Erzlogistik: zwei klar getrennte Stationen, markierte Lieferachse und freier Portalweg.
  4: [
    p(`${F}/table_low.gltf`, -6.8, -3.8, Math.PI / 2, 0.98, [1.55, 0.9]),
    p(`${T}/pickaxe.gltf`, -6.35, -3.62, 0.24, 1.34),
    p(`${T}/shovel.gltf`, -7.15, -3.44, -0.22, 1.28),
    p(`${T}/lantern.gltf`, -5.45, -4.65, 0, 1.2),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, 6.65, -3.7, -0.08, 1.12, [1.35, 0.82]),
    p(`${R}/Copper_Bars_Stack_Medium.gltf`, 7.25, -1.55, 0.1, 1.08, [1.2, 0.75]),
    p(`${R}/Pallet_Wood_Covered_A.gltf`, 5.9, 2.9, 0.04, 1.08, [1.45, 0.92]),
    p(`${R}/Iron_Nuggets.gltf`, 5.25, 2.95, 0.12, 1.18),
    p(`${R}/Copper_Nuggets.gltf`, 6.35, 2.8, -0.12, 1.18),
    p(`${D}/box_large.gltf`, -6.4, 3.15, 0.08, 1.0, [1.15, 0.95]),
    p(`${D}/torch_lit.gltf`, -2.9, -4.8, 0, 1.22),
    p(`${D}/torch_lit.gltf`, 2.9, -4.8, 0, 1.22),
    wallTop(`${D}/banner_patternC_red.gltf`, 0, 1.05),
  ],

  // 5 — Werkstatt: hintere Montagebank, getrennte Schmiedeplätze und eine freie Kampfmitte.
  5: [
    p(`${D}/table_long_decorated_C.gltf`, 0, -5.15, 0, 1.04, [2.35, 0.95]),
    p(`${T}/blueprint_stacked.gltf`, -0.72, -5.0, 0.1, 1.12, undefined, 0.82),
    p(`${T}/handdrill.gltf`, 0.72, -4.88, -0.25, 1.16, undefined, 0.82),
    p(`${T}/anvil.gltf`, -6.45, -1.55, Math.PI / 2, 1.22, [1.2, 0.9]),
    p(`${R}/Iron_Bars_Stack_Large.gltf`, -7.0, 1.1, 0.08, 1.04, [1.25, 0.78]),
    p(`${T}/grindstone.gltf`, 6.45, -1.55, -Math.PI / 2, 1.34, [1.0, 1.1]),
    p(`${D}/box_stacked.gltf`, 6.9, 1.1, -0.08, 0.98, [1.05, 0.9]),
    p(`${D}/shelves.gltf`, -8.35, 3.6, Math.PI / 2, 1.0, [1.0, 1.9]),
    p(`${D}/shelf_small.gltf`, 8.35, 3.6, -Math.PI / 2, 1.0, [1.0, 1.55]),
    p(`${D}/torch_lit.gltf`, -3.0, -4.1, 0, 1.22),
    p(`${D}/torch_lit.gltf`, 3.0, -4.1, 0, 1.22),
    wallTop(`${D}/sword_shield_gold.gltf`, 0, 1.16),
  ],

  // 6 — Schmiede:'''
pattern = re.compile(r"  // 4 —[\s\S]*?  // 6 — Schmiede:")
if not pattern.search(text):
    raise SystemExit('rooms 4-5 block not found')
rooms.write_text(pattern.sub(replacement, text, count=1))

audit = Path('artifacts/dungeon-rpg/scripts/validate-production-rooms.mjs')
text = audit.read_text()
text = text.replace("[4, ['pallet', 'pickaxe', 'bars_stack']],", "[4, ['pallet', 'pickaxe', 'bars_stack', 'banner']],")
text = text.replace("[5, ['table_long', 'anvil', 'grindstone']],", "[5, ['table_long', 'anvil', 'grindstone', 'shelf']],")
text = text.replace("    if (room === 6) {", "    if (room === 4 || room === 5) {\n      const centralBlockers = colliders.filter(collider => Math.abs(collider.x) < 2.7 && collider.z > -4.2 && collider.z < 4.8);\n      if (centralBlockers.length) fail(room, 'authored center lane is blocked');\n    }\n\n    if (room === 6) {")
audit.write_text(text)
