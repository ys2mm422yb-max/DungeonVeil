import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronsRight,
  Flame,
  Gauge,
  HeartPulse,
  Route,
  Shield,
  Sparkles,
  Swords,
  WandSparkles,
} from 'lucide-react';
import { UpgradeKey } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  choices: UpgradeKey[];
  onSelect: (choice: UpgradeKey) => void;
}

type CardStyle = {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: string;
  glow: string;
  label: string;
  detail: string;
  tier: string;
  rune: string;
};

const CARD_STYLES: Record<UpgradeKey, CardStyle> = {
  multishot: { Icon: ChevronsRight, accent: '#e7b750', glow: 'rgba(231,183,80,.48)', label: 'MEHRFACHPFEIL', detail: '+1 zusätzlicher Pfeil', tier: 'ANGRIFF', rune: 'III' },
  ricochet: { Icon: Route, accent: '#9c83ff', glow: 'rgba(156,131,255,.46)', label: 'ABPRALLER', detail: 'Springt auf ein weiteres Ziel', tier: 'ARCAN', rune: '◇' },
  fireArrow: { Icon: Flame, accent: '#ff7045', glow: 'rgba(255,112,69,.5)', label: 'FEUERPFEIL', detail: 'Treffer verursachen Feuerschaden', tier: 'ELEMENT', rune: '△' },
  attackSpeed: { Icon: Gauge, accent: '#62d9ff', glow: 'rgba(98,217,255,.44)', label: 'SCHNELLZUG', detail: 'Bogen schneller spannen', tier: 'TEMPO', rune: '»' },
  piercing: { Icon: ArrowUpRight, accent: '#d7e4ec', glow: 'rgba(215,228,236,.42)', label: 'DURCHBOHREN', detail: 'Pfeile durchdringen Gegner', tier: 'PRÄZISION', rune: '↑' },
  maxHp: { Icon: HeartPulse, accent: '#ff6e7e', glow: 'rgba(255,110,126,.46)', label: 'LEBENSKRAFT', detail: '+20 maximale Lebenspunkte', tier: 'VITALITÄT', rune: '♥' },
  heal: { Icon: Sparkles, accent: '#70e5a2', glow: 'rgba(112,229,162,.44)', label: 'ERHOLUNG', detail: 'Heilt 50 % deiner Lebenspunkte', tier: 'HEILUNG', rune: '+' },
  attack: { Icon: Swords, accent: '#f2c76f', glow: 'rgba(242,199,111,.46)', label: 'JÄGERINSTINKT', detail: '+8 Angriffsschaden', tier: 'ANGRIFF', rune: 'X' },
  speed: { Icon: WandSparkles, accent: '#69cbff', glow: 'rgba(105,203,255,.44)', label: 'WINDLÄUFER', detail: '+15 Bewegungstempo', tier: 'TEMPO', rune: '≈' },
  defense: { Icon: Shield, accent: '#8eb2ff', glow: 'rgba(142,178,255,.44)', label: 'WALDHAUT', detail: '+3 Verteidigung', tier: 'SCHUTZ', rune: '⬡' },
};

export function LevelUpScreen({ choices, onSelect }: Props) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<UpgradeKey | null>(null);
  const cards = useMemo(() => choices.map(key => ({ key, ...CARD_STYLES[key] })), [choices]);

  const choose = (key: UpgradeKey) => {
    if (selected) return;
    setSelected(key);
    try { navigator.vibrate?.([18, 28, 42]); } catch {}
    window.setTimeout(() => onSelect(key), 390);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-[#040506]/95 text-white backdrop-blur-xl touch-none select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(225,169,60,.2),transparent_28%),radial-gradient(circle_at_20%_70%,rgba(99,63,150,.18),transparent_38%),radial-gradient(circle_at_82%_74%,rgba(82,38,38,.16),transparent_36%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="absolute left-1/2 top-[13%] h-40 w-40 -translate-x-1/2 rounded-full border border-amber-200/[.05] shadow-[0_0_90px_rgba(225,169,60,.1)]" />

      <div className="relative flex h-full flex-col px-5 pb-[max(26px,env(safe-area-inset-bottom))] pt-[max(30px,env(safe-area-inset-top))]">
        <header className="mb-5 text-center" style={{ animation: 'veilTitle .48s cubic-bezier(.2,.9,.25,1) both' }}>
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-amber-300/45 bg-amber-400/10 shadow-[0_0_48px_rgba(229,176,73,.22)]">
            <Sparkles size={24} strokeWidth={1.7} />
          </div>
          <div className="text-[9px] font-black uppercase tracking-[.44em] text-amber-200/55">RAUM BEZWUNGEN</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[.95] tracking-[.08em] text-[#f4ead5]">
            {language === 'de' ? 'WÄHLE DEINE GABE' : 'CHOOSE YOUR GIFT'}
          </h1>
          <p className="mt-3 text-[10px] uppercase tracking-[.25em] text-white/38">
            {language === 'de' ? 'Eine Gabe vor dem nächsten Raum' : 'One gift before the next room'}
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3">
          {cards.map((card, index) => {
            const picked = selected === card.key;
            const faded = selected !== null && !picked;
            const Icon = card.Icon;
            return (
              <button
                key={card.key}
                onPointerDown={(event) => { event.preventDefault(); choose(card.key); }}
                className={`group relative min-h-[136px] overflow-hidden rounded-[24px] border text-left transition-all duration-300 ${picked ? 'scale-[1.04] border-white/75' : faded ? 'scale-[.94] opacity-0' : 'border-white/10 active:scale-[.975]'}`}
                style={{
                  animation: `veilCard .48s cubic-bezier(.2,.9,.25,1) ${index * 85}ms both`,
                  background: `linear-gradient(135deg, rgba(18,20,22,.98), rgba(5,7,8,.98))`,
                  boxShadow: picked ? `0 0 70px ${card.glow}, inset 0 0 0 1px ${card.accent}66` : '0 20px 48px rgba(0,0,0,.4)',
                }}
              >
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 13% 50%, ${card.glow}, transparent 34%)` }} />
                <div className="absolute -right-5 -top-8 select-none font-serif text-[120px] leading-none opacity-[.055]" style={{ color: card.accent }}>{card.rune}</div>
                <div className="absolute inset-y-0 left-0 w-[4px]" style={{ background: card.accent, boxShadow: `0 0 22px ${card.accent}` }} />

                <div className="relative flex h-full items-center gap-5 px-5 py-5">
                  <div
                    className={`relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[20px] border transition-all duration-300 ${picked ? 'rotate-[7deg] scale-110' : 'group-active:scale-95'}`}
                    style={{ borderColor: `${card.accent}78`, background: `${card.accent}16`, color: card.accent, boxShadow: `inset 0 0 30px ${card.glow}, 0 0 20px ${card.glow}` }}
                  >
                    <Icon size={38} strokeWidth={1.55} />
                    <div className="absolute -bottom-2 rounded-full border border-black/50 bg-[#090b0c] px-2 py-0.5 text-[7px] font-black tracking-[.2em]" style={{ color: card.accent }}>{card.tier}</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-[.32em]" style={{ color: card.accent }}>
                        {language === 'de' ? `GABE ${index + 1}` : `GIFT ${index + 1}`}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="text-[20px] font-black tracking-[.05em] text-[#f8f3e9]">{card.label}</div>
                    <div className="mt-1.5 text-[13px] leading-snug text-white/60">{card.detail}</div>
                  </div>
                </div>

                {picked && <div className="absolute inset-0 animate-pulse border border-white/45 bg-white/[.05]" />}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes veilCard { from { opacity:0; transform:translateY(42px) scale(.92); filter:blur(7px) } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0) } }
        @keyframes veilTitle { from { opacity:0; transform:translateY(-18px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}
