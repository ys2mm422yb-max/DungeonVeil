import type { GameState } from '../game/runEngine';

export type CombatFeedback3D = {
  update: (state: GameState, now: number) => void;
  applyCameraPunch: (camera: any) => void;
  dispose: () => void;
};

export function createCombatFeedback3D(THREE: any, scene: any): CombatFeedback3D {
  const pulses = new Map<string, any>();
  let lastPlayerHp = -1;
  let lastEnemyFlash = 0;
  let shake = 0;
  let heavyShake = 0;

  const makePulse = (id: string, x: number, z: number, color: number, heavy: boolean) => {
    if (pulses.has(id)) return;
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(heavy ? 0.32 : 0.2, heavy ? 0.045 : 0.028, 6, 20),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: heavy ? 0.9 : 0.72, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    const sparkMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    for (let index = 0; index < (heavy ? 8 : 5); index++) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(heavy ? 0.055 : 0.038, 0), sparkMaterial.clone());
      const angle = (index / (heavy ? 8 : 5)) * Math.PI * 2;
      spark.position.set(Math.cos(angle) * 0.12, 0.16, Math.sin(angle) * 0.12);
      spark.userData.angle = angle;
      group.add(spark);
    }
    group.position.set(x, 0, z);
    group.userData.startedAt = performance.now();
    group.userData.heavy = heavy;
    scene.add(group);
    pulses.set(id, group);
  };

  const updatePulses = (now: number) => {
    for (const [id, group] of pulses) {
      const age = now - group.userData.startedAt;
      const duration = group.userData.heavy ? 260 : 190;
      const progress = Math.min(1, age / duration);
      const ring = group.children[0];
      ring.scale.setScalar(0.65 + progress * (group.userData.heavy ? 2.7 : 1.8));
      ring.material.opacity = (group.userData.heavy ? 0.9 : 0.72) * (1 - progress);
      for (let index = 1; index < group.children.length; index++) {
        const spark = group.children[index];
        const distance = 0.12 + progress * (group.userData.heavy ? 0.75 : 0.45);
        spark.position.x = Math.cos(spark.userData.angle) * distance;
        spark.position.z = Math.sin(spark.userData.angle) * distance;
        spark.position.y = 0.16 + Math.sin(progress * Math.PI) * 0.28;
        spark.material.opacity = 0.9 * (1 - progress);
      }
      if (progress >= 1) {
        scene.remove(group);
        group.traverse((node: any) => {
          node.geometry?.dispose?.();
          node.material?.dispose?.();
        });
        pulses.delete(id);
      }
    }
  };

  return {
    update(state, now) {
      if (lastPlayerHp < 0) lastPlayerHp = state.player.hp;
      if (state.player.hp < lastPlayerHp) {
        heavyShake = Math.max(heavyShake, 1);
        const x = state.player.x / 40 - state.map.width / 2 + 0.5;
        const z = state.player.y / 40 - state.map.height / 2 + 0.5;
        makePulse(`player-hit-${now}-${state.player.hp}`, x, z, 0xff4b3e, true);
        try { navigator.vibrate?.([24, 18, 36]); } catch {}
      }
      lastPlayerHp = state.player.hp;

      for (const enemy of state.enemies) {
        if (enemy.flashUntil <= lastEnemyFlash || enemy.flashUntil <= now) continue;
        const x = (enemy.x + enemy.width / 2) / 40 - state.map.width / 2 + 0.5;
        const z = (enemy.y + enemy.height / 2) / 40 - state.map.height / 2 + 0.5;
        const heavy = enemy.enemyType === 'boss';
        makePulse(`enemy-hit-${enemy.id}-${enemy.flashUntil}`, x, z, heavy ? 0xff6b3f : 0xffd77a, heavy);
        shake = Math.max(shake, heavy ? 0.72 : 0.28);
      }
      lastEnemyFlash = Math.max(lastEnemyFlash, ...state.enemies.map(enemy => enemy.flashUntil || 0), 0);
      updatePulses(now);
      shake *= 0.82;
      heavyShake *= 0.76;
    },
    applyCameraPunch(camera) {
      const amount = shake * 0.08 + heavyShake * 0.16;
      if (amount < 0.002) return;
      camera.position.x += (Math.random() - 0.5) * amount;
      camera.position.y += (Math.random() - 0.5) * amount * 0.45;
      camera.position.z += (Math.random() - 0.5) * amount * 0.7;
    },
    dispose() {
      for (const group of pulses.values()) {
        scene.remove(group);
        group.traverse((node: any) => {
          node.geometry?.dispose?.();
          node.material?.dispose?.();
        });
      }
      pulses.clear();
    },
  };
}
