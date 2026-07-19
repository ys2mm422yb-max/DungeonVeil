import React, { useEffect, useMemo, useState } from 'react';
import { ACTIVE_EQUIPMENT_SLOTS, type ActiveEquipmentSlot } from '../game/equipmentRedesign';
import {
  profileEquipmentDefinition,
  profileEquipmentPrimaryBonus,
  profileEquipmentRarityLabel,
  profileEquipmentSlotLabel,
  type CurrentProfileEquipmentItem,
} from '../game/profileEquipment';
import { TINY_SEMANTIC_UI } from '../game/tinyUiAssets';
import { KayKitEquipmentPreview } from './KayKitEquipmentPreview';

type Props = {
  items: readonly CurrentProfileEquipmentItem[];
  language: 'de' | 'en';
  testId: string;
  title?: string;
};

function SlotIcon({ slot, accent }: { slot: ActiveEquipmentSlot; accent: string }) {
  if (slot === 'armor') {
    return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-black/35" style={{ borderColor: `${accent}55` }} aria-hidden="true">
      <span className="h-8 w-7 border" style={{ borderColor: accent, background: `${accent}22`, clipPath: 'polygon(50% 0,100% 18%,90% 72%,50% 100%,10% 72%,0 18%)' }} />
    </span>;
  }
  return <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-black/35" style={{ borderColor: `${accent}55` }} aria-hidden="true">
    <img src={TINY_SEMANTIC_UI.arrow} alt="" className={`h-8 w-8 object-contain [image-rendering:pixelated] ${slot === 'bow' ? '-rotate-45' : 'rotate-[-12deg]'}`} />
    {slot === 'quiver' && <img src={TINY_SEMANTIC_UI.arrow} alt="" className="absolute h-7 w-7 translate-x-1.5 translate-y-1 -rotate-[22deg] object-contain opacity-65 [image-rendering:pixelated]" />}
  </span>;
}

export function ProfileEquipmentLoadout({ items, language, testId, title }: Props) {
  const de = language === 'de';
  const bySlot = useMemo(() => new Map(items.map(item => [item.slot, item])), [items]);
  const [selectedSlot, setSelectedSlot] = useState<ActiveEquipmentSlot>(() => items[0]?.slot ?? 'bow');

  useEffect(() => {
    if (bySlot.has(selectedSlot)) return;
    setSelectedSlot(items[0]?.slot ?? 'bow');
  }, [bySlot, items, selectedSlot]);

  const selected = bySlot.get(selectedSlot) ?? items[0] ?? null;
  const selectedDefinition = selected ? profileEquipmentDefinition(selected) : null;

  return <section data-testid={testId} className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[.025] p-3 md:p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[7px] font-black uppercase tracking-[.2em] text-cyan-100/48">{title ?? (de ? 'AKTUELLE AUSRÜSTUNG' : 'CURRENT EQUIPMENT')}</div>
        <div className="mt-1 text-[7px] text-white/32">{de ? 'Nur aktive Ausrüstung aus dem aktuellen Drei-Slot-System.' : 'Only active equipment from the current three-slot system.'}</div>
      </div>
      <span className="rounded-full border border-cyan-200/12 bg-black/25 px-2 py-1 text-[6px] font-black uppercase tracking-[.12em] text-cyan-100/55">{items.length}/3</span>
    </div>

    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,.92fr)]">
      <div className="grid gap-2">
        {ACTIVE_EQUIPMENT_SLOTS.map(slot => {
          const item = bySlot.get(slot);
          const definition = item ? profileEquipmentDefinition(item) : null;
          const active = selected?.slot === slot;
          return <button
            key={slot}
            type="button"
            data-testid={`${testId}-slot-${slot}`}
            data-equipped={item ? 'true' : 'false'}
            aria-pressed={active}
            onClick={() => setSelectedSlot(slot)}
            className={`min-w-0 rounded-2xl border p-3 text-left transition active:scale-[.99] ${active ? 'bg-white/[.07]' : 'bg-black/22'}`}
            style={{ borderColor: definition ? `${definition.accent}${active ? '88' : '44'}` : 'rgba(255,255,255,.08)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {definition ? <SlotIcon slot={slot} accent={definition.accent} /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/8 bg-black/25"><img src={TINY_SEMANTIC_UI.locked} alt="" className="h-6 w-6 object-contain opacity-28 [image-rendering:pixelated]" /></span>}
              <div className="min-w-0 flex-1">
                <div className="text-[6px] font-black uppercase tracking-[.14em] text-white/30">{profileEquipmentSlotLabel(slot, de)}</div>
                {item && definition ? <>
                  <div className="mt-1 truncate text-[10px] font-black" style={{ color: definition.accent }}>{de ? definition.nameDe : definition.nameEn}</div>
                  <div className="mt-1 text-[7px] text-white/46">{de ? `Stufe ${item.level}` : `Level ${item.level}`} · {profileEquipmentRarityLabel(item.rarity, de)}</div>
                  <div className="mt-1 truncate text-[7px] text-white/38">{profileEquipmentPrimaryBonus(item, de)}</div>
                </> : <div className="mt-1 text-[9px] font-black text-white/28">{de ? 'Leer' : 'Empty'}</div>}
              </div>
            </div>
          </button>;
        })}
      </div>

      <div data-testid={`${testId}-detail`} className="min-h-[220px] overflow-hidden rounded-2xl border border-white/9 bg-black/28">
        {selected && selectedDefinition ? <>
          <div data-testid={`${testId}-preview`} className="h-40 w-full border-b border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.08),transparent_65%)] md:h-44">
            <KayKitEquipmentPreview assetPath={selectedDefinition.assetPath} accent={selectedDefinition.accent} itemId={selected.id} />
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[6px] font-black uppercase tracking-[.15em] text-white/30">{profileEquipmentSlotLabel(selected.slot, de)}</div><div className="mt-1 text-[13px] font-black" style={{ color: selectedDefinition.accent }}>{de ? selectedDefinition.nameDe : selectedDefinition.nameEn}</div></div><span className="rounded-full border px-2 py-1 text-[6px] font-black uppercase" style={{ borderColor: `${selectedDefinition.accent}55`, color: selectedDefinition.accent }}>{profileEquipmentRarityLabel(selected.rarity, de)}</span></div>
            <div className="mt-2 text-[8px] font-black text-white/58">{de ? `Stufe ${selected.level}/5` : `Level ${selected.level}/5`} · {profileEquipmentPrimaryBonus(selected, de)}</div>
            <p className="mt-2 text-[8px] leading-relaxed text-white/38">{de ? selectedDefinition.descriptionDe : selectedDefinition.descriptionEn}</p>
          </div>
        </> : <div className="grid min-h-[220px] place-items-center p-6 text-center text-[8px] leading-relaxed text-white/30">{de ? 'Kein aktiver Gegenstand in diesem Slot.' : 'No active item in this slot.'}</div>}
      </div>
    </div>
  </section>;
}
