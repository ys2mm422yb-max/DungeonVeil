import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, GameState } from '../game/runEngine';
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
import { RunNamePromptScreen } from '../components/screens/RunNamePromptScreen';
import { SettingsScreen } from '../components/screens/SettingsScreen';
import { CreditsScreen } from '../components/screens/CreditsScreen';
import { VeilChamberScreen } from '../components/screens/VeilChamberScreen';
import { CodexScreen } from '../components/screens/CodexScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { preloadKayKitDungeonRoom } from '../components/kaykitRoom3D';
import { preloadKayKitRoomTheme } from '../components/kaykitRoomThemes3D';
import { preloadKayKitEnemyVisuals } from '../components/kaykitEnemy3D';
import { preloadKayKitHealingPotion } from '../components/kaykitLoot3D';
import { preloadKayKitOuterWorld } from '../components/kaykitOuterWorld3D';
import { applyMetaLoadoutToNewRun, beginMetaRun } from '../game/metaProgression';
import { beginPlayerProfileRun } from '../game/playerProfile';
import { rememberRunName, resolvePreferredRunName, sanitizeRunName } from '../game/runIdentity';

const ACTIVE_RUN_SESSION_KEY = 'dungeon-veil-active-run-session';

type UiState = 'lang_select' | 'main_menu' | 'run_name' | 'settings' | 'credits' | 'veil_chamber' | 'codex' | 'game';
type MoveVector = { x: number; y: number };
type KeyState = { up: boolean; down: boolean; left: boolean; right: boolean };

function normalizeMove({ x, y }: MoveVector): MoveVector {
  const length = Math.hypot(x, y);
  return length <= 1 ? { x, y } : { x: x / length, y: y / length };
}

function hasActiveRunSession(): boolean {
  try { return sessionStorage.getItem(ACTIVE_RUN_SESSION_KEY) === '1' && hasSave(); } catch { return false; }
}

function markActiveRun(active: boolean): void {
  try {
    if (active) sessionStorage.setItem(ACTIVE_RUN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ACTIVE_RUN_SESSION_KEY);
  } catch {}
}

export default function Game() {
  const { t, language, setLanguage, hasChosen } = useLanguage();
  const engineRef = useRef<GameEngine | null>(null);
  const touchMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyMoveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const keyStateRef = useRef<KeyState>({ up: false, down: false, left: false, right: false });
  const settingsReturnRef = useRef<UiState>('main_menu');
  const resumeSessionOnBootRef = useRef(hasActiveRunSession());
  const roomVisualReadyRef = useRef(true);
  const [roomPreparing, setRoomPreparing] = useState(false);
  const [startingRun, setStartingRun] = useState(false);
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

    const sessionSave = resumeSessionOnBootRef.current ? loadGame() : null;
    if (sessionSave && hasChosen) {
      engine.continueGame(sessionSave);
      setSaveData(sessionSave);
      setGameState({ ...engine.state });
      setUiState('game');
      markActiveRun(true);
    } else {
      setGameState(engine.state);
    }

    let animationId = 0;
    const loop = (time: number) => {
      if (roomVisualReadyRef.current) engine.update(time);
      else engine.lastTime = time;
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [hasChosen]);

  useEffect(() => {
    const handleRendererLost = () => {
      markActiveRun(true);
      roomVisualReadyRef.current = false;
      setRoomPreparing(true);
      resetMovement();
      saveCurrentGame();
    };
    window.addEventListener('dungeon-veil-renderer-lost', handleRendererLost);
    return () => window.removeEventListener('dungeon-veil-renderer-lost', handleRendererLost);
  }, [resetMovement, saveCurrentGame]);

  useEffect(() => {
    const handleRoomPreparing = () => {
      roomVisualReadyRef.current = false;
      setRoomPreparing(true);
      resetMovement();
    };
    const handleRoomReady = () => {
      roomVisualReadyRef.current = true;
      setRoomPreparing(false);
      if (engineRef.current) engineRef.current.lastTime = performance.now();
    };
    window.addEventListener('dungeon-veil-room-preparing', handleRoomPreparing);
    window.addEventListener('dungeon-veil-room-ready', handleRoomReady);
    return () => {
      window.removeEventListener('dungeon-veil-room-preparing', handleRoomPreparing);
      window.removeEventListener('dungeon-veil-room-ready', handleRoomReady);
    };
  }, [resetMovement]);

  const goSettings = useCallback((returnTo: UiState) => { settingsReturnRef.current = returnTo; setUiState('settings'); }, []);

  const beginFreshRun = useCallback(async (requestedName: string) => {
    const name = rememberRunName(sanitizeRunName(requestedName));
    const engine = engineRef.current;
    if (!engine || name.length < 2) return;
    setStartingRun(true);
    try {
      await Promise.allSettled([
        preloadKayKitDungeonRoom(1),
        preloadKayKitRoomTheme(1),
        preloadKayKitEnemyVisuals(),
        preloadKayKitHealingPotion(),
        preloadKayKitOuterWorld(),
      ]);
      beginMetaRun();
      engine.startNewGame(name, 'archer');
      beginPlayerProfileRun(engine.state.chapter, engine.state.floor);
      applyMetaLoadoutToNewRun(engine);
      setSaveData(loadGame());
      setGameState({ ...engine.state });
      markActiveRun(true);
      setUiState('game');
    } finally {
      setStartingRun(false);
    }
  }, []);

  const handleNewGame = useCallback(async () => {
    if (saveData) {
      const confirmed = window.confirm(language === 'de'
        ? 'Einen neuen Run starten? Der aktuelle Run wird ersetzt, dauerhafte Fortschritte bleiben erhalten.'
        : 'Start a new run? The current run will be replaced, while permanent progress remains.');
      if (!confirmed) return;
    }
    markActiveRun(false);
    const name = await resolvePreferredRunName(saveData);
    if (!name) {
      setUiState('run_name');
      return;
    }
    await beginFreshRun(name);
  }, [beginFreshRun, language, saveData]);

  const handleContinue = useCallback(() => {
    const save = loadGame();
    if (!save) return;
    engineRef.current?.continueGame(save);
    markActiveRun(true);
    setUiState('game');
  }, []);

  const handleRetry = useCallback(() => {
    const name = sanitizeRunName(engineRef.current?.state.player.playerName || saveData?.playerName) || (language === 'de' ? 'Waldläufer' : 'Ranger');
    markActiveRun(false);
    void beginFreshRun(name);
  }, [beginFreshRun, language, saveData?.playerName]);

  const handleMainMenu = useCallback(() => {
    saveCurrentGame();
    resetMovement();
    markActiveRun(false);
    setUiState('main_menu');
  }, [resetMovement, saveCurrentGame]);

  const handleSettingsBack = useCallback(() => {
    const returnTo = settingsReturnRef.current;
    if (returnTo === 'game' && engineRef.current) { engineRef.current.state.status = 'paused'; setGameState({ ...engineRef.current.state }); }
    setUiState(returnTo);
  }, []);
  const handleSaveDeleted = useCallback(() => { markActiveRun(false); setSaveData(null); }, []);
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
      {uiState === 'main_menu' && <MainMenuScreen saveData={saveData} onNewGame={() => void handleNewGame()} onContinue={handleContinue} onVeilChamber={() => setUiState('veil_chamber')} onCodex={() => setUiState('codex')} onSettings={() => goSettings('main_menu')} onCredits={() => setUiState('credits')} />}
      {uiState === 'run_name' && <RunNamePromptScreen onConfirm={beginFreshRun} onBack={() => setUiState('main_menu')} />}
      {uiState === 'settings' && <SettingsScreen onBack={handleSettingsBack} onSaveDeleted={handleSaveDeleted} />}
      {uiState === 'credits' && <CreditsScreen onBack={handleMainMenu} />}
      {uiState === 'veil_chamber' && <VeilChamberScreen onBack={() => setUiState('main_menu')} />}
      {uiState === 'codex' && <CodexScreen onBack={() => setUiState('main_menu')} />}
      {uiState === 'game' && gameState && <>
        <CombatStage gameState={gameState} />
        {roomPreparing && <div className="pointer-events-none absolute left-1/2 top-[31%] z-40 -translate-x-1/2 rounded-full border border-violet-300/25 bg-black/72 px-4 py-2 text-[9px] font-black tracking-[.28em] text-violet-100/80 backdrop-blur-md">RAUM WIRD AUFGEBAUT…</div>}
        {gameState.status === 'gameover' && <GameOverScreen gameState={gameState} onRetry={handleRetry} onMainMenu={handleMainMenu} />}
        {gameState.status === 'levelup' && <LevelUpScreen choices={gameState.upgradeChoices} runSkills={gameState.runSkills} onSelect={handleLevelUpSelect} />}
        {gameState.status === 'paused' && <GamePausePanel gameState={gameState} language={language as Language} paused={t.paused} resume={t.resume} settings={t.settings} classNameText={t.className.archer} onResume={handleResume} onSettings={() => goSettings('game')} onMainMenu={handleMainMenu} onLanguage={setLanguage} onRestartRoom={handleRestartRoom} />}
        {(gameState.status === 'playing' || gameState.status === 'paused') && <>
          <HUD gameState={gameState} onPause={handlePause} />
          <VirtualJoystick onMove={handleJoystickMove} />
          <ActionButtons gameState={gameState} onDodge={handleDodge} />
        </>}
      </>}
      {startingRun && <LoadingScreen variant="run" language={language} testId="new-run-loading-screen" title={language === 'de' ? 'DEIN RUN WIRD VORBEREITET' : 'PREPARING YOUR RUN'} subtitle={language === 'de' ? 'Bewegen = ausweichen · stehen = automatisch schießen.' : 'Move to dodge · stop to shoot automatically.'} />}
    </div>
  );
}
