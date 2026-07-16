from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'artifacts/dungeon-rpg/src/game/bossAttackTelegraphs.ts'
text = path.read_text()
old = '''function warningEffects(enemy: Enemy, snapshot: BossAttackSnapshot): VisualEffect[] {
  const source = bossCenter(enemy);
  const x = snapshot.contract.target === 'boss-radius' ? source.x : snapshot.targetX;
  const y = snapshot.contract.target === 'boss-radius' ? source.y : snapshot.targetY;
  return [
    {
      id: `telegraph-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 0,
      maxRadius: snapshot.contract.radius,
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
    {
      id: `telegraph-inner-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 4,
      maxRadius: snapshot.contract.radius * 0.62,
      color: '#fff2c2',
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
  ];
}
'''
new = '''function warningEffects(enemy: Enemy, snapshot: BossAttackSnapshot): VisualEffect[] {
  const source = bossCenter(enemy);
  const x = snapshot.contract.target === 'boss-radius' ? source.x : snapshot.targetX;
  const y = snapshot.contract.target === 'boss-radius' ? source.y : snapshot.targetY;
  const effects: VisualEffect[] = [
    {
      id: `telegraph-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 0,
      maxRadius: snapshot.contract.radius,
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
    {
      id: `telegraph-inner-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x,
      y,
      radius: 4,
      maxRadius: snapshot.contract.radius * 0.62,
      color: '#fff2c2',
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'circle',
      element: snapshot.contract.element,
    },
  ];
  if (snapshot.contract.target === 'locked-ground') {
    effects.push({
      id: `shot-boss-${snapshot.contract.room}-${snapshot.startedAt}-${enemy.id}`,
      x: source.x,
      y: source.y,
      radius: 0,
      maxRadius: Math.hypot(snapshot.targetX - source.x, snapshot.targetY - source.y),
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.windupMs,
      type: 'beam',
      angle: Math.atan2(snapshot.targetY - source.y, snapshot.targetX - source.x),
      width: snapshot.contract.projectileWidth,
      element: snapshot.contract.element,
    });
  }
  return effects;
}
'''
if old not in text:
    raise SystemExit('warningEffects block not found')
text = text.replace(old, new, 1)
old_impact = '''  if (snapshot.contract.target === 'locked-ground') {
    const angle = Math.atan2(snapshot.targetY - source.y, snapshot.targetX - source.x);
    engine.state.effects.push({
      id: `shot-boss-${snapshot.contract.room}-${time}-${enemy.id}`,
      x: source.x,
      y: source.y,
      radius: 0,
      maxRadius: Math.hypot(snapshot.targetX - source.x, snapshot.targetY - source.y),
      color: snapshot.contract.color,
      lifeTime: 0,
      maxLifeTime: snapshot.contract.room === 30 ? 220 : 280,
      type: 'beam',
      angle,
      width: snapshot.contract.projectileWidth,
      element: snapshot.contract.element,
    });
  }
'''
if old_impact not in text:
    raise SystemExit('late projectile block not found')
text = text.replace(old_impact, '', 1)
path.write_text(text)
Path(__file__).unlink()
workflow = root / '.github/workflows/temporary-boss-projectile-timing.yml'
if workflow.exists():
    workflow.unlink()
