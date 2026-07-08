export type RangerRig = {
  root: any;
  update: (delta: number) => void;
  setMoving: (moving: boolean) => void;
  triggerAttack: () => boolean;
  stop: () => void;
};

function clipName(clip: any) {
  return String(clip?.name || '').toLowerCase();
}

function findClip(clips: any[], exactName: string, fallback: (name: string) => boolean) {
  return clips.find(clip => clipName(clip) === exactName.toLowerCase())
    ?? clips.find(clip => fallback(clipName(clip)));
}

function findLocomotionClip(clips: any[]) {
  const jog = findClip(
    clips,
    'Jog_Fwd_Loop',
    name => (name.includes('jog') || name.includes('run_fwd') || (name.includes('run') && name.includes('forward'))) && !name.includes('crouch'),
  );
  if (jog) return jog;

  return findClip(
    clips,
    'Walk_Fwd_Loop',
    name => name.includes('walk') && name.includes('fwd') && !name.includes('crouch'),
  );
}

function scoreAttackClip(name: string) {
  let score = 0;
  if (name.includes('bow')) score += 130;
  if (name.includes('archer') || name.includes('archery')) score += 120;
  if (name.includes('arrow')) score += 105;
  if (name.includes('ranged')) score += 85;
  if (name.includes('shoot') || name.includes('shot') || name.includes('release')) score += 75;
  if (name.includes('draw')) score += 32;
  if (name.includes('attack')) score += 18;
  if (name.includes('loop')) score -= 45;
  if (name.includes('pistol') || name.includes('rifle') || name.includes('gun')) score -= 180;
  if (name.includes('spell') || name.includes('magic') || name.includes('melee') || name.includes('punch')) score -= 120;
  return score;
}

function findAttackClip(clips: any[]) {
  return [...clips]
    .map(clip => ({ clip, score: scoreAttackClip(clipName(clip)) }))
    .filter(entry => entry.score > 30)
    .sort((a, b) => b.score - a.score)[0]?.clip ?? null;
}

export function composeFullRanger(THREE: any, baseScene: any, outfitScene: any, clips: any[]): RangerRig {
  const root = new THREE.Group();
  root.name = 'DungeonVeilFullRanger';

  const visualRoot = new THREE.Group();
  visualRoot.name = 'DungeonVeilRangerVisual';
  visualRoot.scale.set(0.9, 0.96, 0.9);
  visualRoot.position.y = 0.015;
  root.add(visualRoot);

  baseScene.name = 'RangerBaseBody';
  outfitScene.name = 'RangerFantasyOutfit';
  visualRoot.add(baseScene);
  visualRoot.add(outfitScene);

  for (const scene of [baseScene, outfitScene]) {
    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
  }

  const idleClip = findClip(
    clips,
    'Idle_Loop',
    name => name.includes('idle') && !name.includes('crouch') && !name.includes('talking') && !name.includes('torch') && !name.includes('pistol'),
  );
  const moveClip = findLocomotionClip(clips);
  const attackClip = findAttackClip(clips);

  const layers = [baseScene, outfitScene].map(scene => {
    const mixer = new THREE.AnimationMixer(scene);
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const move = moveClip ? mixer.clipAction(moveClip) : null;
    const attack = attackClip ? mixer.clipAction(attackClip) : null;
    if (idle) idle.timeScale = 0.94;
    if (move) move.timeScale = clipName(moveClip).includes('walk') ? 1.18 : 0.96;
    if (attack) {
      attack.timeScale = 1.32;
      attack.setLoop(THREE.LoopOnce, 1);
      attack.clampWhenFinished = false;
    }
    const initial = idle ?? move;
    initial?.reset().play();
    return { mixer, idle, move, attack, active: initial };
  });

  let movingState = false;
  let attackRemaining = 0;
  let lastAttackSignal = root.userData.rangerAttackSignal ?? 0;
  let movementBlend = 0;
  const attackDuration = attackClip ? Math.max(0.18, attackClip.duration / 1.32) : 0;

  const restoreMovement = () => {
    for (const layer of layers) {
      const next = movingState ? layer.move : layer.idle;
      if (!next || next === layer.active) continue;
      next.reset().fadeIn(0.12).play();
      layer.attack?.fadeOut(0.08);
      layer.active = next;
    }
  };

  const playAttack = () => {
    if (!attackClip) return false;
    attackRemaining = attackDuration;
    for (const layer of layers) {
      if (!layer.attack) continue;
      layer.attack.stop();
      layer.attack.reset().fadeIn(0.045).play();
      if (layer.active && layer.active !== layer.attack) layer.active.fadeOut(0.07);
      layer.active = layer.attack;
    }
    return true;
  };

  return {
    root,
    update(delta: number) {
      const attackSignal = root.userData.rangerAttackSignal ?? 0;
      if (attackSignal !== lastAttackSignal) {
        lastAttackSignal = attackSignal;
        playAttack();
      }

      movementBlend += ((movingState ? 1 : 0) - movementBlend) * Math.min(1, delta * 10);
      const motionTime = performance.now() * 0.009;
      visualRoot.rotation.z = Math.sin(motionTime) * 0.006 * movementBlend;
      visualRoot.position.y = 0.015 + Math.abs(Math.sin(motionTime * 1.08)) * 0.008 * movementBlend;

      if (attackRemaining > 0) {
        attackRemaining = Math.max(0, attackRemaining - delta);
        if (attackRemaining === 0) restoreMovement();
      }
      for (const layer of layers) layer.mixer.update(delta);
    },
    setMoving(moving: boolean) {
      movingState = moving;
      if (attackRemaining > 0) return;
      for (const layer of layers) {
        const next = moving ? layer.move : layer.idle;
        if (!next || next === layer.active) continue;
        next.reset().fadeIn(0.14).play();
        layer.active?.fadeOut(0.14);
        layer.active = next;
      }
    },
    triggerAttack() {
      return playAttack();
    },
    stop() {
      for (const layer of layers) layer.mixer.stopAllAction();
    },
  };
}
