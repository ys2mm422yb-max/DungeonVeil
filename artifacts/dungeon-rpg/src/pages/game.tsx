import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from '../game/engine';
import { GameCanvas } from '../components/GameCanvas';
import { VirtualJoystick } from '../components/VirtualJoystick';
import { ActionButtons } from '../components/ActionButtons';
import { HUD } from '../components/HUD';
import { StartScreen } from '../components/screens/StartScreen';
import { GameOverScreen } from '../components/screens/GameOverScreen';
import { LevelUpScreen } from '../components/screens/LevelUpScreen';

export default function Game() {
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    // Initialize engine once
    engineRef.current = new GameEngine();
    
    // Subscribe to state changes
    engineRef.current.onStateChange = (state) => {
      setGameState(state);
    };

    // Initial state
    setGameState(engineRef.current.state);

    let animationFrameId: number;

    const gameLoop = (time: number) => {
      if (engineRef.current) {
        engineRef.current.update(time);
        
        // Only force react render if not already triggered by state change events
        // Mostly we rely on the canvas rendering itself from the engineRef state
        // but for HUD we need occasional react updates.
        // For performance, we don't call setGameState every frame. The GameCanvas 
        // reads from the same gameState object reference which mutates.
        // Wait, React needs new object to re-render. Let's just rely on the engine's 
        // explicit onStateChange calls for major state transitions (HP change, level up, etc.)
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
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

  const handleAttack = useCallback(() => {
    if (engineRef.current) engineRef.current.input.attack = true;
  }, []);

  const handleDodge = useCallback(() => {
    if (engineRef.current) engineRef.current.input.dodge = true;
  }, []);

  const handleSkill = useCallback(() => {
    if (engineRef.current) engineRef.current.input.skill = true;
  }, []);

  const handleInteract = useCallback(() => {
    if (engineRef.current) engineRef.current.input.interact = true;
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'playing') {
      engineRef.current.state.status = 'paused';
      setGameState({...engineRef.current.state});
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current && engineRef.current.state.status === 'paused') {
      engineRef.current.state.status = 'playing';
      engineRef.current.lastTime = performance.now(); // prevent time jump
      setGameState({...engineRef.current.state});
    }
  }, []);

  const handleLevelUpSelect = useCallback((choice: string) => {
    if (engineRef.current) engineRef.current.applyUpgrade(choice);
  }, []);

  if (!gameState) return null;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none">
      {/* 
        GameCanvas needs to receive the mutated state reference directly. 
        It has its own requestAnimationFrame loop to render the canvas at 60fps.
      */}
      <GameCanvas gameState={engineRef.current?.state!} />

      {gameState.status === 'start' && <StartScreen onStart={handleStart} />}
      
      {gameState.status === 'gameover' && <GameOverScreen gameState={gameState} onRetry={handleStart} />}
      
      {gameState.status === 'levelup' && (
        <LevelUpScreen choices={gameState.upgradeChoices} onSelect={handleLevelUpSelect} />
      )}

      {gameState.status === 'paused' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h2 className="font-serif text-4xl text-white mb-8 tracking-widest">PAUSED</h2>
          <button 
            onClick={handleResume}
            onTouchStart={(e) => { e.preventDefault(); handleResume(); }}
            className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded text-xl mb-4"
          >
            RESUME
          </button>
          <button 
            onClick={handleStart}
            onTouchStart={(e) => { e.preventDefault(); handleStart(); }}
            className="bg-transparent border border-muted text-muted-foreground font-bold px-8 py-4 rounded text-xl"
          >
            RESTART
          </button>
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
