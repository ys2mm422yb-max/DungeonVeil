import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, GameState } from '../game/runEngine';
import { ClassKey } from '../game/classes';
import { hasSave, loadGame, SaveData } from '../game/saveManager';
import { saveEngineSession } from '../game/sessionStore';
import { UpgradeKey, Language } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';
import { CombatStage } from '../components/CombatStage';
import { VirtualJoystick } from '../components/VirtualJoystick';
import { ActionButtons } from '../components/ActionButtons';
import { HUD } from '../components/HUD';
import { GameSessionBridge } from '../components/GameSessionBridge';
import { GamePausePanel } from '../components/GamePausePanel';
import { GameOverScreen } from '../components/screens/GameOverScreen';
import { LevelUpScreen } from '../components/screens/LevelUpScreen';
import { LanguageSelectScreen } from '../components/screens/LanguageSelectScreen';
import { MainMenuScreen } from '../components/screens/MainMenuScreen';
import { CharacterCreationScreen } from '../components/screens/CharacterCreationScreen';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { CreditsScreen } from '../components/screens/CreditsScreen';
import { VeilChamberScreen } from '../components/screens/VeilChamberScreen';
import { preloadKayKitDungeonRoom } from '../components/kaykitRoom3D';
import { preloadKayKitEnemyVisuals } from '../components/kaykitEnemy3D';
import { preloadKayKitHealingPotion } from '../components/kaykitLoot3D';
import { preloadKayKitOuterWorld } from '../components/kaykitOuterWorld3D';
import { applyMetaLoadoutToNewRun, beginMetaRun } from '../game/metaProgression';

type UiState = 'lang_select' | 'main_menu' | 'char_create' | 'settings' | 'credits' | 'veil_chamber' | 'game';
type MoveVector = { x: number; y: number };
type KeyState = { up: boolean; down: boolean; left: boolean; right: boolean };

function normalizeMove({ x, y }: MoveVector): MoveVector {
  const length = Math.hypot(x, y);
  return length <= 1 ? { x, y } : { x: x / length, y: y / length };
}

export default function Game() {
  const { t, language, setLanguage, hasChosen } = useLanguage();
  const engineRef = useRef<GameEngine | null>(null);
  const touchMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyStateRef = useRef<KeyState>({ up: false, down: false, left: false, right: false });
  const settingsReturnRef = useRef<UiState>('main_menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [uiState, setUiState] = useState<UiState>(() => !hasChosen ? 'lang_select' : 'main_menu');

  const saveCurrentGame = useCallback((): boolean => {
    const engine = engineRef.current;
    if (!engine || engine.state.player.playerName === 'Hero') return false;
    const saved = saveEngineSession(engine);
    if (saved) setSaveData(loadGame());
    return saved;
  }, []);

  const applyMovementInput = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const move = normalizeMove({ x: touchMoveRef.current.x + keyMoveRef.current.x, y: touchMoveRef.current.y + keyMoveRef.current.y });
    engine.input.joyX = move.x;
    engine.input.joyY = move.y;
  }, []);

  const resetMovement = useCallback(() => {
    touchMoveRef.current = { x: 0, y: 0 };
    keyMoveRef.current = { x: 0, y: 0 };
    keyStateRef.current = { up: false, down: false, left: false, right: false };
    window.dispatchEvent(new Event('dungeon-veil-reset-input'));
    applyMovementInput();
  }, [applyMovementInput]);

  const refreshKeyboardMove = useCallback(() => {
    const keys = keyStateRef.current;
    keyMoveRef.current = normalizeMove({ x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0), y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0) });
    applyMovementInput();
  }, [applyMovementInput]);

  useEffect(() => { if (hasChosen && uiState === 'lang_select') setUiState('main_menu'); }, [hasChosen, uiState]);
  useEffect(() => { if (uiState === 'main_menu') setSaveData(hasSave() ? loadGame() : null); }, [uiState]);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    engine.onStateChange = state => {
      const live = engine.state;
      setGameState({
        ...state,
        player: live.player,
        enemies: live.enemies,
        items: live.items,
        damageNumbers: live.damageNumbers,
        particles: live.particles,
        effects: live.effects,
        camera: live.camera,
      });
    };
    setGameState(engine.state);
    let animationId = 0;
    const loop = (time: number) => { engine.update(time); animationId = requestAnimationFrame(loop); };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const goSettings = useCallback((returnTo: UiState) => { settingsReturnRef.current = returnTo; setUiState('settings'); }, []);
  const handleNewGame = useCallback(() => setUiState('char_create'), []);
  const handleContinue = useCallback(() => {
    const save = loadGame();
    if (!save) return;
    engineRef.current?.continueGame(save);
    setUiState('game');
  }, []);
  const handleCharConfirm = useCallback(async (name: string, _cls: ClassKey) => {
    await Promise.all([preloadKayKitDungeonRoom(1), preloadKayKitEnemyVisuals(), preloadKayKitHealingPotion(), preloadKayKitOuterWorld()]);
    const engine = engineRef.current;
    if (!engine) return;
    beginMetaRun();
    engine.startNewGame(name, 'archer');
    applyMetaLoadoutToNewRun(engine);
    setSaveData(loadGame());
    setGameState({ ...engine.state });
    setUiState('game');
  }, []);
  const handleRetry = useCallback(() => setUiState('char_create'), []);
  const handleMainMenu = useCallback(() => { saveCurrentGame(); resetMovement(); setUiState('main_menu'); }, [resetMovement, saveCurrentGame]);
  const handleSettingsBack = useCallback(() => {
    const returnTo = settingsReturnRef.current;
    if (returnTo === 'game' && engineRef.current) { engineRef.current.state.status = 'paused'; setGameState({ ...engineRef.current.state }); }
    setUiState(returnTo);
  }, []);
  const handleSaveDeleted = useCallback(() => setSaveData(null), []);
  const handleJoystickMove = useCallback((x: number, y: number) => { touchMoveRef.current = { x, y }; applyMovementInput(); }, [applyMovementInput]);
  const handleAttack = useCallback(() => { if (engineRef.current) engineRef.current.input.attack = true; }, []);
  const handleDodge = useCallback(() => { if (engineRef.current) engineRef.current.input.dodge = true; }, []);

  const handlePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.state.status !== 'playing') return;
    resetMovement();
    saveCurrentGame();
    engine.state.status = 'paused';
    setGameState({ ...engine.state });
  }, [resetMovement, saveCurrentGame]);

  const handleResume = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.state.status !== 'paused') return;
    engine.state.status = 'playing';
    engine.lastTime = performance.now();
    setGameState({ ...engine.state });
  }, []);

  const handleRestartRoom = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.state.status !== 'paused') return;
    resetMovement();
    engine.restartCurrentRoom();
    setGameState({ ...engine.state });
  }, [resetMovement]);

  const handleLevelUpSelect = useCallback((choice: UpgradeKey) => {
    const engine = engineRef.current;
    if (!engine || engine.state.status !== 'levelup') return;
    engine.applyUpgrade(choice);
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
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (setMoveKey(event.code, true)) { event.preventDefault(); return; }
      if (event.code === 'Space' || event.code === 'KeyJ') handleAttack();
      else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyK') handleDodge();
      else if (event.code === 'Escape') engineRef.current?.state.status === 'paused' ? handleResume() : handlePause();
    };
    const keyUp = (event: KeyboardEvent) => { if (setMoveKey(event.code, false)) event.preventDefault(); };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', resetMovement);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', resetMovement);
      resetMovement();
    };
  }, [uiState, refreshKeyboardMove, handleAttack, handleDodge, handlePause, handleResume, resetMovement]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden touch-none select-none overscroll-none">
      <GameSessionBridge getEngine={() => engineRef.current} active={uiState === 'game'} />
      {uiState === 'lang_select' && <LanguageSelectScreen />}
      {uiState === 'main_menu' && <MainMenuScreen saveData={saveData} onNewGame={handleNewGame} onContinue={handleContinue} onVeilChamber={() => setUiState('veil_chamber')} onSettings={() => goSettings('main_menu')} onCredits={() => setUiState('credits')} />}
      {uiState === 'char_create' && <CharacterCreationScreen onConfirm={handleCharConfirm} onBack={handleMainMenu} />}
      {uiState === 'settings' && <SettingsScreen onBack={handleSettingsBack} onSaveDeleted={handleSaveDeleted} />}
      {uiState === 'credits' && <CreditsScreen onBack={handleMainMenu} />}
      {uiState === 'veil_chamber' && <VeilChamberScreen onBack={() => setUiState('main_menu')} />}
      {uiState === 'game' && gameState && <>
        <CombatStage gameState={gameState} />
        {gameState.status === 'gameover' && <GameOverScreen gameState={gameState} onRetry={handleRetry} onMainMenu={handleMainMenu} />}
        {gameState.status === 'levelup' && <LevelUpScreen choices={gameState.upgradeChoices} runSkills={gameState.runSkills} onSelect={handleLevelUpSelect} />}
        {gameState.status === 'paused' && <GamePausePanel gameState={gameState} language={language as Language} paused={t.paused} resume={t.resume} settings={t.settings} classNameText={t.className.archer} onResume={handleResume} onSettings={() => goSettings('game')} onMainMenu={handleMainMenu} onLanguage={setLanguage} onRestartRoom={handleRestartRoom} />}
        {(gameState.status === 'playing' || gameState.status === 'paused') && <>
          <HUD gameState={gameState} onPause={handlePause} />
          <VirtualJoystick onMove={handleJoystickMove} />
          <ActionButtons gameState={gameState} onDodge={handleDodge} />
        </>}
      </>}
    </div>
  );
}
