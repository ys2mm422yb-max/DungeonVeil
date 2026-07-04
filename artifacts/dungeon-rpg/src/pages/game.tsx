import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from '../game/engine';
import { UpgradeKey } from '../i18n/translations';
import { ClassKey } from '../game/classes';
import { loadGame, hasSave, SaveData } from '../game/saveManager';
import { GameCanvas } from '../components/GameCanvas';
import { VirtualJoystick } from '../components/VirtualJoystick';
import { ActionButtons } from '../components/ActionButtons';
import { HUD } from '../components/HUD';
import { GameOverScreen } from '../components/screens/GameOverScreen';
import { LevelUpScreen } from '../components/screens/LevelUpScreen';
import { LanguageSelectScreen } from '../components/screens/LanguageSelectScreen';
import { MainMenuScreen } from '../components/screens/MainMenuScreen';
import { CharacterCreationScreen } from '../components/screens/CharacterCreationScreen';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { CreditsScreen } from '../components/screens/CreditsScreen';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

type UiState = 'lang_select' | 'main_menu' | 'char_create' | 'settings' | 'credits' | 'game';

export default function Game() {
  const { t, language, setLanguage, hasChosen } = useLanguage();
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const settingsReturnRef = useRef<UiState>('main_menu');

  const [uiState, setUiState] = useState<UiState>(() =>
    !hasChosen ? 'lang_select' : 'main_menu'
  );

  // Transition to main_menu once language is chosen
  useEffect(() => {
    if (hasChosen && uiState === 'lang_select') {
      setUiState('main_menu');
    }
  }, [hasChosen]);

  // Refresh save data whenever returning to main menu
  useEffect(() => {
    if (uiState === 'main_menu') {
      setSaveData(hasSave() ? loadGame() : null);
    }
  }, [uiState]);

  // Create engine once
  useEffect(() => {
    engineRef.current = new GameEngine();
    engineRef.current.onStateChange = (state) => setGameState({ ...state });
    setGameState(engineRef.current.state);

    let animId: number;
    const loop = (time: number) => {
      engineRef.current?.update(time);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ─── Navigation helpers ───────────────────────────────────────────────────

  const goSettings = useCallback((returnTo: UiState) => {
    settingsReturnRef.current = returnTo;
    setUiState('settings');
  }, []);

  const handleNewGame = useCallback(() => setUiState('char_create'), []);

  const handleContinue = useCallback(() => {
    const save = loadGame();
    if (!save) return;
    engineRef.current?.continueGame(save);
    setUiState('game');
  }, []);

  const handleCharConfirm = useCallback((name: string, cls: ClassKey) => {
    engineRef.current?.startNewGame(name, cls);
    setUiState('game');
  }, []);

  const handleRetry = useCallback(() => {
    setUiState('char_create');
  }, []);

  const handleMainMenu = useCallback(() => {
    setUiState('main_menu');
  }, []);

  const handleSettingsBack = useCallback(() => {
    const returnTo = settingsReturnRef.current;
    if (returnTo === 'game' && engineRef.current) {
      engineRef.current.state.status = 'paused';
      setGameState({ ...engineRef.current.state });
    }
    setUiState(returnTo);
  }, []);

  const handleSaveDeleted = useCallback(() => {
    setSaveData(null);
  }, []);

  // ─── In-game controls ─────────────────────────────────────────────────────

  const handleJoystickMove = useCallback((x: number, y: number) => {
    if (engineRef.current) { engineRef.current.input.joyX = x; engineRef.current.input.joyY = y; }
  }, []);

  const handleAttack   = useCallback(() => { if (engineRef.current) engineRef.current.input.attack = true; }, []);
  const handleDodge    = useCallback(() => { if (engineRef.current) engineRef.current.input.dodge  = true; }, []);
  const handleSkill    = useCallback(() => { if (engineRef.current) engineRef.current.input.skill  = true; }, []);
  const handleInteract = useCallback(() => { if (engineRef.current) engineRef.current.input.interact = true; }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'playing') {
      engineRef.current.state.status = 'paused';
      setGameState({ ...engineRef.current.state });
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'paused') {
      engineRef.current.state.status = 'playing';
      engineRef.current.lastTime = performance.now();
      setGameState({ ...engineRef.current.state });
    }
  }, []);

  const handleLevelUpSelect = useCallback((choice: UpgradeKey) => {
    engineRef.current?.applyUpgrade(choice);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none">

      {/* ── Language picker (first launch) ── */}
      {uiState === 'lang_select' && <LanguageSelectScreen />}

      {/* ── Main Menu ── */}
      {uiState === 'main_menu' && (
        <MainMenuScreen
          saveData={saveData}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onSettings={() => goSettings('main_menu')}
          onCredits={() => setUiState('credits')}
        />
      )}

      {/* ── Character Creation ── */}
      {uiState === 'char_create' && (
        <CharacterCreationScreen
          onConfirm={handleCharConfirm}
          onBack={handleMainMenu}
        />
      )}

      {/* ── Settings ── */}
      {uiState === 'settings' && (
        <SettingsScreen
          onBack={handleSettingsBack}
          onSaveDeleted={handleSaveDeleted}
        />
      )}

      {/* ── Credits ── */}
      {uiState === 'credits' && (
        <CreditsScreen onBack={handleMainMenu} />
      )}

      {/* ── Active Game ── */}
      {uiState === 'game' && gameState && (
        <>
          <GameCanvas gameState={gameState} />

          {/* Game Over */}
          {gameState.status === 'gameover' && (
            <GameOverScreen
              gameState={gameState}
              onRetry={handleRetry}
              onMainMenu={handleMainMenu}
            />
          )}

          {/* Level Up */}
          {gameState.status === 'levelup' && (
            <LevelUpScreen
              choices={gameState.upgradeChoices}
              onSelect={handleLevelUpSelect}
            />
          )}

          {/* Pause overlay */}
          {gameState.status === 'paused' && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <h2 className="font-serif text-4xl text-white mb-2 tracking-widest">{t.paused}</h2>
              <p className="text-white/30 text-xs tracking-widest font-mono mb-10">
                {gameState.player.playerName} · {t.className[gameState.player.playerClass]}
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs px-6">
                <button
                  onClick={handleResume}
                  onTouchStart={e => { e.preventDefault(); handleResume(); }}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl tracking-widest text-sm active:scale-95 transition-all border-2 border-primary shadow-[0_0_16px_rgba(232,160,32,0.2)]"
                  data-testid="button-resume"
                >
                  {t.resume}
                </button>

                <button
                  onClick={() => goSettings('game')}
                  onTouchStart={e => { e.preventDefault(); goSettings('game'); }}
                  className="w-full bg-white/5 text-white/60 font-bold py-3 rounded-xl tracking-widest text-sm active:scale-95 transition-all border border-white/10"
                  data-testid="button-settings"
                >
                  {t.settings}
                </button>

                <button
                  onClick={handleMainMenu}
                  onTouchStart={e => { e.preventDefault(); handleMainMenu(); }}
                  className="w-full bg-transparent text-white/30 font-bold py-3 rounded-xl tracking-widest text-xs active:scale-95 transition-all border border-white/8"
                  data-testid="button-main-menu"
                >
                  {t.restart}
                </button>
              </div>

              {/* Inline language toggle */}
              <div className="mt-8 flex items-center gap-3">
                {(['en', 'de'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    onTouchStart={e => { e.preventDefault(); setLanguage(lang); }}
                    className={[
                      'px-4 py-2 rounded-lg text-xs font-bold tracking-widest border-2 transition-all active:scale-95',
                      language === lang
                        ? 'bg-primary/15 border-primary text-primary'
                        : 'bg-transparent border-white/10 text-white/30',
                    ].join(' ')}
                  >
                    {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HUD + controls (visible while playing or paused) */}
          {(gameState.status === 'playing' || gameState.status === 'paused') && (
            <>
              <HUD gameState={gameState} onPause={handlePause} />
              <VirtualJoystick onMove={handleJoystickMove} />
              <ActionButtons
                gameState={gameState}
                onAttack={handleAttack}
                onDodge={handleDodge}
                onSkill={handleSkill}
                onInteract={handleInteract}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
