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

export function composeFullRanger(THREE: any, baseScene: any, outfitScene: any, clips: any[]): RangerRig {
  const root = new THREE.Group();
  root.name = 'DungeonVeilFullRanger';

  baseScene.name = 'RangerBaseBody';
  outfitScene.name = 'RangerFantasyOutfit';
  root.add(baseScene);
  root.add(outfitScene);

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
  const runClip = findClip(clips, 'Jog_Fwd_Loop', name => name.includes('jog') || name.includes('run_fwd'));

  const layers = [baseScene, outfitScene].map(scene => {
    const mixer = new THREE.AnimationMixer(scene);
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const run = runClip ? mixer.clipAction(runClip) : null;
    const initial = idle ?? run;
    initial?.reset().play();
    return { mixer, idle, run, active: initial };
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
        const next = moving ? layer.run : layer.idle;
        if (!next || next === layer.active) continue;
        next.reset().fadeIn(0.12).play();
        layer.active?.fadeOut(0.12);
        layer.active = next;
      }
    },
    stop() {
      for (const layer of layers) layer.mixer.stopAllAction();
    },
  };
}
