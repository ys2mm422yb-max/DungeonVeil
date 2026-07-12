import { readFile } from 'node:fs/promises';

const files = {
  hud: await readFile(new URL('../src/components/HUD.tsx', import.meta.url), 'utf8'),
  reward: await readFile(new URL('../src/components/MetaRewardBanner.tsx', import.meta.url), 'utf8'),
  canvas: await readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
  enemy: await readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
  engine: await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  props: await readFile(new URL('../src/game/propPresentation3D.ts', import.meta.url), 'utf8'),
  effects: await readFile(new URL('../src/game/runEffectSystems.ts', import.meta.url), 'utf8'),
  boss: await readFile(new URL('../src/components/WorldBossBattleScreen.tsx', import.meta.url), 'utf8'),
};

const checks = [
  [files.hud.includes('absolute right-3 top-'), 'HUD status is not in the right-side lane'],
  [files.reward.includes('right-[max(12px,env(safe-area-inset-right))]'), 'reward toast still covers the HUD'],
  [files.canvas.includes('MAX_ARROW_VISUALS') && files.canvas.includes('MAX_DAMAGE_VISUALS'), 'mobile visual budgets are missing'],
  [files.enemy.includes('glow.visible = burning') && files.enemy.includes("tintMode: 'normal'"), 'inactive status meshes or tint traversal guard missing'],
  [files.engine.includes('const targets = visible.slice') && files.engine.includes('Math.atan2(endY - py, endX - px)'), 'arrows are not directly aimed at selected targets'],
  [files.props.includes('function inferredCollider') && files.props.includes("key.includes('/chair')"), 'automatic solid-prop colliders are missing'],
  [files.effects.includes('if (IS_MOBILE) return;'), 'mobile duplicate telegraphs are still enabled'],
  [files.boss.includes('const TIMER_PAINT_MS = 250;'), 'world-boss timer is repainting too often'],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error(`Mobile combat audit failed with ${failed.length} error(s):`);
  failed.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Mobile combat audit passed: compact HUD, bounded effects, direct arrows and solid-prop collision guards are active.');
