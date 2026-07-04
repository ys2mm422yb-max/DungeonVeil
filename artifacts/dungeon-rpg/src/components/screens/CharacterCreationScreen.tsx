import React, { useState, useRef } from 'react';
import { ClassKey, CLASS_DEFS } from '../../game/classes';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  onConfirm: (name: string, cls: ClassKey) => void;
  onBack: () => void;
}

const CLASS_STAT_BARS: Record<ClassKey, { hp: number; atk: number; def: number; spd: number }> = {
  warrior: { hp: 100, atk: 60, def: 100, spd: 69 },
  mage:    { hp: 53,  atk: 100, def: 25, spd: 76 },
  archer:  { hp: 67,  atk: 50,  def: 50, spd: 100 },
};

const CLASS_ORDER: ClassKey[] = ['warrior', 'mage', 'archer'];

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 text-[10px] w-8 font-mono tracking-wider shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-white/30 text-[10px] w-6 text-right font-mono">{value}</span>
    </div>
  );
}

function ClassIcon({ cls, selected }: { cls: ClassKey; selected: boolean }) {
  const def = CLASS_DEFS[cls];
  const shapes: Record<ClassKey, React.ReactElement> = {
    warrior: (
      <div className="w-8 h-8 rounded-md" style={{ background: def.color, boxShadow: selected ? `0 0 16px ${def.color}` : 'none' }} />
    ),
    mage: (
      <div className="w-7 h-7 rotate-45 rounded-sm" style={{ background: def.color, boxShadow: selected ? `0 0 16px ${def.color}` : 'none' }} />
    ),
    archer: (
      <div className="w-8 h-8 rounded-full" style={{ background: def.color, boxShadow: selected ? `0 0 16px ${def.color}` : 'none' }} />
    ),
  };
  return shapes[cls];
}

export function CharacterCreationScreen({ onConfirm, onBack }: Props) {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<ClassKey>('warrior');
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 2;
  const classDef = CLASS_DEFS[selected];
  const stats = CLASS_STAT_BARS[selected];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{ touchAction: 'auto' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-safe-top pt-6 pb-4 border-b border-white/8">
        <button
          onClick={onBack}
          onTouchStart={e => { e.preventDefault(); onBack(); }}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-white/60 active:scale-90 transition-transform"
        >
          ‹
        </button>
        <h1 className="font-serif text-xl text-white/90 tracking-widest flex-1">{t.characterCreation}</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-white/40 text-xs tracking-widest uppercase mb-2 font-mono">
            {t.heroName}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 18))}
              placeholder={t.heroNamePlaceholder}
              maxLength={18}
              className="w-full bg-white/5 border-b-2 border-white/20 focus:border-primary text-white text-xl font-serif tracking-wide py-2 px-1 outline-none placeholder:text-white/20 transition-colors"
              style={{ touchAction: 'auto', userSelect: 'text' }}
            />
            {name.length > 0 && (
              <span className="absolute right-1 bottom-2 text-white/20 text-xs font-mono">{name.length}/18</span>
            )}
          </div>
          {name.length > 0 && trimmedName.length < 2 && (
            <p className="text-red-400/80 text-xs mt-1 tracking-wide">{t.nameTooShort}</p>
          )}
        </div>

        {/* Class selection */}
        <div>
          <label className="block text-white/40 text-xs tracking-widest uppercase mb-3 font-mono">
            {t.chooseClass}
          </label>

          {/* Class tabs */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {CLASS_ORDER.map(cls => {
              const isSelected = selected === cls;
              const def = CLASS_DEFS[cls];
              return (
                <button
                  key={cls}
                  onClick={() => setSelected(cls)}
                  onTouchStart={e => { e.preventDefault(); setSelected(cls); }}
                  className={[
                    'flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all active:scale-95',
                    isSelected
                      ? 'border-2 bg-white/8'
                      : 'border-white/10 bg-white/3',
                  ].join(' ')}
                  style={isSelected ? { borderColor: def.color } : {}}
                >
                  <ClassIcon cls={cls} selected={isSelected} />
                  <span
                    className="text-xs font-bold tracking-wider"
                    style={{ color: isSelected ? def.color : 'rgba(255,255,255,0.5)' }}
                  >
                    {t.className[cls]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Class detail panel */}
          <div
            className="rounded-xl border p-4 space-y-4 transition-all duration-300"
            style={{ borderColor: `${classDef.color}40`, background: `${classDef.color}0d` }}
          >
            {/* Class name + role */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-serif text-xl font-bold" style={{ color: classDef.color }}>
                  {t.className[selected]}
                </h2>
                <span className="text-white/30 text-xs font-mono border border-white/15 px-2 py-0.5 rounded-full">
                  {t.classRole[selected]}
                </span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                {t.classDesc[selected]}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <StatBar label={t.statHp}  value={stats.hp}  color={classDef.color} />
              <StatBar label={t.statAtk} value={stats.atk} color={classDef.color} />
              <StatBar label={t.statDef} value={stats.def} color={classDef.color} />
              <StatBar label={t.statSpd} value={stats.spd} color={classDef.color} />
            </div>

            {/* Skill */}
            <div className="pt-1 border-t border-white/10">
              <p className="text-white/30 text-[10px] tracking-widest uppercase font-mono mb-1">Special Ability</p>
              <p className="text-xs font-bold" style={{ color: classDef.color }}>
                {t.classSkill[selected]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <div className="shrink-0 px-5 py-4 border-t border-white/8">
        <button
          onClick={() => { if (isValid) onConfirm(trimmedName, selected); }}
          onTouchStart={e => {
            e.preventDefault();
            if (isValid) onConfirm(trimmedName, selected);
          }}
          disabled={!isValid}
          className={[
            'w-full py-4 rounded-xl font-bold tracking-widest text-base transition-all active:scale-95 border-2',
            isValid
              ? 'border-primary text-primary-foreground shadow-[0_0_20px_rgba(232,160,32,0.25)]'
              : 'border-white/10 text-white/30 cursor-not-allowed',
          ].join(' ')}
          style={isValid ? { background: classDef.color, borderColor: classDef.color } : {}}
        >
          {t.startGame}
        </button>
      </div>
    </div>
  );
}
