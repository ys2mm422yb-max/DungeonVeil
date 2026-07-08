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
};

const CARD_STYLES: Record<UpgradeKey, CardStyle> = {
  multishot: { Icon: ChevronsRight, accent: '#e7b750', glow: 'rgba(231,183,80,.45)', label: 'MEHRFACHPFEIL', detail: '+1 zusätzlicher Pfeil' },
  ricochet: { Icon: Route, accent: '#9c83ff', glow: 'rgba(156,131,255,.42)', label: 'ABPRALLER', detail: 'Springt auf ein weiteres Ziel' },
  fireArrow: { Icon: Flame, accent: '#ff7045', glow: 'rgba(255,112,69,.45)', label: 'FEUERPFEIL', detail: 'Treffer verursachen Feuerschaden' },
  attackSpeed: { Icon: Gauge, accent: '#62d9ff', glow: 'rgba(98,217,255,.4)', label: 'SCHNELLZUG', detail: 'Bogen schneller spannen' },
  piercing: { Icon: ArrowUpRight, accent: '#d7e4ec', glow: 'rgba(215,228,236,.38)', label: 'DURCHBOHREN', detail: 'Pfeile durchdringen Gegner' },
  maxHp: { Icon: HeartPulse, accent: '#ff6e7e', glow: 'rgba(255,110,126,.42)', label: 'LEBENSKRAFT', detail: '+20 maximale Lebenspunkte' },
  heal: { Icon: Sparkles, accent: '#70e5a2', glow: 'rgba(112,229,162,.4)', label: 'ERHOLUNG', detail: 'Heilt 50 % deiner Lebenspunkte' },
  attack: { Icon: Swords, accent: '#f2c76f', glow: 'rgba(242,199,111,.4)', label: 'JÄGERINSTINKT', detail: '+8 Angriffsschaden' },
  speed: { Icon: WandSparkles, accent: '#69cbff', glow: 'rgba(105,203,255,.4)', label: 'WINDLÄUFER', detail: '+15 Bewegungstempo' },
  defense: { Icon: Shield, accent: '#8eb2ff', glow: 'rgba(142,178,255,.4)', label: 'WALDHAUT', detail: '+3 Verteidigung' },
};

export function LevelUpScreen({ choices, onSelect }: Props) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<UpgradeKey | null>(null);
  const [entered] = useState(() => performance.now());

  const cards = useMemo(() => choices.map(key => ({ key, ...CARD_STYLES[key] })), [choices]);

  const choose = (key: UpgradeKey) => {
    if (selected) return;
    setSelected(key);
    try { navigator.vibrate?.([18, 28, 42]); } catch {}
    window.setTimeout(() => onSelect(key), 430);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-[#050708]/95 text-white backdrop-blur-lg touch-none select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(183,135,45,.18),transparent_34%),radial-gradient(circle_at_50%_72%,rgba(77,52,122,.2),transparent_48%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      <div className="relative flex h-full flex-col px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))]">
        <header className="mb-6 text-center" style={{ animation: 'veilTitle .5s cubic-bezier(.2,.9,.25,1) both' }}>
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-amber-300/45 bg-amber-400/10 shadow-[0_0_48px_rgba(229,176,73,.22)]">
            <Sparkles size={24} strokeWidth={1.7} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[.42em] text-amber-200/55">RUN LEVEL UP</div>
          <h1 className="mt-2 font-serif text-[38px] leading-none tracking-[.08em] text-[#f4ead5]">
            {language === 'de' ? 'WÄHLE DEINEN PFAD' : 'CHOOSE YOUR PATH'}
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[.25em] text-white/38">
            {language === 'de' ? 'Eine Gabe bleibt für diesen Run' : 'One gift remains for this run'}
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
                className={`group relative min-h-[132px] overflow-hidden rounded-[22px] border text-left transition-all duration-300 ${picked ? 'scale-[1.045] border-white/70' : faded ? 'scale-[.92] opacity-0' : 'border-white/10 active:scale-[.97]'}`}
                style={{
                  animation: `veilCard .48s cubic-bezier(.2,.9,.25,1) ${Math.max(0, performance.now() - entered) >= 0 ? index * 90 : 0}ms both`,
                  background: `linear-gradient(135deg, rgba(18,20,22,.98), rgba(7,9,10,.96)), radial-gradient(circle at 18% 50%, ${card.glow}, transparent 38%)`,
                  boxShadow: picked ? `0 0 55px ${card.glow}, inset 0 0 0 1px ${card.accent}66` : '0 18px 45px rgba(0,0,0,.35)',
                }}
              >
                <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 16% 50%, ${card.glow}, transparent 34%)` }} />
                <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: card.accent, boxShadow: `0 0 18px ${card.accent}` }} />
                <div className="relative flex h-full items-center gap-5 px-5 py-5">
                  <div
                    className={`grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl border transition-all duration-300 ${picked ? 'rotate-[8deg] scale-110' : 'group-active:scale-95'}`}
                    style={{ borderColor: `${card.accent}66`, background: `${card.accent}12`, color: card.accent, boxShadow: `inset 0 0 28px ${card.glow}` }}
                  >
                    <Icon size={36} strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[.28em]" style={{ color: card.accent }}>
                        {language === 'de' ? 'RUN-GABE' : 'RUN GIFT'}
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="text-[19px] font-black tracking-[.055em] text-[#f8f3e9]">{card.label}</div>
                    <div className="mt-1 text-[13px] leading-snug text-white/58">{card.detail}</div>
                  </div>
                </div>
                {picked && <div className="absolute inset-0 animate-pulse border border-white/40 bg-white/[.04]" />}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes veilCard { from { opacity:0; transform:translateY(48px) scale(.9); filter:blur(8px) } to { opacity:1; transform:translateY(0) scale(1); filter:blur(0) } }
        @keyframes veilTitle { from { opacity:0; transform:translateY(-20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}
