import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content);
const replaceOnce = (source, search, replacement, label) => {
  if (!source.includes(search)) throw new Error(`Missing patch anchor: ${label}`);
  return source.replace(search, replacement);
};

const gamePath = 'artifacts/dungeon-rpg/src/pages/game.tsx';
let game = read(gamePath);
const gameAnchor = "  useEffect(() => { if (hasChosen && uiState === 'lang_select') setUiState('main_menu'); }, [hasChosen, uiState]);\n  useEffect(() => { if (uiState === 'main_menu') setSaveData(hasSave() ? loadGame() : null); }, [uiState]);\n\n";
const gameReplacement = `${gameAnchor}  useEffect(() => {\n    const active = uiState === 'game';\n    if (active) document.documentElement.dataset.dungeonVeilActiveRun = '1';\n    else delete document.documentElement.dataset.dungeonVeilActiveRun;\n    window.dispatchEvent(new CustomEvent('dungeon-veil-run-active-changed', { detail: { active } }));\n    return () => {\n      if (!active) return;\n      delete document.documentElement.dataset.dungeonVeilActiveRun;\n      window.dispatchEvent(new CustomEvent('dungeon-veil-run-active-changed', { detail: { active: false } }));\n    };\n  }, [uiState]);\n\n`;
game = replaceOnce(game, gameAnchor, gameReplacement, 'active run deployment guard bridge');
write(gamePath, game);

const canvasPath = 'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx';
let canvas = read(canvasPath);
const portalPattern = /    const syncPortal = \(state: GameState, gameNow: number, wallNow: number\) => \{[\s\S]*?\n    const ensurePlayerPulse = \(\) => \{/;
if (!portalPattern.test(canvas)) throw new Error('Missing syncPortal block');
const portalReplacement = `    const syncPortal = (state: GameState, gameNow: number, wallNow: number) => {
      const clear = state.roomClearReady && state.status === 'playing';
      if (!clear) {
        if (portal) {
          scene.remove(portal);
          disposeObject(portal);
          portal = null;
        }
        return;
      }

      if (!portal) {
        portal = new THREE.Group();
        portal.name = 'RunExitEffect';
        portal.userData.presentationContract = 'dungeon-veil-violet-arch-v2';

        const groundRing = new THREE.Mesh(
          new THREE.RingGeometry(0.66, 1.18, IS_ANDROID ? 30 : 56),
          new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = 0.035;
        portal.add(groundRing);

        const groundInner = new THREE.Mesh(
          new THREE.RingGeometry(0.27, 0.48, IS_ANDROID ? 20 : 40),
          new THREE.MeshBasicMaterial({ color: 0xd8ccff, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        groundInner.rotation.x = -Math.PI / 2;
        groundInner.position.y = 0.04;
        portal.add(groundInner);

        const stoneArch = new THREE.Mesh(
          new THREE.TorusGeometry(0.94, 0.125, IS_ANDROID ? 8 : 12, IS_ANDROID ? 40 : 72),
          new THREE.MeshStandardMaterial({ color: 0xaaa6b8, metalness: 0.34, roughness: 0.62, emissive: 0x2d145e, emissiveIntensity: 0.24 }),
        );
        stoneArch.position.y = 1.13;
        stoneArch.scale.y = 1.32;
        portal.add(stoneArch);

        const outerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.94, 0.036, IS_ANDROID ? 6 : 8, IS_ANDROID ? 36 : 68),
          new THREE.MeshBasicMaterial({ color: 0xe2d8ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        outerRing.position.set(0, 1.13, 0.035);
        outerRing.scale.y = 1.32;
        portal.add(outerRing);

        const innerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.73, 0.028, IS_ANDROID ? 6 : 8, IS_ANDROID ? 32 : 60),
          new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        innerRing.position.set(0, 1.13, 0.055);
        innerRing.scale.y = 1.35;
        portal.add(innerRing);

        const vortexLayers = [];
        const vortexColors = [0x160b39, 0x3b1681, 0x7c3aed];
        for (let index = 0; index < 3; index++) {
          const layer = new THREE.Mesh(
            new THREE.CircleGeometry(0.7 - index * 0.07, IS_ANDROID ? 28 : 52),
            new THREE.MeshBasicMaterial({ color: vortexColors[index], transparent: true, opacity: 0.5 - index * 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          layer.position.set(0, 1.13, -0.055 + index * 0.025);
          layer.scale.y = 1.36;
          layer.userData.baseOpacity = 0.5 - index * 0.08;
          layer.userData.baseScale = 1 - index * 0.055;
          portal.add(layer);
          vortexLayers.push(layer);
        }

        const energyRibbons = [];
        for (let index = 0; index < 2; index++) {
          const ribbon = new THREE.Mesh(
            new THREE.TorusGeometry(0.82 - index * 0.11, 0.018 + index * 0.004, 5, IS_ANDROID ? 34 : 64, Math.PI * 1.52),
            new THREE.MeshBasicMaterial({ color: index ? 0xc4b5fd : 0x7c3aed, transparent: true, opacity: index ? 0.66 : 0.78, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          ribbon.position.set(0, 1.13, 0.075 + index * 0.018);
          ribbon.scale.y = 1.34;
          ribbon.rotation.z = index * Math.PI;
          portal.add(ribbon);
          energyRibbons.push(ribbon);
        }

        const runeMaterial = new THREE.MeshStandardMaterial({ color: 0xc4b5fd, metalness: 0.52, roughness: 0.34, emissive: 0x7c3aed, emissiveIntensity: 0.9 });
        const runeDiamonds = [];
        const runePositions = [[0, 2.48, 0.05], [0, -0.2, 0.05], [-1.08, 1.13, 0.05], [1.08, 1.13, 0.05]];
        runePositions.forEach(([x, y, z], index) => {
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(index < 2 ? 0.13 : 0.11, 0), runeMaterial.clone());
          rune.position.set(x, y, z);
          rune.rotation.z = Math.PI / 4;
          portal.add(rune);
          runeDiamonds.push(rune);
        });

        const moteCount = IS_ANDROID ? 6 : IS_MOBILE ? 9 : 14;
        const motes = [];
        for (let index = 0; index < moteCount; index++) {
          const mote = new THREE.Mesh(
            new THREE.SphereGeometry(0.038 + (index % 3) * 0.011, 6, 6),
            new THREE.MeshBasicMaterial({ color: index % 2 ? 0xe9ddff : 0x8b5cf6, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          mote.userData.phase = index / moteCount * Math.PI * 2;
          portal.add(mote);
          motes.push(mote);
        }

        const core = IS_MOBILE ? new THREE.Object3D() : new THREE.PointLight(0x9d76ff, 9.6, 9.2, 2);
        core.intensity = IS_MOBILE ? 0 : core.intensity;
        core.position.y = 1.1;
        portal.add(core);

        portal.userData.groundRing = groundRing;
        portal.userData.groundInner = groundInner;
        portal.userData.stoneArch = stoneArch;
        portal.userData.outerRing = outerRing;
        portal.userData.innerRing = innerRing;
        portal.userData.vortexLayers = vortexLayers;
        portal.userData.energyRibbons = energyRibbons;
        portal.userData.runeDiamonds = runeDiamonds;
        portal.userData.motes = motes;
        portal.userData.core = core;
        scene.add(portal);
      }

      let exitX = Math.floor(state.map.width / 2);
      let exitY = 2;
      for (let y = 0; y < state.map.height; y++) {
        const x = state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x >= 0) { exitX = x; exitY = y; break; }
      }

      portal.position.set(exitX + 0.5 - state.map.width / 2, 0.02, exitY + 0.5 - state.map.height / 2);
      const activateProgress = Math.min(1, Math.max(0, (gameNow - state.roomClearAt) / 560));
      const eased = 1 - Math.pow(1 - activateProgress, 3);
      const pulse = 0.5 + Math.sin(wallNow * 0.0055) * 0.5;
      portal.scale.setScalar(0.08 + eased * 0.92);
      portal.userData.outerRing.rotation.z = wallNow * 0.00058;
      portal.userData.innerRing.rotation.z = -wallNow * 0.00118;
      portal.userData.groundRing.rotation.z = wallNow * 0.00062;
      portal.userData.groundInner.rotation.z = -wallNow * 0.00105;
      portal.userData.groundRing.material.opacity = (0.38 + pulse * 0.28) * eased;
      portal.userData.groundInner.material.opacity = (0.2 + pulse * 0.18) * eased;
      portal.userData.stoneArch.material.emissiveIntensity = (0.18 + pulse * 0.2) * eased;
      portal.userData.vortexLayers.forEach((layer, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        layer.rotation.z = direction * wallNow * (0.00055 + index * 0.00038);
        layer.material.opacity = (layer.userData.baseOpacity + pulse * 0.08) * eased;
        const scale = layer.userData.baseScale * (0.94 + pulse * (0.07 + index * 0.01));
        layer.scale.set(scale, scale * 1.36, 1);
      });
      portal.userData.energyRibbons.forEach((ribbon, index) => {
        ribbon.rotation.z = (index ? -1 : 1) * wallNow * (0.00115 + index * 0.00045) + index * Math.PI;
        ribbon.material.opacity = (0.5 + pulse * 0.28 - index * 0.08) * eased;
      });
      portal.userData.runeDiamonds.forEach((rune, index) => {
        rune.rotation.y = wallNow * (0.001 + index * 0.00018);
        rune.scale.setScalar((0.88 + pulse * 0.22) * eased);
        rune.material.emissiveIntensity = (0.62 + pulse * 0.65) * eased;
      });
      if (!IS_MOBILE) portal.userData.core.intensity = (8.4 + pulse * 3.4) * eased;
      portal.userData.motes.forEach((mote, index) => {
        const phase = mote.userData.phase + wallNow * (0.001 + index * 0.000022);
        const radius = 0.66 + (index % 4) * 0.11;
        mote.position.x = Math.sin(phase) * radius;
        mote.position.y = 0.16 + ((wallNow * 0.00045 + index / Math.max(1, portal.userData.motes.length - 1)) % 1) * 2.18;
        mote.position.z = 0.08 + Math.cos(phase) * 0.13;
        mote.material.opacity = (0.38 + Math.sin(phase * 2) * 0.32) * eased;
      });
    };

    const ensurePlayerPulse = () => {`;
canvas = canvas.replace(portalPattern, portalReplacement);
canvas = replaceOnce(
  canvas,
  '  return <div ref={hostRef} className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="run-three-host" style={{ width: \'100%\', height: \'100%\' }} />;\n',
  '  return <div ref={hostRef} className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="run-three-host" data-portal-contract="dungeon-veil-violet-arch-v2" style={{ width: \'100%\', height: \'100%\' }} />;\n',
  'portal diagnostic contract',
);
write(canvasPath, canvas);

const packagePath = 'artifacts/dungeon-rpg/package.json';
const pkg = JSON.parse(read(packagePath));
const appendAudit = (name, command) => {
  const current = String(pkg.scripts[name] ?? '');
  if (!current.includes(command)) pkg.scripts[name] = current ? `${current} && ${command}` : command;
};
appendAudit('audit:loading', 'node scripts/validate-loading-portal-continuity.mjs');
appendAudit('audit:rooms', 'node scripts/validate-loading-portal-continuity.mjs');
appendAudit('audit:requested-pass', 'node scripts/validate-loading-portal-continuity.mjs');
pkg.scripts['audit:loading-continuity'] = 'node scripts/validate-loading-portal-continuity.mjs';
write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('Applied active-run reload protection bridge, layered violet portal and continuity audit wiring.');
