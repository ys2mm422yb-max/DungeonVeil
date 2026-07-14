from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} marker missing')
    return text.replace(old, new, 1)


enemy = Path('artifacts/dungeon-rpg/src/components/kaykitEnemy3D.ts')
text = enemy.read_text()
text = replace_once(
    text,
    """    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    node.frustumCulled = true;
""",
    """    node.castShadow = !IS_MOBILE;
    node.receiveShadow = !IS_MOBILE;
    // Animated bounds can lag behind the skinned pose on mobile. Never let a
    // living enemy disappear only because its bind-pose bounds left the frustum.
    node.frustumCulled = !node.isSkinnedMesh;
""",
    'enemy culling',
)
text = replace_once(
    text,
    "const importedPromises = new Map<EnemyType, Promise<EnemyPrototype | null>>();\n",
    """const importedPromises = new Map<EnemyType, Promise<EnemyPrototype | null>>();

function importedCreatureUrl(path: string) {
  const normalized = path.replace(/^\\/+/, '');
  if (typeof document === 'undefined') return `/${normalized}`;
  return new URL(normalized, document.baseURI).toString();
}
""",
    'imported URL',
)
text = replace_once(
    text,
    'new GLTFLoader().loadAsync(config.path)',
    'new GLTFLoader().loadAsync(importedCreatureUrl(config.path))',
    'imported loader',
)
enemy.write_text(text)

canvas = Path('artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx')
text = canvas.read_text()
text = replace_once(
    text,
    """    const enemyVisuals = new Map<string, KayKitEnemyVisual>();
    const enemyLoading = new Set<string>();
""",
    """    const enemyVisuals = new Map<string, KayKitEnemyVisual>();
    const enemyFallbacks = new Map<string, any>();
    const enemyLoading = new Set<string>();
""",
    'enemy maps',
)
text = replace_once(
    text,
    """    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;
""",
    """    const mapX = (state: GameState, value: number) => value / TILE - state.map.width / 2 + 0.5;
    const mapZ = (state: GameState, value: number) => value / TILE - state.map.height / 2 + 0.5;

    const createEnemyFallback = (enemy: GameState['enemies'][number]) => {
      const root = new THREE.Group();
      root.name = `EnemyVisibilityFallback_${enemy.id}`;
      const colors: Record<string, number> = {
        slime: 0x62c978, goblin: 0xb6a45d, skeleton: 0xd9d4c5, orc: 0x8eb16b,
        spider: 0x9b79c7, vampire: 0x9b4f72, demon: 0xd15b44, golem: 0x8d8174, boss: 0xffb454,
      };
      const color = colors[enemy.enemyType] ?? 0xff6b5d;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthTest: true, depthWrite: true });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.72, 8), material);
      body.position.y = 0.4;
      root.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), material.clone());
      head.position.y = 0.91;
      root.add(head);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.5, 18),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.018;
      root.add(ring);
      root.scale.setScalar(enemy.enemyType === 'boss' ? 1.65 : enemy.isElite ? 1.16 : 1);
      root.userData.visibilityFallback = true;
      root.userData.ring = ring;
      return root;
    };
""",
    'fallback helper',
)
old_sync = """      for (const [id, visual] of enemyVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual.root);
        visual.mixer?.stopAllAction?.();
        disposeObject(visual.root);
        enemyVisuals.delete(id);
      }

      for (const enemy of state.enemies) {
        let visual = enemyVisuals.get(enemy.id);
        if (!visual && !enemyLoading.has(enemy.id)) {
          enemyLoading.add(enemy.id);
          createKayKitEnemyVisual(THREE, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            console.error('KayKit enemy failed', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        const nextX = mapX(state, enemy.x + enemy.width / 2);
        const nextZ = mapZ(state, enemy.y + enemy.height / 2);
        const moveX = nextX - visual.root.position.x;
        const moveZ = nextZ - visual.root.position.z;
        visual.root.position.set(nextX, 0, nextZ);
        if (!enemy.isDead) {
          const moving = Math.hypot(moveX, moveZ) > 0.0004;
          const attackFacingX = mapX(state, state.player.x + state.player.width / 2) - nextX;
          const attackFacingZ = mapZ(state, state.player.y + state.player.height / 2) - nextZ;
          const targetAngle = enemy.state === 'attack' || !moving
            ? Math.atan2(attackFacingX, attackFacingZ)
            : Math.atan2(moveX, moveZ);
          const angleDelta = Math.atan2(Math.sin(targetAngle - visual.root.rotation.y), Math.cos(targetAngle - visual.root.rotation.y));
          visual.root.rotation.y += angleDelta * Math.min(1, delta * 12);
        }
        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);
      }
"""
new_sync = """      for (const [id, visual] of enemyVisuals) {
        if (active.has(id)) continue;
        scene.remove(visual.root);
        visual.mixer?.stopAllAction?.();
        disposeObject(visual.root);
        enemyVisuals.delete(id);
      }
      for (const [id, fallback] of enemyFallbacks) {
        if (active.has(id)) continue;
        scene.remove(fallback);
        disposeObject(fallback);
        enemyFallbacks.delete(id);
      }

      for (const enemy of state.enemies) {
        const nextX = mapX(state, enemy.x + enemy.width / 2);
        const nextZ = mapZ(state, enemy.y + enemy.height / 2);
        let visual = enemyVisuals.get(enemy.id);
        if (!visual) {
          let fallback = enemyFallbacks.get(enemy.id);
          if (!fallback) {
            fallback = createEnemyFallback(enemy);
            enemyFallbacks.set(enemy.id, fallback);
            scene.add(fallback);
          }
          fallback.position.set(nextX, 0, nextZ);
          fallback.rotation.y = gameNow * 0.0015 + enemy.id.length;
          if (fallback.userData.ring?.material) {
            fallback.userData.ring.material.opacity = 0.46 + Math.sin(gameNow * 0.008 + enemy.id.length) * 0.16;
          }
        }
        if (!visual && !enemyLoading.has(enemy.id)) {
          enemyLoading.add(enemy.id);
          createKayKitEnemyVisual(THREE, enemy).then(created => {
            enemyLoading.delete(enemy.id);
            if (!created || disposed || !stateRef.current.enemies.some(current => current.id === enemy.id)) return;
            const fallback = enemyFallbacks.get(enemy.id);
            if (fallback) {
              scene.remove(fallback);
              disposeObject(fallback);
              enemyFallbacks.delete(enemy.id);
            }
            enemyVisuals.set(enemy.id, created);
            scene.add(created.root);
          }).catch(error => {
            enemyLoading.delete(enemy.id);
            // Keep the visible fallback in the scene. A failed model may never
            // turn a living, attacking enemy into an invisible target.
            console.error('KayKit enemy failed; keeping visibility fallback', error);
          });
          continue;
        }
        visual = enemyVisuals.get(enemy.id);
        if (!visual) continue;
        const fallback = enemyFallbacks.get(enemy.id);
        if (fallback) {
          scene.remove(fallback);
          disposeObject(fallback);
          enemyFallbacks.delete(enemy.id);
        }
        const moveX = nextX - visual.root.position.x;
        const moveZ = nextZ - visual.root.position.z;
        visual.root.position.set(nextX, 0, nextZ);
        if (!enemy.isDead) {
          const moving = Math.hypot(moveX, moveZ) > 0.0004;
          const attackFacingX = mapX(state, state.player.x + state.player.width / 2) - nextX;
          const attackFacingZ = mapZ(state, state.player.y + state.player.height / 2) - nextZ;
          const targetAngle = enemy.state === 'attack' || !moving
            ? Math.atan2(attackFacingX, attackFacingZ)
            : Math.atan2(moveX, moveZ);
          const angleDelta = Math.atan2(Math.sin(targetAngle - visual.root.rotation.y), Math.cos(targetAngle - visual.root.rotation.y));
          visual.root.rotation.y += angleDelta * Math.min(1, delta * 12);
        }
        updateKayKitEnemyVisual(visual, enemy, delta, gameNow);
      }
"""
text = replace_once(text, old_sync, new_sync, 'enemy sync')
canvas.write_text(text)

Path('.github/workflows/apply-all-room-enemy-visibility-fix.yml').unlink(missing_ok=True)
Path('scripts/apply_all_room_enemy_visibility_fix.py').unlink(missing_ok=True)
