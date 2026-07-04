import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from '../game/engine';
import { UpgradeKey } from '../i18n/translations';
import { GameCanvas } from '../components/GameCanvas';
import { VirtualJoystick } from '../components/VirtualJoystick';
import { ActionButtons } from '../components/ActionButtons';
import { HUD } from '../components/HUD';
import { StartScreen } from '../components/screens/StartScreen';
import { GameOverScreen } from '../components/screens/GameOverScreen';
import { LevelUpScreen } from '../components/screens/LevelUpScreen';
import { LanguageSelectScreen } from '../components/screens/LanguageSelectScreen';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

export default function Game() {
  const { t, language, setLanguage, hasChosen } = useLanguage();
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    engineRef.current = new GameEngine();
    engineRef.current.onStateChange = (state) => {
      setGameState(state);
    };
    setGameState(engineRef.current.state);

    let animationFrameId: number;
    const gameLoop = (time: number) => {
      if (engineRef.current) {
        engineRef.current.update(time);
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => { cancelAnimationFrame(animationFrameId); };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.input.joyX = x;
      engineRef.current.input.joyY = y;
    }
  }, []);

  const handleAttack   = useCallback(() => { if (engineRef.current) engineRef.current.input.attack = true; }, []);
  const handleDodge    = useCallback(() => { if (engineRef.current) engineRef.current.input.dodge = true; }, []);
  const handleSkill    = useCallback(() => { if (engineRef.current) engineRef.current.input.skill = true; }, []);
  const handleInteract = useCallback(() => { if (engineRef.current) engineRef.current.input.interact = true; }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'playing') {
      engineRef.current.state.status = 'paused';
      setGameState({...engineRef.current.state});
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'paused') {
      engineRef.current.state.status = 'playing';
      engineRef.current.lastTime = performance.now();
      setGameState({...engineRef.current.state});
    }
  }, []);

  const handleLevelUpSelect = useCallback((choice: UpgradeKey) => {
    if (engineRef.current) engineRef.current.applyUpgrade(choice);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'de' : 'en');
  }, [language, setLanguage]);

  // Show language picker on very first launch (no stored preference)
  if (!hasChosen) {
    return <LanguageSelectScreen />;
  }

  if (!gameState) return null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none">
      <GameCanvas gameState={engineRef.current?.state!} />

      {gameState.status === 'start' && <StartScreen onStart={handleStart} />}

      {gameState.status === 'gameover' && (
        <GameOverScreen gameState={gameState} onRetry={handleStart} />
      )}

      {gameState.status === 'levelup' && (
        <LevelUpScreen choices={gameState.upgradeChoices} onSelect={handleLevelUpSelect} />
      )}

      {gameState.status === 'paused' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h2 className="font-serif text-4xl text-white mb-8 tracking-widest">{t.paused}</h2>

          <button
            onClick={handleResume}
            onTouchStart={(e) => { e.preventDefault(); handleResume(); }}
            className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded text-xl mb-4 tracking-widest"
            data-testid="button-resume"
          >
            {t.resume}
          </button>

          <button
            onClick={handleStart}
            onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
            className="bg-transparent border border-muted text-muted-foreground font-bold px-8 py-4 rounded text-xl mb-8 tracking-widest"
            data-testid="button-restart"
          >
            {t.restart}
          </button>

          {/* Language toggle */}
          <div className="flex items-center gap-4 mt-4 bg-card/60 border border-primary/20 rounded-xl px-6 py-4">
            <span className="text-muted-foreground text-sm tracking-widest uppercase">{t.language}</span>
            <div className="flex gap-2">
              {(['en', 'de'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  onTouchStart={(e) => { e.preventDefault(); setLanguage(lang); }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm tracking-widest transition-all border-2 ${
                    language === lang
                      ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(232,160,32,0.4)]'
                      : 'bg-transparent text-muted-foreground border-muted/40 active:scale-95'
                  }`}
                  data-testid={`button-lang-${lang}`}
                >
                  {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
