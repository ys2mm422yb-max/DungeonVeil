from pathlib import Path
import re

ROOT = Path('artifacts/dungeon-rpg')


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'replacement target not found in {path}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1))


def replace_regex(path: Path, pattern: str, replacement: str) -> None:
    text = path.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'regex target not found in {path}: {pattern[:120]!r}')
    path.write_text(updated)


# Compact HUD: skills stay visible but status/boss panels live in the free right column.
(ROOT / 'src/components/HUD.tsx').write_text("""import React from 'react';
import type { GameState } from '../game/runEngine';
import { CHAPTER_ROOMS } from '../game/chapterRun';
import { veilModifierLabel } from '../game/runEffectSystems';

interface Props{gameState:GameState;onPause:()=>void;onExitDungeon?:()=>void}

type CombatSkillKey = 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet' | 'piercing' | 'attackSpeed';

const COMBAT_SKILLS: Array<{ key: CombatSkillKey; icon: string; label: string; tone: string }> = [
 {key:'fireArrow',icon:'🔥',label:'FEUER',tone:'border-orange-300/25 bg-orange-500/12 text-orange-100'},
 {key:'iceArrow',icon:'❄',label:'FROST',tone:'border-cyan-200/25 bg-cyan-400/10 text-cyan-100'},
 {key:'multishot',icon:'⇶',label:'MEHRF.',tone:'border-amber-200/22 bg-amber-400/9 text-amber-100'},
 {key:'piercing',icon:'➶',label:'DURCH.',tone:'border-slate-200/20 bg-slate-300/8 text-slate-100'},
 {key:'ricochet',icon:'↗',label:'ABPR.',tone:'border-violet-200/22 bg-violet-400/10 text-violet-100'},
 {key:'attackSpeed',icon:'⚡',label:'TEMPO',tone:'border-yellow-200/20 bg-yellow-300/8 text-yellow-100'},
];

function Bar({v,m,c}:{v:number;m:number;c:string}){
 const p=Math.max(0,Math.min(100,m?v/m*100:0));
 return <div className="relative h-[14px] overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="absolute inset-[2px] rounded-full" style={{width:`calc(${p}% - 4px)`,background:c}}/><span className="absolute inset-0 grid place-items-center text-[8px] font-black text-white drop-shadow-[0_1px_2px_#000]">{Math.ceil(v)}/{m}</span></div>
}

export function HUD({gameState:g,onPause}:Props){
 const p=g.player;
 const gifts=Object.entries(g.runSkills).reduce((sum,[key,value])=>key==='heal'?sum:sum+(value??0),0);
 const activeCombatSkills=COMBAT_SKILLS.flatMap(skill=>{
  const rank=g.runSkills[skill.key]??0;
  return rank>0?[{...skill,rank}]:[];
 });
 const living=g.enemies.filter(enemy=>enemy.hp>0&&!enemy.isDead).length;
 const pending=g.enemies.filter(enemy=>enemy.isDead).length;
 const boss=g.enemies.find(enemy=>enemy.enemyType==='boss'&&enemy.hp>0&&!enemy.isDead);
 const hunt=g.enemies.find(enemy=>enemy.isHuntTarget&&enemy.hp>0&&!enemy.isDead);
 const modifier=veilModifierLabel(g.floor);
 const visibleEnemyCount=living+pending;
 const enemyText=g.roomClearReady?'RAUM FREI':boss?'BOSSRAUM':hunt?`JAGD · ${hunt.huntName??'GEZEICHNETE BEUTE'}`:visibleEnemyCount>0?`${visibleEnemyCount} GEGNER`:'RAUM WIRD FREIGEGEBEN';
 const hintVisible=performance.now()<g.exitHintUntil;
 const exitHint=pending>0&&living===0?'AUSGANG WIRD FREIGEGEBEN':`NOCH ${living} GEGNER`;
 return <div className="fixed inset-0 z-40 pointer-events-none select-none">
  <div className="absolute left-3 right-3 top-3 flex items-start justify-between" style={{paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)',paddingRight:'env(safe-area-inset-right)'}}>
   <div className="w-[200px] rounded-2xl border border-white/10 bg-black/55 p-3 shadow-xl backdrop-blur-sm">
    <div className="mb-2 flex items-center justify-between text-[10px] font-black tracking-[.18em] text-white/75"><span>KAPITEL {g.chapter}</span><span>RAUM {g.floor}/{CHAPTER_ROOMS}</span></div>
    <Bar v={p.hp} m={p.maxHp} c="#cb463d"/>
    <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[8px] font-bold tracking-[.16em] text-white/45"><span>WALDLÄUFER</span><span>{gifts} GABEN</span></div>
    {activeCombatSkills.length>0&&<div className="mt-2 grid grid-cols-3 gap-1">
     {activeCombatSkills.map(skill=><div key={skill.key} className={`min-w-0 truncate rounded-full border px-1.5 py-1 text-center text-[5.5px] font-black tracking-[.04em] ${skill.tone}`}><span className="mr-0.5 text-[7px]">{skill.icon}</span>{skill.label} {skill.rank}</div>)}
    </div>}
    {modifier&&<div className="mt-2 truncate rounded-full border border-violet-300/15 bg-violet-500/[.07] px-2 py-1 text-center text-[6px] font-black tracking-[.18em] text-violet-100/65">{modifier}</div>}
   </div>
   <button type="button" onPointerDown={e=>{e.preventDefault();e.stopPropagation();onPause()}} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/55 text-sm font-black text-white/85 backdrop-blur-sm active:scale-90" data-ui-control>Ⅱ</button>
  </div>
  <div className={`absolute right-3 top-[max(5.25rem,calc(env(safe-area-inset-top)+4.25rem))] max-w-[42vw] truncate rounded-full border px-3 py-1.5 text-[8px] font-black tracking-[.14em] backdrop-blur-sm ${g.roomClearReady?'border-violet-300/30 bg-violet-500/15 text-violet-100':boss?'border-red-300/30 bg-red-950/55 text-red-100':hunt?'border-amber-300/35 bg-amber-950/58 text-amber-100':'border-white/10 bg-black/46 text-white/65'}`}>{enemyText}</div>
  {hunt&&!boss&&<div className="absolute right-3 top-[max(8.2rem,calc(env(safe-area-inset-top)+7rem))] w-[min(41vw,178px)] rounded-xl border border-amber-300/22 bg-black/70 px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,.42)] backdrop-blur-md">
   <div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-amber-100/75"><span className="truncate">{hunt.huntName??'GEZEICHNETE BEUTE'}</span><span>JAGD</span></div>
   <Bar v={hunt.hp} m={hunt.maxHp} c="#c89538"/>
  </div>}
  {boss&&<div className="absolute right-3 top-[max(8.15rem,calc(env(safe-area-inset-top)+6.95rem))] w-[min(41vw,178px)] rounded-xl border border-red-300/20 bg-black/72 px-3 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-md">
   <div className="mb-1.5 flex items-center justify-between gap-2 text-[6px] font-black tracking-[.12em] text-red-100/75"><span>DER WÄCHTER</span><span>BOSS</span></div>
   <Bar v={boss.hp} m={boss.maxHp} c="#9f2f33"/>
  </div>}
  {hintVisible&&<div className="absolute right-3 top-[max(12rem,calc(env(safe-area-inset-top)+10.8rem))] max-w-[42vw] rounded-xl border border-orange-300/35 bg-black/75 px-3 py-2 text-center text-[8px] font-black tracking-[.12em] text-orange-100 shadow-xl">{exitHint}</div>}
 </div>
}
""")

# Reward toast uses the same free right-side column instead of covering the HUD.
(ROOT / 'src/components/MetaRewardBanner.tsx').write_text("""import React, { useEffect, useState } from 'react';
import { EQUIPMENT, type EquipmentId, type MetaReward } from '../game/metaProgression';
import { useLanguage } from '../i18n/LanguageContext';

type BannerState =
 | { kind: 'reward'; reward: MetaReward }
 | { kind: 'pickup'; item: EquipmentId; duplicate: boolean; copies: number; level: number };

const TOAST_POSITION = 'pointer-events-none fixed right-[max(12px,env(safe-area-inset-right))] top-[max(8.25rem,calc(env(safe-area-inset-top)+7.05rem))] z-[65] w-[min(42vw,185px)] transition-all duration-300';

export function MetaRewardBanner() {
 const { language } = useLanguage();
 const [banner, setBanner] = useState<BannerState | null>(null);
 const [visible, setVisible] = useState(false);

 useEffect(() => {
  let hideTimer = 0;
  const show = (next: BannerState) => {
   window.clearTimeout(hideTimer);
   setBanner(next);
   setVisible(true);
   hideTimer = window.setTimeout(() => setVisible(false), 2300);
  };
  const onReward = (event: Event) => {
   const reward = (event as CustomEvent<MetaReward>).detail;
   if (reward) show({ kind: 'reward', reward });
  };
  const onPickup = (event: Event) => {
   const detail = (event as CustomEvent<{ item: EquipmentId; duplicate: boolean; copies: number; level: number }>).detail;
   if (detail?.item) show({ kind: 'pickup', ...detail });
  };
  window.addEventListener('dungeon-veil-meta-reward', onReward as EventListener);
  window.addEventListener('dungeon-veil-equipment-picked', onPickup as EventListener);
  return () => {
   window.clearTimeout(hideTimer);
   window.removeEventListener('dungeon-veil-meta-reward', onReward as EventListener);
   window.removeEventListener('dungeon-veil-equipment-picked', onPickup as EventListener);
  };
 }, []);

 if (!banner) return null;
 const de = language === 'de';
 const motion = visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0';

 if (banner.kind === 'pickup') {
  const item = EQUIPMENT[banner.item];
  return <div className={`${TOAST_POSITION} ${motion}`}>
   <div className="overflow-hidden rounded-xl border border-violet-300/24 bg-[linear-gradient(120deg,rgba(47,28,75,.96),rgba(10,8,13,.97))] px-3 py-2.5 shadow-[0_14px_44px_rgba(0,0,0,.5)] backdrop-blur-xl">
    <div className="text-[6px] font-black uppercase tracking-[.14em]" style={{ color: item.accent }}>{banner.duplicate ? (de ? 'KOPIE · +1' : 'COPY · +1') : (de ? 'NEUE AUSRÜSTUNG' : 'NEW EQUIPMENT')}</div>
    <div className="mt-1 break-words text-[10px] font-black text-white">{de ? item.nameDe : item.nameEn}</div>
    <div className="mt-1 text-[6px] font-bold uppercase tracking-[.08em] text-white/40">{de ? 'STUFE' : 'LEVEL'} {banner.level} · {banner.copies} {de ? 'KOPIEN' : 'COPIES'}</div>
   </div>
  </div>;
 }

 const reward = banner.reward;
 const item = reward.item ? EQUIPMENT[reward.item] : null;
 const rankUp = reward.rankAfter > reward.rankBefore;
 return <div className={`${TOAST_POSITION} ${motion}`}>
  <div className="overflow-hidden rounded-xl border border-violet-300/24 bg-[linear-gradient(120deg,rgba(47,28,75,.94),rgba(10,8,13,.96))] px-3 py-2.5 shadow-[0_14px_44px_rgba(0,0,0,.5)] backdrop-blur-xl">
   <div className="text-[6px] font-black uppercase tracking-[.16em] text-violet-200/55">{de ? 'SCHLEIER-FORTSCHRITT' : 'VEIL PROGRESS'}</div>
   <div className="mt-1 text-[10px] font-black leading-snug text-white">+{reward.xp} XP · <span className="text-yellow-200">G {reward.gold}</span> · <span className="text-amber-200">✦ {reward.dust}</span></div>
   {rankUp && <div className="mt-1.5 inline-flex rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[6px] font-black tracking-[.1em] text-amber-100">{de ? 'RANG' : 'RANK'} {reward.rankAfter}</div>}
   {item && <div className="mt-2 border-t border-white/8 pt-2">
    <div className="text-[6px] font-black uppercase tracking-[.1em]" style={{ color: item.accent }}>{de ? 'BEUTE IM RAUM' : 'LOOT IN ROOM'}</div>
    <div className="mt-1 break-words text-[9px] font-black text-white/85">{de ? item.nameDe : item.nameEn}</div>
   </div>}
  </div>
 </div>;
}
""")

# Screen-space elemental effects are smaller and cheaper on phones.
overlay = ROOT / 'src/components/CombatFeedbackOverlay.tsx'
replace_once(overlay,
"const TILE = 40;\nconst clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));",
"const TILE = 40;\nconst IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);\nconst clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));")
replace_once(overlay,
"size: clamp(48 * (28 / cameraDepth), 34, enemy.enemyType === 'boss' ? 78 : 60),",
"size: clamp(32 * (28 / cameraDepth), 24, enemy.enemyType === 'boss' ? 58 : 46),")
replace_regex(overlay, r"function FireStatus\(\{ marker \}: \{ marker: StatusMarker \}\) \{.*?\n\}\n\nfunction IceStatus", """function FireStatus({ marker }: { marker: StatusMarker }) {
  return <div className=\"dv-natural-status dv-natural-fire\" style={{ left: `${marker.left}%`, top: `${marker.top}%`, width: marker.size, height: marker.size }}>
    <span className=\"dv-flame dv-flame-a\" />
    {!IS_MOBILE && <span className=\"dv-flame dv-flame-b\" />}
    {!IS_MOBILE && <span className=\"dv-flame dv-flame-c\" />}
    <span className=\"dv-ember dv-ember-a\" />
    {!IS_MOBILE && <span className=\"dv-ember dv-ember-b\" />}
    {!IS_MOBILE && <span className=\"dv-ember dv-ember-c\" />}
  </div>;
}

function IceStatus""")
replace_regex(overlay, r"function IceStatus\(\{ marker \}: \{ marker: StatusMarker \}\) \{.*?\n\}\n\nfunction AttackStatus", """function IceStatus({ marker }: { marker: StatusMarker }) {
  return <div className=\"dv-natural-status dv-natural-ice\" style={{ left: `${marker.left}%`, top: `${marker.top}%`, width: marker.size, height: marker.size }}>
    <span className=\"dv-cold-haze\" />
    <span className=\"dv-ice-shard dv-ice-a\" />
    <span className=\"dv-ice-shard dv-ice-b\" />
    {!IS_MOBILE && <span className=\"dv-ice-shard dv-ice-c\" />}
    {!IS_MOBILE && <span className=\"dv-ice-shard dv-ice-d\" />}
    {!IS_MOBILE && <span className=\"dv-snow dv-snow-a\">✦</span>}
    {!IS_MOBILE && <span className=\"dv-snow dv-snow-b\">✦</span>}
  </div>;
}

function AttackStatus""")

# Heavy progression systems run at 20 Hz on mobile instead of every render frame.
bridge = ROOT / 'src/components/GameSessionBridge.tsx'
replace_once(bridge,
"    let frame = 0;\n    let checkedClearKey = '';\n    let lastFrame = performance.now();",
"    let frame = 0;\n    let checkedClearKey = '';\n    let lastFrame = performance.now();\n    let lastSystemTick = 0;\n    const mobileTick = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);")
replace_once(bridge,
"""      if (engine) {
        if (engine.state.status === 'playing') {
          updateRunBalance(engine, balance);
          updateRunEffectSystems(engine, effects, time);
          updateRunRetentionSystems(engine, retention, time);
          updateRoomMechanics(engine, roomMechanics, time, dt);
          updateRunSynergies(engine, synergies, time);
          updateFirstWardenFinale(engine, firstWarden, time);
        }
        updateRunRelicEffects(engine, relicEffects, time);
        if (engine.state.roomClearReady) {
          const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
          if (checkedClearKey !== clearKey) {
            checkedClearKey = clearKey;
            const reward = rewardMetaRoomClear(engine.state.chapter, engine.state.floor);
            if (reward) {
              if (reward.item && reward.source && reward.rarity) {
                spawnRoomEquipmentReward(engine, { item: reward.item, duplicate: Boolean(reward.duplicate), source: reward.source, rarity: reward.rarity });
              }
              window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
            }
            void pushCloudSave();
          }
        } else {
          checkedClearKey = '';
        }
        updateEquipmentWorldLoot(engine, worldLoot, time);
      }
""",
"""      if (engine) {
        const interval = mobileTick ? 50 : 33;
        if (time - lastSystemTick >= interval) {
          const systemDt = Math.min(100, Math.max(dt, time - lastSystemTick));
          lastSystemTick = time;
          if (engine.state.status === 'playing') {
            updateRunBalance(engine, balance);
            updateRunEffectSystems(engine, effects, time);
            updateRunRetentionSystems(engine, retention, time);
            updateRoomMechanics(engine, roomMechanics, time, systemDt);
            updateRunSynergies(engine, synergies, time);
            updateFirstWardenFinale(engine, firstWarden, time);
          }
          updateRunRelicEffects(engine, relicEffects, time);
          updateEquipmentWorldLoot(engine, worldLoot, time);
        }
        if (engine.state.roomClearReady) {
          const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
          if (checkedClearKey !== clearKey) {
            checkedClearKey = clearKey;
            const reward = rewardMetaRoomClear(engine.state.chapter, engine.state.floor);
            if (reward) {
              if (reward.item && reward.source && reward.rarity) {
                spawnRoomEquipmentReward(engine, { item: reward.item, duplicate: Boolean(reward.duplicate), source: reward.source, rarity: reward.rarity });
              }
              window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
            }
            void pushCloudSave();
          }
        } else {
          checkedClearKey = '';
        }
      }
""")

# World-boss UI paints less often and retains bounded effect arrays.
world_boss = ROOT / 'src/components/WorldBossBattleScreen.tsx'
replace_once(world_boss, "const TIMER_PAINT_MS = 100;", "const TIMER_PAINT_MS = 250;")
replace_once(world_boss,
"""      engine.update(time);
      const elapsed = time - startTimeRef.current;
""",
"""      engine.update(time);
      if (engine.state.particles.length > 48) engine.state.particles.splice(0, engine.state.particles.length - 48);
      if (engine.state.effects.length > 24) engine.state.effects.splice(0, engine.state.effects.length - 24);
      if (engine.state.damageNumbers.length > 12) engine.state.damageNumbers.splice(0, engine.state.damageNumbers.length - 12);
      const elapsed = time - startTimeRef.current;
""")

# Solid-looking props without hand-authored sizes now receive conservative colliders.
props = ROOT / 'src/game/propPresentation3D.ts'
replace_once(props,
"""export function roomPropBlocksGameplay(piece: RoomPropPresentationInput) {
  if (!piece.collider) return false;
  const classification = roomPropScaleClass(piece);
  return !['lighting', 'small-prop', 'tool-weapon', 'wall-decoration', 'foliage'].includes(classification);
}
""",
"""function inferredCollider(piece: RoomPropPresentationInput): readonly [number, number] | null {
  const key = modelKey(piece.model);
  const classification = roomPropScaleClass(piece);
  if (classification === 'architecture') {
    if (key.includes('/pillar') || key.includes('/column')) return [0.9, 0.9];
    if (key.includes('/shrine') || key.includes('/coffin') || key.includes('/grave')) return [1.25, 1.35];
    return [1.2, 1.2];
  }
  if (classification === 'furniture') {
    if (key.includes('/chair')) return [0.72, 0.72];
    if (key.includes('/bench')) return [1.3, 0.72];
    if (key.includes('/table_')) return [1.8, 1.0];
    if (key.includes('/bed_')) return [1.0, 1.8];
    if (key.includes('/shelf') || key.includes('/cabinet')) return [1.0, 1.2];
    return [0.95, 0.85];
  }
  if (classification === 'heavy-prop') return [1.05, 0.95];
  if (classification === 'nature-solid') return key.includes('/tree') ? [1.08, 1.08] : [1.2, 1.0];
  return null;
}

export function roomPropBlocksGameplay(piece: RoomPropPresentationInput) {
  const classification = roomPropScaleClass(piece);
  if (['lighting', 'small-prop', 'tool-weapon', 'wall-decoration', 'foliage'].includes(classification)) return false;
  return Boolean(piece.collider ?? inferredCollider(piece));
}
""")
replace_once(props,
"""  if (classification === 'architecture') return 0.9;
  if (classification === 'furniture') return 0.84;
  if (classification === 'nature-solid') return 0.8;
  if (classification === 'heavy-prop') return 0.86;
""",
"""  if (classification === 'architecture') return 0.96;
  if (classification === 'furniture') return 0.94;
  if (classification === 'nature-solid') return 0.9;
  if (classification === 'heavy-prop') return 0.94;
""")
replace_once(props,
"""export function roomPropColliderFootprint(piece: RoomPropPresentationInput): RoomPropColliderFootprint | null {
  if (!roomPropBlocksGameplay(piece) || !piece.collider) return null;
  const inset = roomPropColliderInset(piece);
  const scale = roomPropColliderScale(piece) * inset;
  const localWidth = piece.collider[0] * scale;
  const localHeight = piece.collider[1] * scale;
""",
"""export function roomPropColliderFootprint(piece: RoomPropPresentationInput): RoomPropColliderFootprint | null {
  const collider = piece.collider ?? inferredCollider(piece);
  if (!roomPropBlocksGameplay(piece) || !collider) return null;
  const inset = roomPropColliderInset(piece);
  const scale = roomPropColliderScale(piece) * inset;
  const localWidth = collider[0] * scale;
  const localHeight = collider[1] * scale;
""")

# Avoid doubled telegraph rings on mobile veil rooms.
effects = ROOT / 'src/game/runEffectSystems.ts'
replace_once(effects,
"const ARCHER_BASE_COOLDOWN_MS = 270;",
"const ARCHER_BASE_COOLDOWN_MS = 270;\nconst IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);")
replace_once(effects,
"function reinforceEnemyTelegraphs(engine: GameEngine, system: RunEffectSystemState): void {\n  const telegraphs",
"function reinforceEnemyTelegraphs(engine: GameEngine, system: RunEffectSystemState): void {\n  if (IS_MOBILE) return;\n  const telegraphs")

# Directly target enemies so the visible arrows cannot fly past a target that already took damage.
engine = ROOT / 'src/game/runEngine.ts'
replace_once(engine, "const UI_EMIT_MS = 100;", "const UI_EMIT_MS = 125;")
replace_regex(engine, r"  private autoShoot\(time: number\): void \{.*?\n  \}\n\n  private shotPathBlocked", """  private autoShoot(time: number): void {
    const p = this.state.player;
    const px = p.x + 16;
    const py = p.y + 16;
    const visible = this.visibleEnemiesFrom(px, py).filter(enemy => distance(px, py, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2) <= p.attackRange);
    if (!visible.length) return;

    const speedRank = skillRank(this.state.runSkills, 'attackSpeed');
    const cooldownFactors = [1, 0.84, 0.70, 0.58];
    p.attackCooldown = Math.max(120, CLASS_DEFS.archer.attackCooldownMs * cooldownFactors[speedRank]);
    p.lastAttackTime = time;

    const multiRank = skillRank(this.state.runSkills, 'multishot');
    const targets = visible.slice(0, Math.min(1 + multiRank, visible.length));
    const primary = targets[0];
    const primaryX = primary.x + primary.width / 2;
    const primaryY = primary.y + primary.height / 2;
    const baseAngle = Math.atan2(primaryY - py, primaryX - px);
    p.facing = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };
    const hitIds = new Set<string>();

    targets.forEach((target, index) => {
      const endX = target.x + target.width / 2;
      const endY = target.y + target.height / 2;
      const angle = Math.atan2(endY - py, endX - px);
      const element = this.chooseShotElement(time, index);
      this.addShotEffect(`shot-${time}-${index}`, px, py, endX, endY, angle, element.color, element.kind, index === 0 ? 4 : 3);
      hitIds.add(target.id);
      const damage = this.baseArrowDamage(target, index === 0 ? 1 : 0.82);
      this.damageEnemy(target, damage, time, px, py, element.kind, index === 0 ? 1.2 : 1);
      this.applyElementStatus(target, element.kind, time);
      if (index === 0) {
        this.applyPiercing(target, px, py, angle, damage, time, element.kind, hitIds);
        this.applyRicochet(target, damage, time, element.kind, hitIds);
      }
    });
  }

  private shotPathBlocked""")
replace_once(engine,
"""  private addShotEffect(id: string, x: number, y: number, toX: number, toY: number, angle: number, color: string, element: VisualEffect['element'], width: number, fromEnemyId?: string, toEnemyId?: string) {
    this.state.effects.push({
      id, x, y, radius: 0, maxRadius: distance(x, y, toX, toY), color, lifeTime: 0, maxLifeTime: element === 'arcane' ? 190 : 165,
      type: 'beam', angle, width, element, fromEnemyId, toEnemyId,
    });
  }
""",
"""  private addShotEffect(id: string, x: number, y: number, toX: number, toY: number, angle: number, color: string, element: VisualEffect['element'], width: number, fromEnemyId?: string, toEnemyId?: string) {
    const travel = distance(x, y, toX, toY);
    const maxLifeTime = Math.max(150, Math.min(260, 110 + travel * 0.22 + (element === 'arcane' ? 24 : 0)));
    this.state.effects.push({
      id, x, y, radius: 0, maxRadius: travel, color, lifeTime: 0, maxLifeTime,
      type: 'beam', angle, width, element, fromEnemyId, toEnemyId,
    });
  }
""")
replace_once(engine,
"this.addShotEffect(`pierce-${time}-${i}`, fromX, fromY, tx, ty, angle, '#f3fbff', 'piercing', 5, primary.id, target.id);",
"this.addShotEffect(`pierce-${time}-${i}`, fromX, fromY, tx, ty, Math.atan2(ty - fromY, tx - fromX), '#f3fbff', 'piercing', 5, primary.id, target.id);")
replace_once(engine,
"""    this.updateEffects(dt);
    this.updateParticles(dt);
    this.updateRoomFlow(timestamp);
""",
"""    this.updateEffects(dt);
    this.updateParticles(dt);
    if (this.state.damageNumbers.length > 32) this.state.damageNumbers.splice(0, this.state.damageNumbers.length - 32);
    if (this.state.particles.length > 120) this.state.particles.splice(0, this.state.particles.length - 120);
    if (this.state.effects.length > 64) this.state.effects.splice(0, this.state.effects.length - 64);
    this.updateRoomFlow(timestamp);
""")

# Bound mobile draw calls and stop traversing every arrow/enemy material each frame.
canvas = ROOT / 'src/components/GameCanvasKayKit3D.tsx'
replace_once(canvas,
"const MAX_PARTICLES = IS_ANDROID ? 36 : IS_IOS ? 40 : IS_MOBILE ? 44 : 96;",
"const MAX_PARTICLES = IS_ANDROID ? 24 : IS_IOS ? 30 : IS_MOBILE ? 32 : 96;\nconst MAX_ARROW_VISUALS = IS_ANDROID ? 6 : IS_IOS ? 9 : IS_MOBILE ? 10 : 24;\nconst MAX_CIRCLE_VISUALS = IS_ANDROID ? 8 : IS_IOS ? 10 : IS_MOBILE ? 12 : 28;\nconst MAX_DAMAGE_VISUALS = IS_ANDROID ? 7 : IS_IOS ? 10 : IS_MOBILE ? 12 : 28;")
replace_once(canvas,
"const positions = IS_ANDROID ? fullPositions.slice(0, 2) : fullPositions;",
"const positions = IS_MOBILE ? fullPositions.slice(0, 1) : fullPositions;")
replace_once(canvas,
"const shots = state.effects.filter(effect => effect.type === 'beam' && (effect.id.startsWith('shot-') || effect.id.startsWith('pierce-') || effect.id.startsWith('rico-')));",
"const shots = state.effects.filter(effect => effect.type === 'beam' && (effect.id.startsWith('shot-') || effect.id.startsWith('pierce-') || effect.id.startsWith('rico-'))).slice(-MAX_ARROW_VISUALS);")
replace_once(canvas,
"""          arrow.traverse((node: any) => {
            if (node.isLine && node.material) node.material = node.material.clone();
            if (!node.isMesh && !node.isLine) return;
            node.castShadow = false;
            node.frustumCulled = true;
          });
""",
"""          const lineMaterials: any[] = [];
          arrow.traverse((node: any) => {
            if (node.isLine && node.material) {
              node.material = node.material.clone();
              lineMaterials.push(node.material);
            }
            if (!node.isMesh && !node.isLine) return;
            node.castShadow = false;
            node.frustumCulled = true;
          });
          arrow.userData.lineMaterials = lineMaterials;
""")
replace_once(canvas,
"""        arrow.traverse((node: any) => {
          if (!node.isLine || !node.material?.color) return;
          node.material.color.set(shot.color);
          node.material.opacity = Math.max(0.3, 0.96 * (1 - progress * 0.32));
        });
""",
"""        (arrow.userData.lineMaterials as any[] | undefined)?.forEach(material => {
          material.color?.set?.(shot.color);
          material.opacity = Math.max(0.3, 0.96 * (1 - progress * 0.32));
        });
""")
replace_once(canvas,
"const effects = state.effects.filter(effect => effect.type === 'circle');",
"const effects = state.effects.filter(effect => effect.type === 'circle').slice(-MAX_CIRCLE_VISUALS);")
replace_once(canvas,
"const numbers = state.damageNumbers.filter(number => !number.id.startsWith('clear-'));",
"const numbers = state.damageNumbers.filter(number => !number.id.startsWith('clear-')).slice(-MAX_DAMAGE_VISUALS);")
replace_once(canvas,
"renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.2));",
"renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_ANDROID ? 0.8 : IS_IOS ? 0.9 : IS_MOBILE ? 0.88 : 1.2));")
replace_once(canvas,
"""      const fillLight = new THREE.PointLight(0x6f61c8, IS_ANDROID ? 1.55 : 2.2, 22, 1.8);
      fillLight.position.set(0, 6.5, -8);
      scene.add(fillLight);
""",
"""      if (!IS_MOBILE) {
        const fillLight = new THREE.PointLight(0x6f61c8, 2.2, 22, 1.8);
        fillLight.position.set(0, 6.5, -8);
        scene.add(fillLight);
      }
""")
replace_once(canvas,
"""         if (lowFpsWindows >= 2 && particleBudget > 24) {
            particleBudget = 24;
""",
"""         if (lowFpsWindows >= 2 && particleBudget > 16) {
            particleBudget = 16;
""")

# Inactive enemy status meshes no longer consume draw calls; hit tint only traverses on state changes.
enemy3d = ROOT / 'src/components/kaykitEnemy3D.ts'
replace_once(enemy3d,
"  attackDuration: number;\n};",
"  attackDuration: number;\n  tintMode: 'normal' | 'hit';\n};")
replace_once(enemy3d,
"""  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 5 : 8, 0.22);
  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 5 : 8, 0.14);
  [...burnGlows, ...frostGlows].forEach(mesh => statusRoot.add(mesh));
""",
"""  const burnGlows = buildStatusGlows(THREE, 0xff642c, IS_MOBILE ? 2 : 8, 0.22);
  const frostGlows = buildStatusGlows(THREE, 0x8deaff, IS_MOBILE ? 2 : 8, 0.14);
  [...burnGlows, ...frostGlows].forEach(mesh => { mesh.visible = false; statusRoot.add(mesh); });
""")
replace_once(enemy3d,
"  statusRoot.add(burnHalo);",
"  burnHalo.visible = false;\n  statusRoot.add(burnHalo);")
replace_once(enemy3d,
"  statusRoot.add(frostHalo);",
"  frostHalo.visible = false;\n  statusRoot.add(frostHalo);")
replace_once(enemy3d,
"  bossRingInner.userData.bossRing = 'inner';",
"  bossRingInner.userData.bossRing = 'inner';\n  bossRingInner.visible = !IS_MOBILE;")
replace_once(enemy3d,
"    attackDuration,\n  };",
"    attackDuration,\n    tintMode: 'normal',\n  };")
replace_once(enemy3d,
"""  visual.burnGlows.forEach((glow, index) => {
    glow.material.opacity = burning ? 0.62 + Math.sin(now * 0.012 + index) * 0.22 : 0;
    glow.position.y += burning ? delta * (0.16 + index * 0.018) : 0;
    if (glow.position.y > 1.7) glow.position.y = 0.2;
  });
  visual.burnHalo.material.opacity = burning ? 0.42 + Math.sin(now * 0.009) * 0.16 : 0;
  visual.burnHalo.scale.setScalar(burning ? 0.94 + Math.sin(now * 0.006) * 0.1 : 1);
  visual.frostGlows.forEach((glow, index) => {
    glow.material.opacity = frozen ? 0.58 + Math.sin(now * 0.01 + index * 1.6) * 0.24 : 0;
    glow.position.y = 0.12 + (index % 4) * 0.32 + Math.sin(now * 0.004 + index) * 0.05;
    glow.position.x = Math.sin(now * 0.002 + index * 2.2) * 0.36;
    glow.position.z = Math.cos(now * 0.0024 + index * 1.7) * 0.3;
  });
  visual.frostHalo.material.opacity = frozen ? 0.36 + Math.sin(now * 0.008) * 0.12 : 0;
  visual.frostHalo.scale.setScalar(frozen ? 0.96 + Math.sin(now * 0.005) * 0.07 : 1);
""",
"""  visual.burnGlows.forEach((glow, index) => {
    glow.visible = burning;
    if (!burning) return;
    glow.material.opacity = 0.62 + Math.sin(now * 0.012 + index) * 0.22;
    glow.position.y += delta * (0.16 + index * 0.018);
    if (glow.position.y > 1.7) glow.position.y = 0.2;
  });
  visual.burnHalo.visible = burning;
  if (burning) {
    visual.burnHalo.material.opacity = 0.42 + Math.sin(now * 0.009) * 0.16;
    visual.burnHalo.scale.setScalar(0.94 + Math.sin(now * 0.006) * 0.1);
  }
  visual.frostGlows.forEach((glow, index) => {
    glow.visible = frozen;
    if (!frozen) return;
    glow.material.opacity = 0.58 + Math.sin(now * 0.01 + index * 1.6) * 0.24;
    glow.position.y = 0.12 + (index % 4) * 0.32 + Math.sin(now * 0.004 + index) * 0.05;
    glow.position.x = Math.sin(now * 0.002 + index * 2.2) * 0.36;
    glow.position.z = Math.cos(now * 0.0024 + index * 1.7) * 0.3;
  });
  visual.frostHalo.visible = frozen;
  if (frozen) {
    visual.frostHalo.material.opacity = 0.36 + Math.sin(now * 0.008) * 0.12;
    visual.frostHalo.scale.setScalar(0.96 + Math.sin(now * 0.005) * 0.07);
  }
""")
replace_once(enemy3d,
"""  const hitFlash = Boolean(enemy.flashUntil && now < enemy.flashUntil);
  if (hitFlash) setMeshTint(visual.scene, 0xffd6bd, enemy.enemyType === 'boss' ? 0.035 : 0.065);
  else setMeshTint(visual.scene, null, 0);
""",
"""  const hitFlash = Boolean(enemy.flashUntil && now < enemy.flashUntil);
  const tintMode = hitFlash ? 'hit' : 'normal';
  if (tintMode !== visual.tintMode) {
    visual.tintMode = tintMode;
    if (hitFlash) setMeshTint(visual.scene, 0xffd6bd, enemy.enemyType === 'boss' ? 0.035 : 0.065);
    else setMeshTint(visual.scene, null, 0);
  }
""")

# Static regression audit for the new mobile safeguards.
audit = ROOT / 'scripts/validate-mobile-combat.mjs'
audit.write_text("""import { readFile } from 'node:fs/promises';

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
""")

package = ROOT / 'package.json'
replace_once(package,
'"audit:rooms": "node scripts/validate-all-rooms.mjs && node scripts/validate-production-rooms.mjs && node scripts/validate-spawn-hitboxes.mjs && node scripts/validate-enemy-visibility.mjs"',
'"audit:rooms": "node scripts/validate-all-rooms.mjs && node scripts/validate-production-rooms.mjs && node scripts/validate-spawn-hitboxes.mjs && node scripts/validate-enemy-visibility.mjs && node scripts/validate-mobile-combat.mjs"')

print('Applied mobile combat, collision, projectile and HUD polish.')
