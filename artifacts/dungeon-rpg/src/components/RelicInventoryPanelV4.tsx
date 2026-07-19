import type { EquipmentId } from '../game/metaProgression';
import { EQUIPMENT } from '../game/metaProgression';
import { RELIC_MODE_POLICY_V4 } from '../game/relicCombatContractV4';
import type { VeilRelicId, VeilRelicProfile } from '../game/veilRelics';
import { VEIL_RELICS } from '../game/veilRelics';
import { KayKitEquipmentPreview } from './KayKitEquipmentPreview';

const RELIC_PREVIEW_ITEMS: Readonly<Record<VeilRelicId, EquipmentId>> = Object.freeze({
  'ash-eye': 'veil-eye',
  'marked-claw': 'hunter-bow',
  'night-hunt-sigil': 'ritual-shard',
  'veil-heart': 'frost-grimoire',
  'broken-guardian-crown': 'guardian-sigil',
  'depth-rune-shard': 'depth-seal',
  'world-core': 'ash-amulet',
});

const SOURCE_COPY = {
  hunt: { de: 'JAGD', en: 'HUNT' },
  boss: { de: 'BOSS', en: 'BOSS' },
  worldboss: { de: 'WELTBOSS', en: 'WORLD BOSS' },
} as const;

const MODE_COPY = {
  solo: { de: 'SOLO', en: 'SOLO' },
  duo: { de: 'DUO', en: 'DUO' },
  worldboss: { de: 'WELTBOSS', en: 'WORLD BOSS' },
} as const;

const RELIC_ORDER: readonly VeilRelicId[] = Object.freeze([
  'ash-eye',
  'marked-claw',
  'night-hunt-sigil',
  'veil-heart',
  'broken-guardian-crown',
  'depth-rune-shard',
  'world-core',
]);

type Props = {
  profile: VeilRelicProfile;
  selectedId: VeilRelicId | null;
  language: 'de' | 'en';
  newRelics: ReadonlySet<VeilRelicId>;
  onSelect: (id: VeilRelicId) => void;
  onEquip: (id: VeilRelicId) => void;
};

export function RelicInventoryPanelV4({ profile, selectedId, language, newRelics, onSelect, onEquip }: Props) {
  const de = language === 'de';
  const resolvedId = selectedId ?? profile.equipped ?? profile.owned[0] ?? RELIC_ORDER[0];
  const relic = VEIL_RELICS[resolvedId];
  const preview = EQUIPMENT[RELIC_PREVIEW_ITEMS[resolvedId]];
  const owned = profile.owned.includes(resolvedId);
  const equipped = profile.equipped === resolvedId;
  const modePolicy = RELIC_MODE_POLICY_V4[resolvedId];

  return <section
    data-testid="relic-inventory-responsive"
    data-relic-count="7"
    data-hunt-count="3"
    data-boss-count="3"
    data-worldboss-count="1"
    data-equipment-slot-consumption="0"
    className="mt-4 space-y-3"
  >
    <div data-testid="relic-source-summary" className="grid gap-2 rounded-2xl border border-violet-300/15 bg-violet-500/[.06] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:p-4">
      <p className="text-[8px] leading-relaxed text-violet-100/58 md:text-[9px]">{de
        ? 'Schleier-Relikte sind eine eigene Sammlung und belegen keinen Bogen-, Köcher- oder Rüstungsplatz. Jagden liefern drei Relikte, Bosse drei und der Weltboss den Weltenkern.'
        : 'Veil relics are a separate collection and never consume bow, quiver or armor slots. Hunts provide three relics, bosses three, and the world boss provides the World Core.'}</p>
      <div className="grid grid-cols-3 gap-1 text-center">
        <span className="rounded-lg border border-emerald-300/12 bg-emerald-400/[.05] px-2 py-1.5 text-[6px] font-black text-emerald-100/70">3 {de ? 'JAGD' : 'HUNT'}</span>
        <span className="rounded-lg border border-amber-300/12 bg-amber-400/[.05] px-2 py-1.5 text-[6px] font-black text-amber-100/70">3 BOSS</span>
        <span className="rounded-lg border border-orange-300/12 bg-orange-400/[.05] px-2 py-1.5 text-[6px] font-black text-orange-100/70">1 {de ? 'WELTBOSS' : 'WORLD'}</span>
      </div>
    </div>

    <div data-testid="relic-inventory-tablet-columns" className="grid gap-3 md:grid-cols-[minmax(300px,.88fr)_minmax(0,1.12fr)] md:gap-4">
      <article data-testid="relic-selected-detail" data-relic-id={resolvedId} className="overflow-hidden rounded-3xl border border-violet-300/22 bg-black/52 shadow-[0_18px_50px_rgba(0,0,0,.32)]">
        <div className="grid min-h-[280px] grid-rows-[190px_auto] sm:grid-cols-[42%_58%] sm:grid-rows-1 md:min-h-[430px] md:grid-cols-1 md:grid-rows-[230px_auto] lg:grid-cols-[44%_56%] lg:grid-rows-1">
          <div data-testid="relic-selected-preview" className="min-h-0 border-b border-white/8 sm:border-b-0 sm:border-r md:border-b md:border-r-0 lg:border-b-0 lg:border-r">
            <KayKitEquipmentPreview assetPath={preview.assetPath} accent={relic.accent} itemId={preview.id} />
          </div>
          <div className="flex min-w-0 flex-col p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/[.035] px-2 py-1 text-[6px] font-black tracking-[.13em] text-white/48">{SOURCE_COPY[relic.source][de ? 'de' : 'en']}</span>
              {equipped && <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-1 text-[6px] font-black tracking-[.13em] text-violet-100">{de ? 'AKTIV' : 'ACTIVE'}</span>}
              {!owned && <span className="rounded-full border border-white/8 bg-black/30 px-2 py-1 text-[6px] font-black tracking-[.13em] text-white/30">{de ? 'NICHT GEFUNDEN' : 'NOT FOUND'}</span>}
            </div>
            <h2 className="mt-3 text-xl font-black text-white md:text-2xl" style={{ textShadow: `0 0 18px ${relic.accent}55` }}>{de ? relic.nameDe : relic.nameEn}</h2>
            <p className="mt-3 text-[11px] leading-relaxed text-white/62 md:text-[12px]">{de ? relic.descriptionDe : relic.descriptionEn}</p>
            <div data-testid="relic-mode-policy" className="mt-4 grid grid-cols-3 gap-1.5">
              {(Object.keys(modePolicy) as Array<keyof typeof modePolicy>).map(mode => <div key={mode} data-mode={mode} data-enabled={String(modePolicy[mode])} className={`rounded-xl border px-2 py-2 text-center ${modePolicy[mode] ? 'border-emerald-300/14 bg-emerald-400/[.055] text-emerald-100/72' : 'border-white/7 bg-black/24 text-white/24'}`}><div className="text-[5px] font-black tracking-[.12em]">{MODE_COPY[mode][de ? 'de' : 'en']}</div><div className="mt-1 text-[6px] font-black">{modePolicy[mode] ? (de ? 'AKTIV' : 'ACTIVE') : '—'}</div></div>)}
            </div>
            <div className="flex-1" />
            <button data-testid="relic-equip-button" type="button" disabled={!owned || equipped} onPointerDown={event => { event.preventDefault(); if (owned && !equipped) onEquip(resolvedId); }} className="mt-5 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 py-3 text-[9px] font-black disabled:opacity-35">{equipped ? (de ? 'AKTIV' : 'ACTIVE') : owned ? (de ? 'AUSRÜSTEN' : 'EQUIP') : (de ? 'NOCH NICHT GEFUNDEN' : 'NOT YET FOUND')}</button>
          </div>
        </div>
      </article>

      <section data-testid="relic-card-grid" className="grid content-start gap-2 sm:grid-cols-2">
        {RELIC_ORDER.map(id => {
          const definition = VEIL_RELICS[id];
          const hasRelic = profile.owned.includes(id);
          const active = profile.equipped === id;
          const selected = resolvedId === id;
          const policy = RELIC_MODE_POLICY_V4[id];
          return <button
            key={id}
            data-testid={`relic-card-${id}`}
            data-owned={String(hasRelic)}
            data-equipped={String(active)}
            type="button"
            onPointerDown={event => { event.preventDefault(); onSelect(id); }}
            className={`relative min-h-[112px] overflow-hidden rounded-2xl border p-3 text-left active:scale-[.99] md:min-h-[126px] md:p-4 ${selected ? 'border-violet-200/32 bg-violet-400/[.09]' : 'border-white/8 bg-black/38'} ${hasRelic ? '' : 'opacity-52'}`}
          >
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: definition.accent }} />
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-black/32" style={{ boxShadow: `inset 0 0 18px ${definition.accent}33,0 0 14px ${definition.accent}22` }} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1"><span className="truncate text-[10px] font-black text-white/84 md:text-[11px]">{de ? definition.nameDe : definition.nameEn}</span>{active && <span className="rounded-full border border-violet-300/20 px-1.5 py-0.5 text-[5px] font-black text-violet-100">{de ? 'AKTIV' : 'ACTIVE'}</span>}{newRelics.has(id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-1.5 py-0.5 text-[5px] font-black text-white">{de ? 'NEU' : 'NEW'}</span>}</span>
                <span className="mt-1 block text-[6px] font-black tracking-[.13em] text-white/30">{SOURCE_COPY[definition.source][de ? 'de' : 'en']} · {hasRelic ? (de ? 'GEFUNDEN' : 'FOUND') : (de ? 'GESPERRT' : 'LOCKED')}</span>
                <span className="mt-2 flex flex-wrap gap-1">{(Object.keys(policy) as Array<keyof typeof policy>).filter(mode => policy[mode]).map(mode => <span key={mode} className="rounded-full border border-white/8 bg-black/22 px-1.5 py-0.5 text-[5px] font-black text-white/36">{MODE_COPY[mode][de ? 'de' : 'en']}</span>)}</span>
              </span>
            </div>
          </button>;
        })}
      </section>
    </div>
  </section>;
}
