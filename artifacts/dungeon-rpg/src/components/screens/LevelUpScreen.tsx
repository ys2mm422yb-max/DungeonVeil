import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronsRight,
  Flame,
  Gauge,
  GitMerge,
  HeartPulse,
  Orbit,
  Route,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  WandSparkles,
  Wind,
} from 'lucide-react';
import { UpgradeKey } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';
import { RUN_SKILL_DEFS, isFusionKey, isInstantGift, nextSkillRank } from '../../game/runSkills';

interface Props {
  choices: UpgradeKey[];
  runSkills: Partial<Record<UpgradeKey, number>>;
  onSelect: (choice: UpgradeKey) => void;
}

type CardStyle = {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: string;
  glow: string;
  labelDe: string;
  labelEn: string;
  tierDe: string;
  tierEn: string;
  rune: string;
};

const CARD_STYLES: Record<UpgradeKey, CardStyle> = {
  multishot: { Icon: ChevronsRight, accent: '#e7b750', glow: 'rgba(231,183,80,.48)', labelDe: 'MEHRFACHPFEIL', labelEn: 'MULTISHOT', tierDe: 'ANGRIFF', tierEn: 'ATTACK', rune: 'III' },
  ricochet: { Icon: Route, accent: '#9c83ff', glow: 'rgba(156,131,255,.46)', labelDe: 'ABPRALLER', labelEn: 'RICOCHET', tierDe: 'ARKAN', tierEn: 'ARCANE', rune: '◇' },
  fireArrow: { Icon: Flame, accent: '#ff7045', glow: 'rgba(255,112,69,.5)', labelDe: 'FEUERPFEIL', labelEn: 'FIRE ARROW', tierDe: 'ELEMENT', tierEn: 'ELEMENT', rune: '△' },
  iceArrow: { Icon: Snowflake, accent: '#71d9ff', glow: 'rgba(113,217,255,.5)', labelDe: 'FROSTPFEIL', labelEn: 'FROST ARROW', tierDe: 'ELEMENT', tierEn: 'ELEMENT', rune: '✦' },
  attackSpeed: { Icon: Gauge, accent: '#62d9ff', glow: 'rgba(98,217,255,.44)', labelDe: 'SCHNELLZUG', labelEn: 'QUICK DRAW', tierDe: 'TEMPO', tierEn: 'TEMPO', rune: '»' },
  piercing: { Icon: ArrowUpRight, accent: '#d7e4ec', glow: 'rgba(215,228,236,.42)', labelDe: 'DURCHBOHREN', labelEn: 'PIERCING', tierDe: 'PRÄZISION', tierEn: 'PRECISION', rune: '↑' },
  elementalStorm: { Icon: Orbit, accent: '#d89cff', glow: 'rgba(216,156,255,.52)', labelDe: 'ELEMENTARSTURM', labelEn: 'ELEMENTAL STORM', tierDe: 'FUSION', tierEn: 'FUSION', rune: '✺' },
  arrowStorm: { Icon: Wind, accent: '#f0cf72', glow: 'rgba(240,207,114,.5)', labelDe: 'PFEILSTURM', labelEn: 'ARROW STORM', tierDe: 'FUSION', tierEn: 'FUSION', rune: '⇶' },
  veilChain: { Icon: GitMerge, accent: '#b8a2ff', glow: 'rgba(184,162,255,.52)', labelDe: 'SCHLEIERKETTE', labelEn: 'VEIL CHAIN', tierDe: 'FUSION', tierEn: 'FUSION', rune: '⌁' },
  maxHp: { Icon: HeartPulse, accent: '#ff6e7e', glow: 'rgba(255,110,126,.46)', labelDe: 'LEBENSKRAFT', labelEn: 'VITALITY', tierDe: 'VITALITÄT', tierEn: 'VITALITY', rune: '♥' },
  heal: { Icon: Sparkles, accent: '#70e5a2', glow: 'rgba(112,229,162,.44)', labelDe: 'ERHOLUNG', labelEn: 'RECOVERY', tierDe: 'SOFORT', tierEn: 'INSTANT', rune: '+' },
  hunterBlessing: { Icon: Swords, accent: '#f2c76f', glow: 'rgba(242,199,111,.46)', labelDe: 'JÄGERSEGEN', labelEn: 'HUNTER BLESSING', tierDe: 'SEGEN', tierEn: 'BLESSING', rune: '✧' },
  vitalSpark: { Icon: HeartPulse, accent: '#ff8da0', glow: 'rgba(255,141,160,.46)', labelDe: 'LEBENSFUNKE', labelEn: 'VITAL SPARK', tierDe: 'SEGEN', tierEn: 'BLESSING', rune: '✦' },
  attack: { Icon: Swords, accent: '#f2c76f', glow: 'rgba(242,199,111,.46)', labelDe: 'JÄGERINSTINKT', labelEn: 'HUNTER INSTINCT', tierDe: 'ANGRIFF', tierEn: 'ATTACK', rune: 'X' },
  speed: { Icon: WandSparkles, accent: '#69cbff', glow: 'rgba(105,203,255,.44)', labelDe: 'WINDLÄUFER', labelEn: 'WINDRUNNER', tierDe: 'TEMPO', tierEn: 'TEMPO', rune: '≈' },
  defense: { Icon: Shield, accent: '#8eb2ff', glow: 'rgba(142,178,255,.44)', labelDe: 'WALDHAUT', labelEn: 'FOREST SKIN', tierDe: 'SCHUTZ', tierEn: 'GUARD', rune: '⬡' },
};

const roman = (rank: number) => rank === 1 ? 'I' : rank === 2 ? 'II' : rank === 3 ? 'III' : String(rank);

export function LevelUpScreen({ choices, runSkills, onSelect }: Props) {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<UpgradeKey | null>(null);
  const cards = useMemo(() => choices.map(key => {
    const style = CARD_STYLES[key];
    const rank = nextSkillRank(runSkills, key);
    const def = RUN_SKILL_DEFS[key];
    const instant = isInstantGift(key);
    const fusion = isFusionKey(key);
    return {
      key,
      ...style,
      rank,
      instant,
      fusion,
      label: language === 'de' ? style.labelDe : style.labelEn,
      tier: language === 'de' ? style.tierDe : style.tierEn,
      detail: language === 'de' ? def.rankTextDe[Math.max(0, rank - 1)] : def.rankTextEn[Math.max(0, rank - 1)],
    };
  }), [choices, language, runSkills]);

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
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-amber-300/45 bg-amber-400/10 shadow-[0_0_48px_rgba(229,176,73,.22)]"><Sparkles size={24} strokeWidth={1.7} /></div>
          <div className="text-[9px] font-black uppercase tracking-[.44em] text-amber-200/55">{language === 'de' ? 'RAUM BEZWUNGEN' : 'ROOM CLEARED'}</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[.95] tracking-[.08em] text-[#f4ead5]">{language === 'de' ? 'WÄHLE DEINE GABE' : 'CHOOSE YOUR GIFT'}</h1>
          <p className="mt-3 text-[10px] uppercase tracking-[.25em] text-white/38">{language === 'de' ? 'Eine Wahl vor dem nächsten Raum' : 'One choice before the next room'}</p>
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3">
          {cards.map((card, index) => {
            const picked = selected === card.key;
            const faded = selected !== null && !picked;
            const Icon = card.Icon;
            const rankLabel = card.fusion
              ? (language === 'de' ? 'KOMBINATION · 2× RANG III' : 'COMBINATION · 2× RANK III')
              : card.instant
                ? card.key === 'heal'
                  ? (language === 'de' ? `WAHL ${index + 1} · SOFORTEFFEKT` : `CHOICE ${index + 1} · INSTANT EFFECT`)
                  : (language === 'de' ? `WAHL ${index + 1} · WIEDERHOLBARER SEGEN` : `CHOICE ${index + 1} · REPEATABLE BLESSING`)
                : (language === 'de' ? `GABE ${index + 1} · RANG ${roman(card.rank)}` : `GIFT ${index + 1} · RANK ${roman(card.rank)}`);
            return (
              <button
                key={card.key}
                data-testid={`gift-choice-${card.key}`}
                onPointerDown={(event) => { event.preventDefault(); choose(card.key); }}
                className={`group relative min-h-[136px] overflow-hidden rounded-[24px] border text-left transition-all duration-300 ${picked ? 'scale-[1.04] border-white/75' : faded ? 'scale-[.94] opacity-0' : 'border-white/10 active:scale-[.975]'}`}
                style={{ animation: `veilCard .48s cubic-bezier(.2,.9,.25,1) ${index * 85}ms both`, background: 'linear-gradient(135deg, rgba(18,20,22,.98), rgba(5,7,8,.98))', boxShadow: picked ? `0 0 70px ${card.glow}, inset 0 0 0 1px ${card.accent}66` : '0 20px 48px rgba(0,0,0,.4)' }}
              >
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 13% 50%, ${card.glow}, transparent 34%)` }} />
                <div className="absolute -right-5 -top-8 select-none font-serif text-[120px] leading-none opacity-[.055]" style={{ color: card.accent }}>{card.rune}</div>
                <div className="absolute inset-y-0 left-0 w-[4px]" style={{ background: card.accent, boxShadow: `0 0 22px ${card.accent}` }} />
                <div className="relative flex h-full items-center gap-5 px-5 py-5">
                  <div className={`relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[20px] border transition-all duration-300 ${picked ? 'rotate-[7deg] scale-110' : 'group-active:scale-95'}`} style={{ borderColor: `${card.accent}78`, background: `${card.accent}16`, color: card.accent, boxShadow: `inset 0 0 30px ${card.glow}, 0 0 20px ${card.glow}` }}>
                    <Icon size={38} strokeWidth={1.55} />
                    <div className="absolute -bottom-2 rounded-full border border-black/50 bg-[#090b0c] px-2 py-0.5 text-[7px] font-black tracking-[.2em]" style={{ color: card.accent }}>{card.tier}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-[.24em]" style={{ color: card.accent }}>{rankLabel}</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="text-[20px] font-black tracking-[.05em] text-[#f8f3e9]">{card.label}{card.instant || card.fusion ? '' : ` ${roman(card.rank)}`}</div>
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
