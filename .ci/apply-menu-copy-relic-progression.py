from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'marker missing in {path}: {old[:90]!r}')
    file.write_text(text.replace(old, new, 1))


# Funny but truthful credits for the real first project.
credits = 'artifacts/dungeon-rpg/src/components/screens/CreditsScreen.tsx'
replace_exact(credits, "  const { t } = useLanguage();", "  const { t, language } = useLanguage();")
replace_exact(credits, """        <div className="space-y-8 text-center w-full">
          <CreditEntry label={t.creditsDesign} value="Replit AI" />
          <CreditEntry label={t.creditsBuiltWith} value="React · TypeScript · Vite · Canvas API" />
          <CreditEntry label="Font" value="Cinzel by Natanael Gama" />
        </div>
""", """        <div className="space-y-8 text-center w-full">
          <CreditEntry
            label={language === 'de' ? 'IDEE, DESIGN & FRAGWÜRDIGE FREIZEITPLANUNG' : 'IDEA, DESIGN & QUESTIONABLE FREE-TIME PLANNING'}
            value={language === 'de' ? 'Ein hobbyloser Typ bei seinem ersten Spielprojekt' : 'One hobbyless guy building his first game'}
          />
          <CreditEntry
            label={language === 'de' ? 'TECHNISCHE KOMPLIZEN' : 'TECHNICAL ACCOMPLICES'}
            value={language === 'de' ? 'React · TypeScript · Three.js · KI-Hilfe · zu viel Kaffee' : 'React · TypeScript · Three.js · AI help · too much coffee'}
          />
          <CreditEntry label="Font" value="Cinzel by Natanael Gama" />
        </div>
""")
replace_exact(credits, """        <div className="text-center">
          <p className="text-white/30 text-xs tracking-widest uppercase font-mono mb-2">
            {t.creditsSpecialThanks}
          </p>
          <p className="text-white/50 text-sm italic leading-relaxed max-w-xs mx-auto">
            "{t.creditsThanksText}"
          </p>
        </div>
""", """        <div className="text-center">
          <p className="text-white/30 text-xs tracking-widest uppercase font-mono mb-2">
            {language === 'de' ? 'BESONDERER DANK AN' : 'SPECIAL THANKS TO'}
          </p>
          <p className="text-white/50 text-sm italic leading-relaxed max-w-xs mx-auto">
            {language === 'de' ? '„Alle Bugs, die sich erfolgreich als Features verkleidet haben.“' : '“Every bug that successfully disguised itself as a feature.”'}
          </p>
        </div>
""")

# Every normal equipment item is available by chapter 4 at the latest.
gates = 'artifacts/dungeon-rpg/src/game/equipmentChapterGates.ts'
replace_exact(gates, "  'warden-bow': 5,", "  'warden-bow': 4,")
replace_exact(gates, "  'warden-quiver': 5,", "  'warden-quiver': 4,")
replace_exact(gates, "  'veil-eye': 5,", "  'veil-eye': 4,")

# Explain that a level is a permanent equipment level, not a run or chapter.
presentation = 'artifacts/dungeon-rpg/src/game/equipmentPresentation.ts'
replace_exact(presentation, """};

export function equipmentPresentation(definition: EquipmentDefinition) {
""", """};

function clarifyGermanItemLevel(value: string): string {
  return value.replace(/pro Stufe/g, 'je Ausrüstungslevel');
}

function clarifyEnglishItemLevel(value: string): string {
  return value.replace(/per level/g, 'per equipment level');
}

export function equipmentPresentation(definition: EquipmentDefinition) {
""")
replace_exact(presentation, """    descriptionDe: override?.descriptionDe ?? definition.descriptionDe,
    descriptionEn: override?.descriptionEn ?? definition.descriptionEn,
""", """    descriptionDe: clarifyGermanItemLevel(override?.descriptionDe ?? definition.descriptionDe),
    descriptionEn: clarifyEnglishItemLevel(override?.descriptionEn ?? definition.descriptionEn),
""")

# Boss relics now come from boss rooms 20/30/40/50; one relic is world-boss-only.
relics = 'artifacts/dungeon-rpg/src/game/veilRelics.ts'
replace_exact(relics, "export type VeilRelicId = 'ash-eye' | 'marked-claw' | 'night-hunt-sigil' | 'veil-heart' | 'broken-guardian-crown' | 'depth-rune-shard';", "export type VeilRelicId = 'ash-eye' | 'marked-claw' | 'night-hunt-sigil' | 'veil-heart' | 'broken-guardian-crown' | 'depth-rune-shard' | 'world-core';")
replace_exact(relics, "  source: 'hunt' | 'room20';", "  source: 'hunt' | 'boss' | 'worldboss';")
replace_exact(relics, "source: 'room20', accent: '#c786ff'", "source: 'boss', accent: '#c786ff'")
replace_exact(relics, "source: 'room20', accent: '#e6c16f'", "source: 'boss', accent: '#e6c16f'")
replace_exact(relics, "source: 'room20', accent: '#7dbfff'", "source: 'boss', accent: '#7dbfff'")
replace_exact(relics, """  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Schaden wird um 25 % reduziert.', descriptionEn: 'Rune storm damage is reduced by 25%.', source: 'boss', accent: '#7dbfff' },
};
""", """  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Schaden wird um 25 % reduziert.', descriptionEn: 'Rune storm damage is reduced by 25%.', source: 'boss', accent: '#7dbfff' },
  'world-core': { id: 'world-core', nameDe: 'Weltenkern', nameEn: 'World Core', descriptionDe: 'Zu Beginn jedes Runs: +8 % Angriff und +12 % maximales Leben.', descriptionEn: 'At the start of every run: +8% attack and +12% maximum health.', source: 'worldboss', accent: '#ff8b4a' },
};
""")
replace_exact(relics, """  consumedHeartRuns: string[];
};

const DEFAULT_PROFILE: VeilRelicProfile = { owned: [], equipped: null, consumedHeartRuns: [] };
""", """  consumedHeartRuns: string[];
  activatedWorldCoreRuns: string[];
};

const DEFAULT_PROFILE: VeilRelicProfile = { owned: [], equipped: null, consumedHeartRuns: [], activatedWorldCoreRuns: [] };
""")
replace_exact(relics, """      consumedHeartRuns: Array.isArray(parsed.consumedHeartRuns) ? parsed.consumedHeartRuns.filter(value => typeof value === 'string').slice(-30) : [],
""", """      consumedHeartRuns: Array.isArray(parsed.consumedHeartRuns) ? parsed.consumedHeartRuns.filter(value => typeof value === 'string').slice(-30) : [],
      activatedWorldCoreRuns: Array.isArray(parsed.activatedWorldCoreRuns) ? parsed.activatedWorldCoreRuns.filter(value => typeof value === 'string').slice(-30) : [],
""")
replace_exact(relics, """  localStorage.setItem(RELIC_KEY, JSON.stringify({ ...profile, consumedHeartRuns: profile.consumedHeartRuns.slice(-30) }));
""", """  localStorage.setItem(RELIC_KEY, JSON.stringify({
    ...profile,
    consumedHeartRuns: profile.consumedHeartRuns.slice(-30),
    activatedWorldCoreRuns: profile.activatedWorldCoreRuns.slice(-30),
  }));
""")
replace_exact(relics, """export function consumeVeilHeartForCurrentRun(): boolean {
""", """export function activateWorldCoreForCurrentRun(): boolean {
  if (!hasEquippedVeilRelic('world-core')) return false;
  const runId = currentRunId();
  if (!runId) return false;
  const profile = loadVeilRelicProfile();
  if (profile.activatedWorldCoreRuns.includes(runId)) return false;
  profile.activatedWorldCoreRuns.push(runId);
  saveVeilRelicProfile(profile);
  return true;
}

export function consumeVeilHeartForCurrentRun(): boolean {
""")
replace_exact(relics, "export const ROOM_TWENTY_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];", "export const BOSS_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];")

retention = 'artifacts/dungeon-rpg/src/game/runRetention.ts'
replace_exact(retention, "  ROOM_TWENTY_RELIC_POOL,", "  BOSS_RELIC_POOL,")
replace_exact(retention, "type PendingRelicDrop = { relicId: VeilRelicId; roomKey: string; source: 'hunt' | 'room20' };", "type PendingRelicDrop = { relicId: VeilRelicId; roomKey: string; source: 'hunt' | 'boss' };")
replace_exact(retention, """function spawnRareRelicDrop(engine: GameEngine, state: RunRetentionState, source: 'hunt' | 'room20', x: number, y: number): void {
  const riftBonus = activeWeeklyRiftId() === 'empty-veil' ? (source === 'hunt' ? 0.12 : 0.04) : 0;
  const chance = (source === 'hunt' ? 0.18 : 0.02) + riftBonus;
  if (Math.random() > chance) return;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : ROOM_TWENTY_RELIC_POOL;
""", """function spawnRareRelicDrop(engine: GameEngine, state: RunRetentionState, source: 'hunt' | 'boss', x: number, y: number): void {
  const riftBonus = activeWeeklyRiftId() === 'empty-veil' ? (source === 'hunt' ? 0.12 : 0.04) : 0;
  const chance = (source === 'hunt' ? 0.18 : engine.state.floor === 50 ? 0.12 : 0.06) + riftBonus;
  if (Math.random() > chance) return;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : BOSS_RELIC_POOL;
""")
replace_exact(retention, "  if (engine.state.floor === 20) spawnRareRelicDrop(engine, state, 'room20', engine.state.map.width * 20, engine.state.map.height * 20);", "  if (engine.state.floor >= 20 && isBossRoom(engine.state.floor)) spawnRareRelicDrop(engine, state, 'boss', engine.state.map.width * 20, engine.state.map.height * 20);")

# Give the world-boss-exclusive relic a real, once-per-run effect.
run_relics = 'artifacts/dungeon-rpg/src/game/runRelicEffects.ts'
replace_exact(run_relics, "import { consumeVeilHeartForCurrentRun, equippedVeilRelic } from './veilRelics';", "import { activateWorldCoreForCurrentRun, consumeVeilHeartForCurrentRun, equippedVeilRelic } from './veilRelics';")
replace_exact(run_relics, """  const relic = equippedVeilRelic();

  if (relic === 'marked-claw'""", """  const relic = equippedVeilRelic();

  if (relic === 'world-core' && activateWorldCoreForCurrentRun()) {
    const healthGain = Math.max(1, Math.round(player.maxHp * 0.12));
    player.maxHp += healthGain;
    player.hp = Math.min(player.maxHp, player.hp + healthGain);
    player.attack = Math.max(player.attack + 1, Math.round(player.attack * 1.08));
    engine.state.effects.push({ id: `world-core-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 110, color: '#ff8b4a', lifeTime: 0, maxLifeTime: 850, type: 'circle', element: 'fire' });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER WELTENKERN ERWACHT', text: '+8 % Angriff · +12 % maximales Leben für diesen Run', tone: 'relic' } }));
  }

  if (relic === 'marked-claw'""")

# Unlock the unique relic only when a real world-boss reward is claimed.
reward_local = 'artifacts/dungeon-rpg/src/game/worldBossRewardLocal.ts'
replace_exact(reward_local, "import type { WorldBossRewardPayload } from './socialProgressOnline';", "import type { WorldBossRewardPayload } from './socialProgressOnline';\nimport { unlockVeilRelic } from './veilRelics';")
replace_exact(reward_local, """  gold: number;
};
""", """  gold: number;
  relicUnlocked: boolean;
};
""")
replace_exact(reward_local, "return { applied: false, rankBefore, rankAfter: meta.rank, xp: 0, dust: 0, gold: 0 };", "return { applied: false, rankBefore, rankAfter: meta.rank, xp: 0, dust: 0, gold: 0, relicUnlocked: false };")
replace_exact(reward_local, """  saveMetaProgression(meta);

  return { applied: true, rankBefore, rankAfter: meta.rank, xp, dust, gold };
""", """  saveMetaProgression(meta);
  const relic = unlockVeilRelic('world-core');

  return { applied: true, rankBefore, rankAfter: meta.rank, xp, dust, gold, relicUnlocked: relic.newUnlock };
""")

mailbox = 'artifacts/dungeon-rpg/src/components/MailboxPanel.tsx'
replace_exact(mailbox, """      setNotice(applied.applied
        ? de
          ? `Belohnung abgeholt: ${applied.xp} Rang-XP, ${applied.dust} Schleierstaub und ${applied.gold} Gold${applied.rankAfter > applied.rankBefore ? ` · Rang ${applied.rankAfter}!` : ''}`
          : `Reward claimed: ${applied.xp} rank XP, ${applied.dust} Veil Dust and ${applied.gold} gold${applied.rankAfter > applied.rankBefore ? ` · Rank ${applied.rankAfter}!` : ''}`
        : de ? 'Diese Belohnung wurde bereits deinem Spielstand gutgeschrieben.' : 'This reward was already added to your save.');
""", """      const relicText = applied.relicUnlocked ? (de ? ' · Neues Relikt: Weltenkern!' : ' · New relic: World Core!') : '';
      setNotice(applied.applied
        ? de
          ? `Belohnung abgeholt: ${applied.xp} Rang-XP, ${applied.dust} Schleierstaub und ${applied.gold} Gold${applied.rankAfter > applied.rankBefore ? ` · Rang ${applied.rankAfter}!` : ''}${relicText}`
          : `Reward claimed: ${applied.xp} rank XP, ${applied.dust} Veil Dust and ${applied.gold} gold${applied.rankAfter > applied.rankBefore ? ` · Rank ${applied.rankAfter}!` : ''}${relicText}`
        : de ? 'Diese Belohnung wurde bereits deinem Spielstand gutgeschrieben.' : 'This reward was already added to your save.');
""")
replace_exact(mailbox, """    let appliedCount = 0;
    try {
""", """    let appliedCount = 0;
    let relicUnlocked = false;
    try {
""")
replace_exact(mailbox, """          gold += applied.gold;
        }
""", """          gold += applied.gold;
          relicUnlocked = relicUnlocked || applied.relicUnlocked;
        }
""")
replace_exact(mailbox, """        ? `${appliedCount} Belohnungen eingesammelt: ${xp} Rang-XP · ${dust} Schleierstaub · ${gold} Gold.`
        : `${appliedCount} rewards claimed: ${xp} rank XP · ${dust} Veil Dust · ${gold} gold.`);
""", """        ? `${appliedCount} Belohnungen eingesammelt: ${xp} Rang-XP · ${dust} Schleierstaub · ${gold} Gold.${relicUnlocked ? ' · Neues Relikt: Weltenkern!' : ''}`
        : `${appliedCount} rewards claimed: ${xp} rank XP · ${dust} Veil Dust · ${gold} gold.${relicUnlocked ? ' · New relic: World Core!' : ''}`);
""")

# Direct sign-in buttons for World Boss, Friends and Guild.
worldboss = 'artifacts/dungeon-rpg/src/components/WorldBossPanel.tsx'
replace_exact(worldboss, "type Props = { language: 'de' | 'en'; saveData: SaveData | null };", "type Props = { language: 'de' | 'en'; saveData: SaveData | null; onOpenOnline: () => void };")
replace_exact(worldboss, "export function WorldBossPanel({ language, saveData }: Props) {", "export function WorldBossPanel({ language, saveData, onOpenOnline }: Props) {")
replace_exact(worldboss, """      {!session ? <div className="rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42">{de ? 'Melde dich zuerst unter Online & Cloud an, um Weltbossdaten und Ranglisten zu laden.' : 'Sign in through Online & Cloud to load the world boss and rankings.'}</div> : boss ? <div className="space-y-3">
""", """      {!session ? <div className="space-y-3 rounded-2xl border border-violet-300/12 bg-violet-400/[.04] p-3 text-[10px] leading-relaxed text-white/42"><div>{de ? 'Melde dich an, um Weltbossdaten, Ranglisten und Wochenbelohnungen zu laden.' : 'Sign in to load the world boss, rankings and weekly rewards.'}</div><ActionButton label={de ? 'ZU ONLINE & CLOUD' : 'OPEN ONLINE & CLOUD'} onClick={onOpenOnline} primary /></div> : boss ? <div className="space-y-3">
""")

friends = 'artifacts/dungeon-rpg/src/components/FriendsPanel.tsx'
replace_exact(friends, "type Props = { language: 'de' | 'en' };", "type Props = { language: 'de' | 'en'; onOpenOnline: () => void };")
replace_exact(friends, "export function FriendsPanel({ language }: Props) {", "export function FriendsPanel({ language, onOpenOnline }: Props) {")
replace_exact(friends, """      {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
        <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
        <div className="mt-1">{de ? 'Melde dich unter Online & Cloud an, um Freunde zu suchen und Anfragen zu beantworten.' : 'Sign in under Online & Cloud to find friends and answer requests.'}</div>
      </div>}
""", """      {!signedIn && <div className="mt-4 rounded-2xl border border-violet-300/14 bg-violet-400/[.05] p-4 text-[10px] leading-relaxed text-white/46">
        <div className="font-black text-violet-100">{de ? 'Online-Anmeldung erforderlich' : 'Online sign-in required'}</div>
        <div className="mt-1">{de ? 'Melde dich an, um Freunde zu suchen und Anfragen zu beantworten.' : 'Sign in to find friends and answer requests.'}</div>
        <button type="button" onClick={onOpenOnline} className="mt-3 w-full rounded-xl border border-violet-300/25 bg-violet-500/12 py-2.5 text-[8px] font-black uppercase tracking-[.15em] text-violet-100 active:scale-[.98]">{de ? 'ZU ONLINE & CLOUD' : 'OPEN ONLINE & CLOUD'}</button>
      </div>}
""")

guild_social = 'artifacts/dungeon-rpg/src/components/GuildSocialPanel.tsx'
replace_exact(guild_social, "type Props = { language: 'de' | 'en'; onClose: () => void };", "type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };")
replace_exact(guild_social, "export function GuildSocialPanel({ language, onClose }: Props) {", "export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {")
replace_exact(guild_social, "<GuildPanelMobile language={language} onClose={onClose} />", "<GuildPanelMobile language={language} onClose={onClose} onOpenOnline={onOpenOnline} />")

guild_mobile = 'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx'
replace_exact(guild_mobile, "type Props = { language: 'de' | 'en'; onClose: () => void };", "type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };")
replace_exact(guild_mobile, "export function GuildPanelMobile({ language, onClose }: Props) {", "export function GuildPanelMobile({ language, onClose, onOpenOnline }: Props) {")
replace_exact(guild_mobile, """    {!session && <div className={`${scrollClass} text-[10px] leading-relaxed text-white/45`}>{de ? 'Melde dich zuerst unter Online & Cloud an. Mitgliedschaften und Einladungen werden danach hier geladen.' : 'Sign in through Online & Cloud first. Memberships and invites will then load here.'}</div>}
""", """    {!session && <div className={`${scrollClass} space-y-3 text-[10px] leading-relaxed text-white/45`}><div>{de ? 'Melde dich an, damit Mitgliedschaften und Einladungen hier geladen werden.' : 'Sign in to load memberships and invitations here.'}</div><ActionButton label={de ? 'Zu Online & Cloud' : 'Open Online & Cloud'} onClick={onOpenOnline} primary /></div>}
""")

menu = 'artifacts/dungeon-rpg/src/components/screens/MainMenuScreen.tsx'
replace_exact(menu, "{overlay === 'friends' && <FriendsPanel language={language} />}", "{overlay === 'friends' && <FriendsPanel language={language} onOpenOnline={() => setOverlay('online')} />}")
replace_exact(menu, "{overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} />}", "{overlay === 'guild' && <GuildSocialPanel language={language} onClose={() => setOverlay(null)} onOpenOnline={() => setOverlay('online')} />}")
replace_exact(menu, "{overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={props.saveData} />}", "{overlay === 'worldBoss' && <WorldBossPanel language={language} saveData={props.saveData} onOpenOnline={() => setOverlay('online')} />}")

# Inventory copy and relic source labels.
inventory = 'artifacts/dungeon-rpg/src/components/screens/VeilChamberScreen.tsx'
replace_exact(inventory, """  const refresh = (next = loadMetaProgression()) => setMeta({ ...next });
""", """  const relicSourceLabel = (source: 'hunt' | 'boss' | 'worldboss', compact = false) => {
    if (source === 'hunt') return de ? (compact ? 'JAGD-DROP' : 'JAGD-RELIKT') : (compact ? 'HUNT DROP' : 'HUNT RELIC');
    if (source === 'worldboss') return de ? (compact ? 'NUR WELTBOSS' : 'WELTBOSS-RELIKT') : (compact ? 'WORLD BOSS ONLY' : 'WORLD BOSS RELIC');
    return de ? (compact ? 'BOSS-DROP AB RAUM 20' : 'BOSS-RELIKT AB RAUM 20') : (compact ? 'BOSS DROP FROM ROOM 20' : 'BOSS RELIC FROM ROOM 20');
  };

  const refresh = (next = loadMetaProgression()) => setMeta({ ...next });
""")
replace_exact(inventory, """<div className="mt-1 text-[8px] font-black uppercase tracking-[.18em] text-violet-200/45">{activeRelic.source === 'hunt' ? (de ? 'JAGD-RELIKT' : 'HUNT RELIC') : (de ? 'RAUM-20-RELIKT' : 'ROOM 20 RELIC')}</div>""", """<div className="mt-1 text-[8px] font-black uppercase tracking-[.18em] text-violet-200/45">{relicSourceLabel(activeRelic.source)}</div>""")
replace_exact(inventory, """{de ? 'Noch kein seltenes Schleier-Relikt gefunden. Jagd-Gegner und Raum 20 können Relikte fallen lassen.' : 'No rare Veil relic found yet. Hunt enemies and room 20 can drop relics.'}""", """{de ? 'Noch kein seltenes Schleier-Relikt gefunden. Jagd-Gegner und Bossräume ab Raum 20 können Relikte fallen lassen. Der Weltenkern stammt ausschließlich vom Weltboss.' : 'No rare Veil relic found yet. Hunt enemies and boss rooms from room 20 onward can drop relics. The World Core comes exclusively from the world boss.'}""")
replace_exact(inventory, """{owned ? (de ? 'GEFUNDEN' : 'FOUND') : (relic.source === 'hunt' ? (de ? 'JAGD-DROP' : 'HUNT DROP') : (de ? 'RAUM-20-DROP' : 'ROOM 20 DROP'))}""", """{owned ? (de ? 'GEFUNDEN' : 'FOUND') : relicSourceLabel(relic.source, true)}""")
replace_exact(inventory, """{selectedLevel > 0 ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5 · ${selectedCopies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(selectedItem)} · ${sourceLabel}`}""", """{selectedLevel > 0 ? `${de ? 'AUSRÜSTUNGSLEVEL' : 'EQUIPMENT LEVEL'} ${selectedLevel}/5 · ${selectedCopies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(selectedItem)} · ${sourceLabel}`}""")
replace_exact(inventory, """                  <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedPresentation.descriptionDe : selectedPresentation.descriptionEn}</p>
                  <div className="flex-1" />
""", """                  <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedPresentation.descriptionDe : selectedPresentation.descriptionEn}</p>
                  <div className="mt-2 text-[7px] leading-relaxed text-white/28">{de ? 'Ausrüstungslevel = dauerhaftes Item-Level. Der Bonus gilt in jedem Run.' : 'Equipment level = permanent item level. The bonus applies in every run.'}</div>
                  <div className="flex-1" />
""")
replace_exact(inventory, """{progress ? `${de ? 'STUFE' : 'LEVEL'} ${progress.level} · ${progress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(item)} · ${itemSource}`}""", """{progress ? `${de ? 'ITEM-LVL' : 'ITEM LVL'} ${progress.level} · ${progress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(item)} · ${itemSource}`}""")

# Existing chapter audit must reflect the new chapter-4 ceiling.
chapter_audit = 'artifacts/dungeon-rpg/scripts/validate-inventory-guild-chat-chapters.mjs'
replace_exact(chapter_audit, "[gates.includes(\"'warden-bow': 5\") && gates.includes(\"'veil-eye': 5\") && gates.includes(\"'hunter-bow': 2\"), 'strong equipment chapter thresholds are incomplete'],", "[gates.includes(\"'warden-bow': 4\") && gates.includes(\"'veil-eye': 4\") && gates.includes(\"'hunter-bow': 2\") && !gates.match(/: [5-9],/), 'equipment must all unlock by chapter 4'],")
replace_exact(chapter_audit, "stronger items unlock in later chapters", "all normal equipment unlocks by chapter 4")

# Permanent focused regression audit.
validation = Path('artifacts/dungeon-rpg/scripts/validate-menu-copy-relic-progression.mjs')
validation.write_text("""import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [credits, inventory, presentation, gates, relics, retention, reward, effects, menu, friends, guild, worldboss] = await Promise.all([
  read('../src/components/screens/CreditsScreen.tsx'),
  read('../src/components/screens/VeilChamberScreen.tsx'),
  read('../src/game/equipmentPresentation.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/worldBossRewardLocal.ts'),
  read('../src/game/runRelicEffects.ts'),
  read('../src/components/screens/MainMenuScreen.tsx'),
  read('../src/components/FriendsPanel.tsx'),
  read('../src/components/GuildPanelMobile.tsx'),
  read('../src/components/WorldBossPanel.tsx'),
]);

const checks = [
  [credits.includes('Ein hobbyloser Typ bei seinem ersten Spielprojekt') && !credits.includes('value="Replit AI"'), 'credits are not the new humorous first-project copy'],
  [presentation.includes("'je Ausrüstungslevel'") && inventory.includes("'AUSRÜSTUNGSLEVEL'") && inventory.includes('dauerhaftes Item-Level'), 'equipment levels remain unclear'],
  [gates.includes("'warden-bow': 4") && gates.includes("'warden-quiver': 4") && gates.includes("'veil-eye': 4") && !gates.match(/: [5-9],/), 'normal equipment still unlocks after chapter 4'],
  [retention.includes("engine.state.floor >= 20 && isBossRoom(engine.state.floor)") && retention.includes('BOSS_RELIC_POOL'), 'boss relics are not limited to boss rooms from room 20 onward'],
  [relics.includes("'world-core'") && relics.includes("source: 'worldboss'") && reward.includes("unlockVeilRelic('world-core')"), 'world-boss-exclusive relic is missing'],
  [effects.includes("relic === 'world-core'") && effects.includes('activateWorldCoreForCurrentRun'), 'World Core has no real run effect'],
  [menu.includes("onOpenOnline={() => setOverlay('online')}") && friends.includes('onOpenOnline') && guild.includes('onOpenOnline') && worldboss.includes('onOpenOnline'), 'direct Online & Cloud navigation is missing'],
  [inventory.includes('Bossräume ab Raum 20') && inventory.includes('ausschließlich vom Weltboss'), 'relic source explanation is not accurate'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Menu copy/relic progression audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Menu copy/relic progression audit passed: credits, item levels, boss relics, chapter ceiling, world-boss relic and direct sign-in routes are coherent.');
""")

package = 'artifacts/dungeon-rpg/package.json'
replace_exact(package, 'node scripts/validate-player-profile.mjs",', 'node scripts/validate-player-profile.mjs && node scripts/validate-menu-copy-relic-progression.mjs",')
replace_exact(package, 'node scripts/validate-player-profile.mjs",\n    "audit:pages"', 'node scripts/validate-player-profile.mjs && node scripts/validate-menu-copy-relic-progression.mjs",\n    "audit:pages"')
