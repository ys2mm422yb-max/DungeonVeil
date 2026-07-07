import React, { useState } from 'react';
import { ClassKey, CLASS_DEFS } from '../../game/classes';
import { TINY_CLASS_SPRITES } from '../../game/premiumPixelArt';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  onConfirm: (name: string, cls: ClassKey) => void;
  onBack: () => void;
}

const CLASS_ORDER: ClassKey[] = ['warrior', 'mage', 'archer'];
const CLASS_SHEET_GRID: Record<ClassKey, { cols: number; rows: number }> = {
  warrior: { cols: 8, rows: 1 },
  mage: { cols: 6, rows: 1 },
  archer: { cols: 6, rows: 1 },
};

const CLASS_STAT_BARS: Record<ClassKey, { hp: number; atk: number; def: number; spd: number }> = {
  warrior: { hp: 100, atk: 60, def: 100, spd: 69 },
  mage: { hp: 53, atk: 100, def: 25, spd: 76 },
  archer: { hp: 67, atk: 50, def: 50, spd: 100 },
};

const CLASS_COPY: Record<ClassKey, { strengths: string; weaknesses: string; kit: string }> = {
  warrior: {
    strengths: 'High armor, steady melee pressure, forgiving health pool.',
    weaknesses: 'Short reach and slower repositioning.',
    kit: 'Sword swing, guard dash, rage burst.',
  },
  mage: {
    strengths: 'Explosive magic damage, strong area control, high skill burst.',
    weaknesses: 'Low defense and demands clean spacing.',
    kit: 'Arcane bolt, blink dash, nova burst.',
  },
  archer: {
    strengths: 'Fast movement, long reach, safest basic attacks.',
    weaknesses: 'Lower durability and lighter single hits.',
    kit: 'Arrow shot, evasive dash, arrow rain.',
  },
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2">
      <span className="text-[10px] font-mono tracking-widest text-amber-100/55">{label}</span>
      <div className="h-2 overflow-hidden rounded-sm border border-amber-200/15 bg-black/35">
        <div className="h-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-right text-[10px] font-mono text-amber-100/45">{value}</span>
    </div>
  );
}

function CharacterPreview({ cls, selected }: { cls: ClassKey; selected: boolean }) {
  const grid = CLASS_SHEET_GRID[cls];
  const frame = selected ? 1 : 0;
  const frameX = frame % grid.cols;
  const frameY = Math.floor(frame / grid.cols);
  return (
    <div className={['relative mx-auto h-40 w-full min-w-0 overflow-hidden rounded border bg-[radial-gradient(circle_at_50%_34%,rgba(255,224,142,0.14),transparent_38%),linear-gradient(180deg,rgba(37,25,14,0.72),rgba(0,0,0,0.42))] transition-all', selected ? 'border-amber-300/70 shadow-[0_0_28px_rgba(232,178,74,0.28)]' : 'border-amber-100/15'].join(' ')}>
      <div className="absolute inset-x-5 bottom-7 h-6 rounded-full bg-black/50 blur-sm" />
      <div
        className="absolute left-1/2 top-[54%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 bg-no-repeat [image-rendering:pixelated]"
        style={{
          backgroundImage: `url("${TINY_CLASS_SPRITES[cls]}")`,
          backgroundSize: `${grid.cols * 100}% ${grid.rows * 100}%`,
          backgroundPosition: `${grid.cols === 1 ? 0 : (frameX / (grid.cols - 1)) * 100}% ${grid.rows === 1 ? 0 : (frameY / (grid.rows - 1)) * 100}%`,
          transform: 'translate(-50%, -50%) scale(1.42)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 border border-white/5" />
    </div>
  );
}

export function CharacterCreationScreen({ onConfirm, onBack }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<ClassKey>('warrior');

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;
  const classDef = CLASS_DEFS[selected];
  const stats = CLASS_STAT_BARS[selected];
  const copy = CLASS_COPY[selected];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#090807] text-amber-50" style={{ touchAction: 'auto' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(179,116,36,0.20),transparent_34%),linear-gradient(180deg,rgba(31,22,13,0.96),rgba(5,5,6,1))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 border-b border-amber-100/10 bg-gradient-to-b from-amber-900/15 to-transparent" />

      <div className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-4 pt-6 pt-safe-top">
        <button
          onClick={onBack}
          onTouchStart={e => { e.preventDefault(); onBack(); }}
          className="flex h-11 w-11 items-center justify-center rounded border border-amber-100/20 bg-black/35 text-2xl text-amber-100/75 active:scale-95"
        >
          &lsaquo;
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/45">Dungeon Veil</p>
          <h1 className="font-serif text-2xl tracking-widest text-amber-50">{t.characterCreation}</h1>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
        <div className="mb-5 rounded border border-amber-100/15 bg-black/32 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
          <label className="mb-2 block text-[10px] font-mono uppercase tracking-[0.28em] text-amber-100/45">{t.heroName}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 18))}
            placeholder={t.heroNamePlaceholder}
            maxLength={18}
            className="w-full border-b border-amber-100/25 bg-transparent px-1 py-3 font-serif text-2xl tracking-wide text-amber-50 outline-none placeholder:text-amber-100/20 focus:border-amber-300/80"
            style={{ touchAction: 'auto', userSelect: 'text' }}
          />
          {name.length > 0 && trimmedName.length < 2 && <p className="mt-2 text-xs text-red-300/85">{t.nameTooShort}</p>}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {CLASS_ORDER.map(cls => {
            const isSelected = selected === cls;
            const def = CLASS_DEFS[cls];
            return (
              <button
                key={cls}
                onClick={() => setSelected(cls)}
                onTouchStart={e => { e.preventDefault(); setSelected(cls); }}
                className={['rounded border p-2 active:scale-95 transition-all', isSelected ? 'bg-amber-200/10' : 'bg-black/25'].join(' ')}
                style={{ borderColor: isSelected ? def.color : 'rgba(253,230,138,0.16)' }}
              >
                <CharacterPreview cls={cls} selected={isSelected} />
                <span className="mt-2 block truncate text-xs font-bold tracking-wider" style={{ color: isSelected ? def.color : 'rgba(254,243,199,0.62)' }}>
                  {t.className[cls]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded border border-amber-100/15 bg-black/38 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-3xl font-bold tracking-wider" style={{ color: classDef.color }}>{t.className[selected]}</h2>
              <p className="mt-1 text-xs font-mono uppercase tracking-[0.22em] text-amber-100/45">{t.classRole[selected]}</p>
            </div>
            <div className="rounded border border-amber-100/15 bg-amber-100/5 px-3 py-2 text-right text-[10px] font-mono uppercase tracking-widest text-amber-100/55">
              Lv. 1
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-amber-50/68">{t.classDesc[selected]}</p>

          <div className="mb-4 grid gap-2">
            <StatBar label={t.statHp} value={stats.hp} color={classDef.color} />
            <StatBar label={t.statAtk} value={stats.atk} color={classDef.color} />
            <StatBar label={t.statDef} value={stats.def} color={classDef.color} />
            <StatBar label={t.statSpd} value={stats.spd} color={classDef.color} />
          </div>

          <div className="grid gap-3 text-xs leading-relaxed text-amber-50/62">
            <p><span className="font-bold text-amber-200/85">Strengths:</span> {copy.strengths}</p>
            <p><span className="font-bold text-amber-200/85">Weaknesses:</span> {copy.weaknesses}</p>
            <p><span className="font-bold text-amber-200/85">Starting abilities:</span> {copy.kit}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-amber-100/12 bg-black/55 px-5 py-4">
        <button
          onClick={() => { if (isValid) onConfirm(trimmedName, selected); }}
          onTouchStart={e => { e.preventDefault(); if (isValid) onConfirm(trimmedName, selected); }}
          disabled={!isValid}
          className="w-full rounded border-2 py-4 text-base font-bold tracking-[0.22em] transition-all active:scale-95 disabled:border-white/10 disabled:bg-white/5 disabled:text-white/25"
          style={isValid ? { background: classDef.color, borderColor: classDef.color, color: '#080604', boxShadow: `0 0 24px ${classDef.color}40` } : {}}
        >
          {t.startGame}
        </button>
      </div>
    </div>
  );
}
