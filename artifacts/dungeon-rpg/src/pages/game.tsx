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
type MoveVector = { x: number; y: number };

type KeyState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

function normalizeMove({ x, y }: MoveVector): MoveVector {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y };
  return { x: x / length, y: y / length };
}

export default function Game() {
  const { t, language, setLanguage, hasChosen } = useLanguage();
  const engineRef = useRef<GameEngine | null>(null);
  const touchMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyStateRef = useRef<KeyState>({ up: false, down: false, left: false, right: false });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const settingsReturnRef = useRef<UiState>('main_menu');

  const [uiState, setUiState] = useState<UiState>(() =>
    !hasChosen ? 'lang_select' : 'main_menu'
  );

  const applyMovementInput = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const move = normalizeMove({
      x: touchMoveRef.current.x + keyMoveRef.current.x,
      y: touchMoveRef.current.y + keyMoveRef.current.y,
    });

    engine.input.joyX = move.x;
    engine.input.joyY = move.y;
  }, []);

  const refreshKeyboardMove = useCallback(() => {
    const keys = keyStateRef.current;
    keyMoveRef.current = normalizeMove({
      x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
    });
    applyMovementInput();
  }, [applyMovementInput]);

  // Transition to main_menu once language is chosen
  useEffect(() => {
    if (hasChosen && uiState === 'lang_select') {
      setUiState('main_menu');
    }
  }, [hasChosen, uiState]);

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
    touchMoveRef.current = { x: 0, y: 0 };
    keyMoveRef.current = { x: 0, y: 0 };
    keyStateRef.current = { up: false, down: false, left: false, right: false };
    applyMovementInput();
    setUiState('main_menu');
  }, [applyMovementInput]);

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
    touchMoveRef.current = { x, y };
    applyMovementInput();
  }, [applyMovementInput]);

  const handleAttack   = useCallback(() => { if (engineRef.current) engineRef.current.input.attack = true; }, []);
  const handleDodge    = useCallback(() => { if (engineRef.current) engineRef.current.input.dodge  = true; }, []);
  const handleSkill    = useCallback(() => { if (engineRef.current) engineRef.current.input.skill  = true; }, []);
  const handleInteract = useCallback(() => { if (engineRef.current) engineRef.current.input.interact = true; }, []);

  const handleExitDungeon = useCallback(() => {
    engineRef.current?.exitDungeon();
  }, []);

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

  useEffect(() => {
    if (uiState !== 'game') return;

    const setMoveKey = (code: string, pressed: boolean): boolean => {
      const keys = keyStateRef.current;
      if (code === 'KeyW' || code === 'ArrowUp') keys.up = pressed;
      else if (code === 'KeyS' || code === 'ArrowDown') keys.down = pressed;
      else if (code === 'KeyA' || code === 'ArrowLeft') keys.left = pressed;
      else if (code === 'KeyD' || code === 'ArrowRight') keys.right = pressed;
      else return false;
      refreshKeyboardMove();
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (setMoveKey(e.code, true)) {
        e.preventDefault();
        return;
      }

      if (e.code === 'Space' || e.code === 'KeyJ') {
        e.preventDefault();
        handleAttack();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
        e.preventDefault();
        handleDodge();
      } else if (e.code === 'KeyE' || e.code === 'KeyL') {
        e.preventDefault();
        handleSkill();
      } else if (e.code === 'KeyF' || e.code === 'Enter') {
        e.preventDefault();
        handleInteract();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (engineRef.current?.state.status === 'paused') handleResume();
        else handlePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (setMoveKey(e.code, false)) e.preventDefault();
    };

    const clearKeys = () => {
      keyStateRef.current = { up: false, down: false, left: false, right: false };
      refreshKeyboardMove();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      clearKeys();
    };
  }, [uiState, refreshKeyboardMove, handleAttack, handleDodge, handleSkill, handleInteract, handlePause, handleResume]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none overscroll-none">

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
              <HUD gameState={gameState} onPause={handlePause} onExitDungeon={handleExitDungeon} />
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
