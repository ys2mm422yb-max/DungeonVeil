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
  const walk = findClip(
    clips,
    'Walk_Fwd_Loop',
    name => name.includes('walk') && name.includes('fwd') && !name.includes('crouch'),
  );
  if (walk) return walk;

  return findClip(
    clips,
    'Jog_Fwd_Loop',
    name => (name.includes('jog') || name.includes('run_fwd')) && !name.includes('crouch'),
  );
}

function scoreAttackClip(name: string) {
  let score = 0;
  if (name.includes('bow')) score += 100;
  if (name.includes('archer') || name.includes('archery')) score += 95;
  if (name.includes('arrow')) score += 85;
  if (name.includes('ranged')) score += 70;
  if (name.includes('shoot') || name.includes('shot')) score += 60;
  if (name.includes('attack')) score += 18;
  if (name.includes('draw')) score += 12;
  if (name.includes('loop')) score -= 28;
  if (name.includes('pistol') || name.includes('rifle') || name.includes('gun')) score -= 120;
  if (name.includes('spell') || name.includes('magic') || name.includes('melee')) score -= 80;
  return score;
}

function findAttackClip(clips: any[]) {
  return [...clips]
    .map(clip => ({ clip, score: scoreAttackClip(clipName(clip)) }))
    .filter(entry => entry.score > 20)
    .sort((a, b) => b.score - a.score)[0]?.clip ?? null;
}

export function composeFullRanger(THREE: any, baseScene: any, outfitScene: any, clips: any[]): RangerRig {
  const root = new THREE.Group();
  root.name = 'DungeonVeilFullRanger';

  const visualRoot = new THREE.Group();
  visualRoot.name = 'DungeonVeilRangerVisual';
  visualRoot.scale.set(0.82, 0.88, 0.82);
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
    if (idle) idle.timeScale = 0.92;
    if (move) move.timeScale = 0.84;
    if (attack) {
      attack.timeScale = 1.2;
      attack.setLoop(THREE.LoopOnce, 1);
      attack.clampWhenFinished = true;
    }
    const initial = idle ?? move;
    initial?.reset().play();
    return { mixer, idle, move, attack, active: initial };
  });

  let movingState = false;
  let attackRemaining = 0;
  let lastAttackSignal = root.userData.rangerAttackSignal ?? 0;
  const attackDuration = attackClip ? Math.max(0.22, attackClip.duration / 1.2) : 0;

  const restoreMovement = () => {
    for (const layer of layers) {
      const next = movingState ? layer.move : layer.idle;
      if (!next) continue;
      next.reset().fadeIn(0.12).play();
      layer.attack?.fadeOut(0.1);
      layer.active = next;
    }
  };

  const playAttack = () => {
    if (!attackClip) return false;
    attackRemaining = attackDuration;
    for (const layer of layers) {
      if (!layer.attack) continue;
      layer.attack.stop();
      layer.attack.reset().fadeIn(0.06).play();
      layer.active?.fadeOut(0.08);
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
        next.reset().fadeIn(0.22).play();
        layer.active?.fadeOut(0.22);
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
