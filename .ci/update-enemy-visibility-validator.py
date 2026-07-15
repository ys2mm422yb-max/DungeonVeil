from pathlib import Path

path = Path('artifacts/dungeon-rpg/scripts/validate-enemy-visibility.mjs')
text = path.read_text()
old = "    'const canAttackFromHere = dist <= plan.attackRange && hasLineOfSight && visualSpawnGracePassed;',"
new = "    'const canAttackFromHere = dist <= attackRange && hasLineOfSight && visualSpawnGracePassed;',"
if old not in text:
    raise SystemExit('legacy enemy attack-range validator marker missing')
path.write_text(text.replace(old, new, 1))
