import React, { useMemo } from 'react';
import type { SaveData } from '../game/saveManager';
import type { WorldBossEvent } from '../game/supabaseOnline';
import { localizedWorldBossName, worldBossRotationProfile, worldBossThemeClasses } from '../game/worldBossRotationProfile';
import { WorldBossBattleScreen as WorldBossBattleScreenV4 } from './WorldBossBattleScreenV4';

type Props = {
  event: WorldBossEvent;
  saveData: SaveData | null;
  language: 'de' | 'en';
  onClose: () => void;
  onBossUpdated: (remainingHp: number, defeated: boolean) => void;
};

export function WorldBossRotatingBattleScreen(props: Props) {
  const profile = useMemo(() => worldBossRotationProfile(props.event), [props.event]);
  const name = localizedWorldBossName(props.event, props.language);
  const de = props.language === 'de';

  return <div
    data-testid="worldboss-rotation-battle"
    data-worldboss-key={profile.key}
    data-worldboss-theme={profile.theme}
    data-worldboss-health-multiplier={profile.combat.healthMultiplier}
    data-worldboss-speed={profile.combat.moveSpeed}
    className="fixed inset-0 z-[119]"
  >
    <WorldBossBattleScreenV4 {...props} event={{ ...props.event, name }} />
    <aside className={`pointer-events-none absolute left-3 right-3 top-[max(92px,calc(env(safe-area-inset-top)+86px))] z-[145] mx-auto max-w-md rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-md ${worldBossThemeClasses(profile.theme)}`}>
      <div className="text-[7px] font-black uppercase tracking-[.2em] opacity-55">{profile.title[props.language]}</div>
      <div className="mt-1 text-[9px] font-semibold leading-relaxed opacity-80">{profile.mechanicSummary[props.language]}</div>
      <div className="mt-1.5 text-[7px] font-black uppercase tracking-[.14em] opacity-55">{de ? 'NÄCHSTE ROTATION' : 'NEXT ROTATION'} · {profile.nextName[props.language]}</div>
    </aside>
  </div>;
}
