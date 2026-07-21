import React, { useEffect, useMemo, useState } from 'react';
import { LanguageProvider } from '../i18n/LanguageContext';
import type { GameState } from '../game/runEngine';
import { GamePausePanel } from './GamePausePanel';
import { UnlockPresentationLayer } from './UnlockPresentationLayer';
import { NewRunConfirmDialog } from './NewRunConfirmDialog';
import { GameOverScreen } from './screens/GameOverScreen';
import { LevelUpScreen } from './screens/LevelUpScreen';

type QaView = 'pause' | 'levelup' | 'gameover' | 'new-run' | 'unlock';

function currentView(): QaView {
  const value = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('state') : null;
  return value === 'levelup' || value === 'gameover' || value === 'new-run' || value === 'unlock' ? value : 'pause';
}

function qaGameState(): GameState {
  return {
    status: 'paused',
    floor: 24,
    chapter: 3,
    killCount: 87,
    runSkills: { multishot: 3, fireArrow: 2, ricochet: 1, attackSpeed: 2 },
    upgradeChoices: ['elementalStorm', 'maxHp', 'attackSpeed'],
    player: {
      playerName: 'Maxi',
      playerClass: 'archer',
      level: 14,
      hp: 118,
      maxHp: 160,
      xp: 460,
      xpToNext: 700,
      attack: 42,
      defense: 19,
      speed: 240,
      attackRange: 340,
      skillRange: 420,
    },
    enemies: [],
    items: [],
    damageNumbers: [],
    particles: [],
    effects: [],
    camera: { x: 0, y: 0 },
  } as unknown as GameState;
}

function QaBackdrop() {
  return <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_34%,rgba(93,52,139,.32),transparent_30%),linear-gradient(180deg,#17101f,#09080c_58%,#030304)] text-white">
    <div className="absolute inset-x-4 top-[max(14px,env(safe-area-inset-top))] rounded-2xl border border-white/10 bg-black/48 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.15em] text-white/55"><span>Kapitel 3 · Raum 24</span><span>87 Gegner</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/70"><div className="h-full w-[74%] bg-gradient-to-r from-red-700 to-red-300" /></div>
    </div>
    <div className="absolute left-1/2 top-[48%] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/16 bg-violet-500/[.07] shadow-[0_0_100px_rgba(139,92,246,.2)]" />
    <div className="absolute bottom-[max(36px,env(safe-area-inset-bottom))] left-5 h-24 w-24 rounded-full border border-white/10 bg-black/28" />
    <div className="absolute bottom-[max(42px,env(safe-area-inset-bottom))] right-6 h-20 w-20 rounded-full border border-cyan-200/12 bg-cyan-400/[.06]" />
  </div>;
}

function seedUnlockState() {
  const starter = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
  localStorage.setItem('dungeon-veil-language', 'de');
  localStorage.setItem('dungeon-veil-meta', JSON.stringify({
    version: 4,
    rank: 14,
    xp: 0,
    dust: 2542,
    gold: 15914,
    owned: {
      'ash-bow': { level: 3, copies: 2 },
      'ranger-quiver': { level: 2, copies: 1 },
      'ranger-cloak': { level: 2, copies: 1 },
      'ember-bow': { level: 1, copies: 0 },
    },
    equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
    rewardLedger: [],
    currentRunId: '',
  }));
  localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
    version: 2,
    owned: [],
    equipped: null,
    consumedHeartRuns: [],
    activatedWorldCoreRuns: [],
    relicMisses: { hunt: 0, boss: 0 },
    crownRunStacks: {},
  }));
  localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
    version: 2,
    initialized: true,
    equipment: starter,
    relics: [],
    announcedEquipment: starter,
    announcedRelics: [],
  }));
  document.documentElement.dataset.dungeonVeilBootReady = '1';
}

export function TransientUiVisualQa() {
  const view = useMemo(currentView, []);
  const gameState = useMemo(qaGameState, []);
  const [unlockReady, setUnlockReady] = useState(view !== 'unlock');

  useEffect(() => {
    if (view !== 'unlock') return;
    seedUnlockState();
    setUnlockReady(true);
  }, [view]);

  return <LanguageProvider>
    <div data-testid="transient-ui-visual-qa" data-qa-state={view} className="fixed inset-0 overflow-hidden">
      <QaBackdrop />
      {view === 'pause' && <GamePausePanel
        gameState={gameState}
        language="de"
        paused="PAUSE"
        resume="FORTSETZEN"
        settings="EINSTELLUNGEN"
        classNameText="WALDLÄUFER"
        onResume={() => {}}
        onSettings={() => {}}
        onMainMenu={() => {}}
        onLanguage={() => {}}
        onRestartRoom={() => {}}
      />}
      {view === 'levelup' && <LevelUpScreen choices={['elementalStorm', 'maxHp', 'attackSpeed']} runSkills={gameState.runSkills} onSelect={() => {}} />}
      {view === 'gameover' && <GameOverScreen gameState={{ ...gameState, status: 'gameover' } as any} onRetry={() => {}} onMainMenu={() => {}} />}
      {view === 'new-run' && <NewRunConfirmDialog language="de" chapter={3} room={24} onCancel={() => {}} onConfirm={() => {}} />}
      {view === 'unlock' && unlockReady && <UnlockPresentationLayer />}
    </div>
  </LanguageProvider>;
}
