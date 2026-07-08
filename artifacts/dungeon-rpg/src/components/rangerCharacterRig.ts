export type RangerRig = {
  root: any;
  update: (delta: number) => void;
  setMoving: (moving: boolean) => void;
  stop: () => void;
};

function findClip(clips: any[], exactName: string, fallback: (name: string) => boolean) {
  return clips.find(clip => String(clip.name || '').toLowerCase() === exactName.toLowerCase())
    ?? clips.find(clip => fallback(String(clip.name || '').toLowerCase()));
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

  const layers = [baseScene, outfitScene].map(scene => {
    const mixer = new THREE.AnimationMixer(scene);
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const move = moveClip ? mixer.clipAction(moveClip) : null;
    if (idle) idle.timeScale = 0.92;
    if (move) move.timeScale = 0.84;
    const initial = idle ?? move;
    initial?.reset().play();
    return { mixer, idle, move, active: initial };
  });

  let movingState = false;

  return {
    root,
    update(delta: number) {
      for (const layer of layers) layer.mixer.update(delta);
    },
    setMoving(moving: boolean) {
      if (moving === movingState) return;
      movingState = moving;
      for (const layer of layers) {
        const next = moving ? layer.move : layer.idle;
        if (!next || next === layer.active) continue;
        next.reset().fadeIn(0.22).play();
        layer.active?.fadeOut(0.22);
        layer.active = next;
      }
    },
    stop() {
      for (const layer of layers) layer.mixer.stopAllAction();
    },
  };
}
