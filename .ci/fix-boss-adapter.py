from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'artifacts/dungeon-rpg/src/game/bossAttackTelegraphs.ts'
text = path.read_text()
replacements = {
    "type PatchedEngine = GameEngine & {": "type PatchedEngine = {",
    "20: { room: 20, target: 'locked-ground', radius: 92, windupMs: 900": "20: { room: 20, target: 'locked-ground', radius: 92, windupMs: 720",
    "30: { room: 30, target: 'locked-ground', radius: 52, windupMs: 760": "30: { room: 30, target: 'locked-ground', radius: 52, windupMs: 700",
    "40: { room: 40, target: 'boss-radius', radius: 88, windupMs: 620": "40: { room: 40, target: 'boss-radius', radius: 88, windupMs: 600",
    "50: { room: 50, target: 'locked-ground', radius: 96, windupMs: 900": "50: { room: 50, target: 'locked-ground', radius: 96, windupMs: 720",
    "const runtime = engine as PatchedEngine;": "const runtime = engine as unknown as PatchedEngine;",
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'missing replacement: {old}')
    text = text.replace(old, new, 1)
path.write_text(text)
Path(__file__).unlink()
workflow = root / '.github/workflows/temporary-boss-adapter-fix.yml'
if workflow.exists():
    workflow.unlink()
