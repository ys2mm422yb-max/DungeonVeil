from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'marker missing in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


engine = 'artifacts/dungeon-rpg/src/game/runEngine.ts'
replace_exact(engine, "import { bossCombatProfile } from './enemyRegionalIdentity';", "import { bossCombatProfile, enemyVisualProfile } from './enemyRegionalIdentity';")
replace_exact(engine, """type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: ReturnType<typeof enemyArchetype>;
  index: number;
};
""", """type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: ReturnType<typeof enemyArchetype>;
  index: number;
  damageScale: number;
  projectileElement?: VisualEffect['element'];
};
""")
replace_exact(engine, """  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {
""", """  private enemySpawnIndex(enemy: Enemy) {
    const parsed = Number(enemy.id.split('-').at(-1));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isDarkwoodMage(enemy: Enemy) {
    if (this.state.floor < 11 || this.state.floor > 20) return false;
    return enemyVisualProfile(this.state.floor, enemy.enemyType, this.enemySpawnIndex(enemy)).role === 'mage';
  }

  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {
""")
replace_exact(engine, """    const dist = Math.hypot(attackTargetX - attackFromX, attackTargetY - attackFromY);
    if (windup.archetype !== 'dragon' && dist > windup.range * 1.18) return;
    if (this.shotPathBlocked(attackFromX, attackFromY, attackTargetX, attackTargetY, 0.08)) return;
""", """    const dist = Math.hypot(attackTargetX - attackFromX, attackTargetY - attackFromY);
    const allowedRangeScale = windup.projectileElement ? 1.04 : 1.18;
    if (windup.archetype !== 'dragon' && dist > windup.range * allowedRangeScale) return;
    if (this.shotPathBlocked(attackFromX, attackFromY, attackTargetX, attackTargetY, 0.08)) return;
""")
replace_exact(engine, """    if (time <= p.invincibleUntil) return;
    const raw = enemy.attack - p.defense + Math.floor(Math.random() * 3);
    const damage = Math.max(1, raw);
""", """    if (windup.projectileElement && windup.archetype !== 'dragon') {
      const angle = Math.atan2(attackTargetY - attackFromY, attackTargetX - attackFromX);
      this.addShotEffect(`darkwood-mage-shot-${time}-${windup.index}`, attackFromX, attackFromY, attackTargetX, attackTargetY, angle, '#9f72ff', windup.projectileElement, 5, enemy.id);
      this.state.particles.push(...makeHitSpark(attackTargetX, attackTargetY, '#9f72ff', 8));
    }

    if (time <= p.invincibleUntil) return;
    const raw = enemy.attack - p.defense + Math.floor(Math.random() * 3);
    const damage = Math.max(1, Math.round(raw * windup.damageScale));
""")
replace_exact(engine, """      const plan = planEnemyMove(enemy, p, dt, time);
      const hasLineOfSight = !this.shotPathBlocked(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY, 0.08);
      const visualSpawnGracePassed = time - enemy.spawnTime >= 900;
      const canAttackFromHere = dist <= plan.attackRange && hasLineOfSight && visualSpawnGracePassed;
""", """      const plan = planEnemyMove(enemy, p, dt, time);
      const darkwoodMage = this.isDarkwoodMage(enemy);
      const attackRange = darkwoodMage ? Math.min(plan.attackRange, 50) : plan.attackRange;
      const attackDelay = darkwoodMage ? Math.max(1120, Math.round(plan.attackDelay * 1.32)) : plan.attackDelay;
      const hasLineOfSight = !this.shotPathBlocked(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY, 0.08);
      const visualSpawnGracePassed = time - enemy.spawnTime >= 900;
      const canAttackFromHere = dist <= attackRange && hasLineOfSight && visualSpawnGracePassed;
""")
replace_exact(engine, """      this.checkEnemyStuck(enemy, time, dist, plan.attackRange);

      if (canAttackFromHere && time > enemy.nextAttackTime) {
        const archetype = enemyArchetype(enemy.enemyType);
        const windupMs = this.attackWindupMs(archetype);
        enemy.nextAttackTime = time + plan.attackDelay + windupMs;
""", """      this.checkEnemyStuck(enemy, time, dist, attackRange);

      if (canAttackFromHere && time > enemy.nextAttackTime) {
        const archetype = enemyArchetype(enemy.enemyType);
        const windupMs = darkwoodMage ? Math.max(360, this.attackWindupMs(archetype)) : this.attackWindupMs(archetype);
        enemy.nextAttackTime = time + attackDelay + windupMs;
""")
replace_exact(engine, """        this.enemyWindups.set(enemy.id, { hitAt: time + windupMs, range: plan.attackRange, archetype, index: i });
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const warningColor = archetype === 'dragon' ? (this.state.floor === 50 ? '#765cff' : '#ff633d') : archetype === 'guardian' ? '#e8a45d' : '#e6c987';
""", """        this.enemyWindups.set(enemy.id, {
          hitAt: time + windupMs,
          range: attackRange,
          archetype,
          index: i,
          damageScale: darkwoodMage ? 0.62 : 1,
          projectileElement: darkwoodMage ? 'arcane' : undefined,
        });
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const warningColor = darkwoodMage ? '#9f72ff' : archetype === 'dragon' ? (this.state.floor === 50 ? '#765cff' : '#ff633d') : archetype === 'guardian' ? '#e8a45d' : '#e6c987';
""")
replace_exact(engine, """          maxRadius: Math.max(30, plan.attackRange * 0.58),
""", """          maxRadius: Math.max(30, attackRange * 0.58),
""")
replace_exact(engine, """          element: archetype === 'dragon' ? (this.state.floor === 50 ? 'arcane' : 'fire') : 'normal',
""", """          element: darkwoodMage ? 'arcane' : archetype === 'dragon' ? (this.state.floor === 50 ? 'arcane' : 'fire') : 'normal',
""")

skills = 'artifacts/dungeon-rpg/src/game/runSkills.ts'
replace_exact(skills, """    rankTextDe: ['16% schneller', '30% schneller', '42% schneller'],
    rankTextEn: ['16% faster', '30% faster', '42% faster'],
""", """    rankTextDe: ['+16 % Angriffsgeschwindigkeit', '+30 % Angriffsgeschwindigkeit', '+42 % Angriffsgeschwindigkeit'],
    rankTextEn: ['+16% attack speed', '+30% attack speed', '+42% attack speed'],
""")

translations = 'artifacts/dungeon-rpg/src/i18n/translations.ts'
replace_exact(translations, "attackSpeed: 'QUICK DRAW · Faster attacks'", "attackSpeed: 'QUICK DRAW · Higher attack speed'")
replace_exact(translations, "attackSpeed: 'SCHNELLZUG · Schnellere Angriffe'", "attackSpeed: 'SCHNELLZUG · Höhere Angriffsgeschwindigkeit'")

validator = Path('artifacts/dungeon-rpg/scripts/validate-darkwood-mage-balance.mjs')
validator.write_text("""import { readFile } from 'node:fs/promises';

const [engine, skills, translations] = await Promise.all([
  readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runSkills.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n/translations.ts', import.meta.url), 'utf8'),
]);

const checks = [
  [engine.includes('isDarkwoodMage(enemy: Enemy)') && engine.includes("role === 'mage'"), 'darkwood mage detection is missing'],
  [engine.includes('Math.min(plan.attackRange, 50)') && engine.includes('Math.max(1120'), 'darkwood mage range/cooldown tuning is missing'],
  [engine.includes('damageScale: darkwoodMage ? 0.62 : 1'), 'darkwood mage damage reduction is missing'],
  [engine.includes("projectileElement: darkwoodMage ? 'arcane' : undefined") && engine.includes('darkwood-mage-shot'), 'darkwood mage attacks remain visually invisible'],
  [engine.includes('allowedRangeScale = windup.projectileElement ? 1.04 : 1.18'), 'ranged attack escape tolerance is still too generous'],
  [skills.includes("'+16 % Angriffsgeschwindigkeit'") && skills.includes("'+42 % Angriffsgeschwindigkeit'"), 'Schnellzug rank text is still unclear'],
  [translations.includes('SCHNELLZUG · Höhere Angriffsgeschwindigkeit'), 'Schnellzug summary text is still unclear'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Darkwood mage balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Darkwood mage balance audit passed: visible projectile, shorter range, lower damage, longer cooldown and clear Schnellzug wording.');
""")

package = 'artifacts/dungeon-rpg/package.json'
replace_exact(package, 'node scripts/validate-upgrade-economy.mjs"', 'node scripts/validate-upgrade-economy.mjs && node scripts/validate-darkwood-mage-balance.mjs"')
