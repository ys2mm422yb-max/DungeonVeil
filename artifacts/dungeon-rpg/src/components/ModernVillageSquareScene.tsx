import React, { useEffect, useRef } from 'react';
import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_SELECTION_EVENT, loadCompanionRoleV4 } from '../game/companionSelectionV4';
import { type KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

const COMPANION_ROLE_COLOR: Readonly<Record<CompanionRoleV4, number>> = Object.freeze({
  'single-target': 0x75d9ff,
  'critical-support': 0xffc866,
  shield: 0x69dca1,
  'loot-comfort': 0xd8a95f,
  distraction: 0xb995ff,
});

type VeilWolfRig = {
  root: any;
  applyRole: (role: CompanionRoleV4) => void;
  update: (now: number) => void;
};

type HallPulse = {
  glowMaterial: any;
  mistMaterial: any;
  portalLight: any;
  crystal: any;
};

function pointedArchShape(THREE: any, halfWidth: number, height: number, shoulder: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, shoulder);
  shape.quadraticCurveTo(-halfWidth * 0.92, height * 0.77, 0, height);
  shape.quadraticCurveTo(halfWidth * 0.92, height * 0.77, halfWidth, shoulder);
  shape.lineTo(halfWidth, 0);
  shape.closePath();
  return shape;
}

function pointedArchFrame(THREE: any, outerWidth: number, outerHeight: number, thickness: number) {
  const outer = pointedArchShape(THREE, outerWidth, outerHeight, outerHeight * 0.43);
  const inner = new THREE.Path();
  const innerWidth = Math.max(0.2, outerWidth - thickness);
  const innerHeight = Math.max(0.4, outerHeight - thickness * 1.12);
  const innerShoulder = innerHeight * 0.43;
  inner.moveTo(-innerWidth, 0.04);
  inner.lineTo(-innerWidth, innerShoulder);
  inner.quadraticCurveTo(-innerWidth * 0.92, innerHeight * 0.77, 0, innerHeight);
  inner.quadraticCurveTo(innerWidth * 0.92, innerHeight * 0.77, innerWidth, innerShoulder);
  inner.lineTo(innerWidth, 0.04);
  inner.closePath();
  outer.holes.push(inner);
  return outer;
}

function createPortalTexture(THREE: any) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const background = context.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, '#8a4de0');
  background.addColorStop(0.28, '#5620a1');
  background.addColorStop(0.68, '#25054d');
  background.addColorStop(1, '#090112');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const bloom = context.createRadialGradient(128, 250, 8, 128, 260, 180);
  bloom.addColorStop(0, 'rgba(232,210,255,.72)');
  bloom.addColorStop(0.22, 'rgba(163,92,255,.38)');
  bloom.addColorStop(0.7, 'rgba(67,13,126,.18)');
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = bloom;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < 8; index++) {
    const offset = index * 31;
    context.beginPath();
    context.moveTo(28 + (index % 3) * 8, 482 - offset * 0.35);
    context.bezierCurveTo(178, 430 - offset, 64, 300 - offset * 0.42, 224, 70 + offset * 0.44);
    context.strokeStyle = `rgba(${165 + index * 6},${92 + index * 4},255,${0.08 + index * 0.012})`;
    context.lineWidth = 7 + (index % 2) * 5;
    context.stroke();
  }
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createHallArchitecture(THREE: any, root: any, scene: any): HallPulse {
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x17111f, roughness: 0.58, metalness: 0.18 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(17, 29), floorMaterial);
  floor.name = 'HallReflectiveFloor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.03, -5.2);
  root.add(floor);

  const aisleMaterial = new THREE.MeshStandardMaterial({ color: 0x28143d, roughness: 0.48, metalness: 0.22 });
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 22), aisleMaterial);
  aisle.name = 'HallPurpleAisle';
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.008, -4.5);
  root.add(aisle);

  const tileGeometry = new THREE.BoxGeometry(4.8, 0.05, 1.65);
  const tileMaterial = new THREE.MeshStandardMaterial({ color: 0x342342, roughness: 0.62, metalness: 0.16 });
  for (let index = 0; index < 8; index++) {
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
    tile.name = `HallAisleTile_${index}`;
    tile.position.set(index % 2 ? 0.08 : -0.08, 0.025, 2.6 - index * 1.62);
    tile.rotation.y = (index % 3 - 1) * 0.012;
    root.add(tile);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x211a29, roughness: 0.88 });
  const wallGeometry = new THREE.BoxGeometry(2.6, 9.2, 0.62);
  for (const x of [-5.35, 5.35]) {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.name = x < 0 ? 'HallWallLeft' : 'HallWallRight';
    wall.position.set(x, 4.4, -8.9);
    root.add(wall);
  }

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x342a3d, roughness: 0.78, metalness: 0.08 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x74558a, emissive: 0x261333, emissiveIntensity: 0.42, roughness: 0.52, metalness: 0.16 });
  const columnGeometry = new THREE.CylinderGeometry(0.55, 0.72, 8.3, IS_MOBILE ? 10 : 14);
  const capitalGeometry = new THREE.CylinderGeometry(0.92, 0.62, 0.5, IS_MOBILE ? 10 : 14);
  const baseGeometry = new THREE.CylinderGeometry(0.82, 0.94, 0.44, IS_MOBILE ? 10 : 14);
  for (const x of [-4.2, 4.2]) {
    const column = new THREE.Mesh(columnGeometry, stoneMaterial);
    column.name = x < 0 ? 'HallColumnLeft' : 'HallColumnRight';
    column.position.set(x, 4.05, -7.7);
    root.add(column);
    const capital = new THREE.Mesh(capitalGeometry, trimMaterial);
    capital.position.set(x, 8.15, -7.7);
    root.add(capital);
    const base = new THREE.Mesh(baseGeometry, trimMaterial);
    base.position.set(x, 0.2, -7.7);
    root.add(base);
  }

  const bannerMaterial = new THREE.MeshStandardMaterial({ color: 0x351047, emissive: 0x180321, emissiveIntensity: 0.36, roughness: 0.82, side: THREE.DoubleSide });
  const bannerGeometry = new THREE.PlaneGeometry(1.35, 3.65);
  for (const x of [-3.35, 3.35]) {
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.name = x < 0 ? 'HallBannerLeft' : 'HallBannerRight';
    banner.position.set(x, 4.8, -7.25);
    root.add(banner);
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: 0xb68cff }));
    rune.position.set(x, 4.85, -7.18);
    rune.scale.y = 1.65;
    root.add(rune);
  }

  const portalRoot = new THREE.Group();
  portalRoot.name = 'HallOfTheVeilPortal';
  portalRoot.position.set(0, 0.18, -9.7);
  root.add(portalRoot);

  const portalTexture = createPortalTexture(THREE);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x9e65ff, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(pointedArchShape(THREE, 2.12, 6.65, 2.9)), glowMaterial);
  glow.name = 'HallPortalOuterGlow';
  glow.position.z = -0.08;
  portalRoot.add(glow);

  const portalMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, map: portalTexture, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  const portalCore = new THREE.Mesh(new THREE.ShapeGeometry(pointedArchShape(THREE, 1.58, 5.75, 2.55)), portalMaterial);
  portalCore.name = 'HallPortalCore';
  portalCore.position.set(0, 0.14, 0.08);
  portalRoot.add(portalCore);

  const outerFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x2e2437, emissive: 0x120819, emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.12, side: THREE.DoubleSide });
  const outerFrame = new THREE.Mesh(new THREE.ShapeGeometry(pointedArchFrame(THREE, 2.42, 7.18, 0.4)), outerFrameMaterial);
  outerFrame.name = 'HallPortalStoneFrame';
  outerFrame.position.z = 0.18;
  portalRoot.add(outerFrame);

  const innerFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x8e62b2, emissive: 0x4f147d, emissiveIntensity: 1.05, roughness: 0.36, metalness: 0.22, side: THREE.DoubleSide });
  const innerFrame = new THREE.Mesh(new THREE.ShapeGeometry(pointedArchFrame(THREE, 1.9, 6.25, 0.16)), innerFrameMaterial);
  innerFrame.name = 'HallPortalRuneFrame';
  innerFrame.position.z = 0.24;
  portalRoot.add(innerFrame);

  const mistMaterial = new THREE.MeshBasicMaterial({ color: 0xb68cff, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const mist = new THREE.Mesh(new THREE.CircleGeometry(2.45, IS_MOBILE ? 28 : 40), mistMaterial);
  mist.name = 'HallPortalMist';
  mist.scale.set(1.6, 0.34, 1);
  mist.rotation.x = -Math.PI / 2;
  mist.position.set(0, 0.15, 2.2);
  portalRoot.add(mist);

  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xcaa8ff, emissive: 0x6d28d9, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.16 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), crystalMaterial);
  crystal.name = 'HallPortalCrownCrystal';
  crystal.position.set(0, 7.35, 0.34);
  crystal.scale.y = 1.55;
  portalRoot.add(crystal);

  const torchBracketMaterial = new THREE.MeshStandardMaterial({ color: 0x4b3528, roughness: 0.6, metalness: 0.35 });
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffb14b, transparent: true, opacity: 0.94 });
  for (const x of [-3.05, 3.05]) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8), torchBracketMaterial);
    bracket.position.set(x, 2.25, -5.95);
    root.add(bracket);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.58, 9), flameMaterial);
    flame.name = x < 0 ? 'HallTorchFlameLeft' : 'HallTorchFlameRight';
    flame.position.set(x, 2.92, -5.95);
    root.add(flame);
    const torchLight = new THREE.PointLight(0xff9f43, IS_MOBILE ? 2.2 : 2.7, 7.5, 2);
    torchLight.position.set(x, 2.8, -5.45);
    scene.add(torchLight);
  }

  const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const platform = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.75, IS_MOBILE ? 28 : 42), platformMaterial);
  platform.name = 'HallPlayerPlatform';
  platform.rotation.x = -Math.PI / 2;
  platform.position.set(0, 0.07, -3.9);
  root.add(platform);

  scene.add(new THREE.HemisphereLight(0x8a67a6, 0x08050b, 1.38));
  scene.add(new THREE.AmbientLight(0x73598c, 0.54));
  const portalLight = new THREE.PointLight(0x9b5cff, IS_MOBILE ? 6.3 : 7.4, 17, 2);
  portalLight.position.set(0, 4.3, -7.55);
  scene.add(portalLight);
  const playerLight = new THREE.PointLight(0xffc786, IS_MOBILE ? 3.05 : 3.55, 8.5, 2);
  playerLight.position.set(-1.5, 3.5, -1.65);
  scene.add(playerLight);
  const rimLight = new THREE.PointLight(0xad79ff, IS_MOBILE ? 2.8 : 3.35, 9, 2);
  rimLight.position.set(1.8, 3.15, -5.2);
  scene.add(rimLight);

  return { glowMaterial, mistMaterial, portalLight, crystal };
}

function createVeilWolf(THREE: any, initialRole: CompanionRoleV4): VeilWolfRig {
  const root = new THREE.Group();
  root.name = 'HallActiveCompanionVeilWolf';
  root.userData.activeCompanion = true;
  root.userData.companionSpecies = 'veil-wolf';
  root.position.set(1.18, 0.24, -3.35);
  root.rotation.y = -0.28;
  root.scale.setScalar(IS_MOBILE ? 0.38 : 0.42);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x262033, emissive: 0x291344, emissiveIntensity: 0.5, roughness: 0.62, metalness: 0.08 });
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0b13, emissive: 0x10091b, emissiveIntensity: 0.22, roughness: 0.84 });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xd8b9ff });
  const roleMaterial = new THREE.MeshStandardMaterial({ color: 0xb995ff, emissive: 0x6d28d9, emissiveIntensity: 1.1, roughness: 0.28 });
  const auraMaterial = new THREE.MeshBasicMaterial({ color: 0xb995ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });

  const sphereGeometry = new THREE.SphereGeometry(0.5, IS_MOBILE ? 10 : 14, IS_MOBILE ? 8 : 10);
  const smallSphereGeometry = new THREE.SphereGeometry(0.18, IS_MOBILE ? 8 : 10, IS_MOBILE ? 6 : 8);
  const legGeometry = new THREE.CylinderGeometry(0.11, 0.14, 0.78, IS_MOBILE ? 7 : 9);
  const earGeometry = new THREE.ConeGeometry(0.2, 0.52, IS_MOBILE ? 6 : 8);
  const tailGeometry = new THREE.CylinderGeometry(0.09, 0.18, 1.18, IS_MOBILE ? 7 : 9);

  const body = new THREE.Mesh(sphereGeometry, bodyMaterial);
  body.name = 'VeilWolfBody';
  body.scale.set(1.34, 0.62, 0.62);
  body.position.set(0, 0.94, 0);
  root.add(body);

  const chest = new THREE.Mesh(sphereGeometry, shadowMaterial);
  chest.name = 'VeilWolfChest';
  chest.scale.set(0.68, 0.82, 0.61);
  chest.position.set(0.34, 1.02, 0);
  root.add(chest);

  const headPivot = new THREE.Group();
  headPivot.name = 'VeilWolfHeadPivot';
  headPivot.position.set(0.69, 1.42, 0);
  root.add(headPivot);

  const head = new THREE.Mesh(sphereGeometry, bodyMaterial);
  head.name = 'VeilWolfHead';
  head.scale.set(0.7, 0.67, 0.64);
  headPivot.add(head);

  const muzzle = new THREE.Mesh(smallSphereGeometry, shadowMaterial);
  muzzle.name = 'VeilWolfMuzzle';
  muzzle.scale.set(1.25, 0.72, 0.86);
  muzzle.position.set(0.35, -0.08, 0);
  headPivot.add(muzzle);

  for (const z of [-0.22, 0.22]) {
    const ear = new THREE.Mesh(earGeometry, bodyMaterial);
    ear.position.set(-0.08, 0.48, z);
    ear.rotation.z = z < 0 ? -0.12 : 0.12;
    headPivot.add(ear);
    const eye = new THREE.Mesh(smallSphereGeometry, eyeMaterial);
    eye.scale.setScalar(0.22);
    eye.position.set(0.31, 0.09, z * 1.2);
    headPivot.add(eye);
  }

  const legPositions: Array<[number, number]> = [[0.4, -0.28], [0.4, 0.28], [-0.47, -0.28], [-0.47, 0.28]];
  for (const [x, z] of legPositions) {
    const leg = new THREE.Mesh(legGeometry, shadowMaterial);
    leg.position.set(x, 0.45, z);
    root.add(leg);
    const paw = new THREE.Mesh(smallSphereGeometry, bodyMaterial);
    paw.scale.set(0.74, 0.36, 0.86);
    paw.position.set(x + 0.05, 0.08, z);
    root.add(paw);
  }

  const tailPivot = new THREE.Group();
  tailPivot.name = 'VeilWolfTailPivot';
  tailPivot.position.set(-0.7, 1.08, 0);
  tailPivot.rotation.z = -1.04;
  root.add(tailPivot);
  const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
  tail.position.y = 0.48;
  tail.rotation.z = -0.16;
  tailPivot.add(tail);

  const aura = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.05, IS_MOBILE ? 24 : 36), auraMaterial);
  aura.name = 'VeilWolfRoleAura';
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.025;
  root.add(aura);

  const roleCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), roleMaterial);
  roleCrystal.name = 'VeilWolfRoleCrystal';
  roleCrystal.position.set(0.08, 1.48, -0.48);
  root.add(roleCrystal);

  const applyRole = (role: CompanionRoleV4) => {
    const color = COMPANION_ROLE_COLOR[role];
    root.userData.companionRole = role;
    auraMaterial.color.setHex(color);
    roleMaterial.color.setHex(color);
    roleMaterial.emissive.setHex(color);
  };
  applyRole(initialRole);

  return {
    root,
    applyRole,
    update(now: number) {
      const breath = Math.sin(now * 0.0021);
      root.position.y = 0.24 + breath * 0.022;
      body.scale.y = 0.62 + breath * 0.01;
      headPivot.rotation.z = Math.sin(now * 0.00125) * 0.035;
      tailPivot.rotation.z = -1.04 + Math.sin(now * 0.0032) * 0.18;
      auraMaterial.opacity = 0.24 + Math.sin(now * 0.0024) * 0.07;
      roleCrystal.rotation.y = now * 0.001;
    },
  };
}

function disposeScene(scene: any) {
  const disposedGeometries = new Set<any>();
  const disposedMaterials = new Set<any>();
  scene?.traverse?.((node: any) => {
    if (node.geometry && !disposedGeometries.has(node.geometry)) {
      disposedGeometries.add(node.geometry);
      node.geometry.dispose?.();
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => {
      if (disposedMaterials.has(material)) return;
      disposedMaterials.add(material);
      material.map?.dispose?.();
      material.alphaMap?.dispose?.();
      material.emissiveMap?.dispose?.();
      material.normalMap?.dispose?.();
      material.dispose?.();
    });
  });
}

async function loadVillageAssets(
  THREE: any,
  GLTFLoader: any,
  villageRoot: any,
  setPlayerRig: (rig: KayKitPlayerRig) => void,
  isDisposed: () => boolean,
) {
  const results = await Promise.allSettled([
    (async () => {
      const rig = await loadKayKitVillageArcher(THREE, GLTFLoader);
      if (isDisposed()) {
        rig.stop();
        return;
      }
      rig.root.position.set(0, 0.48, -3.62);
      rig.root.scale.multiplyScalar(0.58);
      villageRoot.add(rig.root);
      setPlayerRig(rig);
    })(),
  ]);

  results.forEach(result => {
    if (result.status === 'rejected') console.error('Village asset failed to load', result.reason);
  });
}

export function ModernVillageSquareScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let playerRig: KayKitPlayerRig | null = null;
    let companionRig: VeilWolfRig | null = null;
    let hallPulse: HallPulse | null = null;
    let activeCompanionRole = loadCompanionRoleV4();
    let removeResize = () => {};
    let lastFrame = 0;
    let lastRigFrame = 0;

    const handleCompanionSelection = (event: Event) => {
      const detailRole = (event as CustomEvent<{ role?: CompanionRoleV4 }>).detail?.role;
      activeCompanionRole = detailRole ?? loadCompanionRoleV4();
      companionRig?.applyRole(activeCompanionRole);
      host.dataset.companionRole = activeCompanionRole;
    };
    window.addEventListener(COMPANION_SELECTION_EVENT, handleCompanionSelection as EventListener);

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050308);
      scene.fog = new THREE.FogExp2(0x08050e, 0.036);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.42 : 1.3;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
      camera.position.set(0, 4.8, 12.7);
      camera.lookAt(0, 1.35, -3.6);

      const villageRoot = new THREE.Group();
      villageRoot.name = 'ModernKayKitVillageSquare';
      villageRoot.userData.sceneRole = 'HallOfTheVeilReference';
      villageRoot.userData.clearPlayerSilhouette = true;
      scene.add(villageRoot);

      hallPulse = createHallArchitecture(THREE, villageRoot, scene);
      companionRig = createVeilWolf(THREE, activeCompanionRole);
      villageRoot.add(companionRig.root);
      host.dataset.activeCompanion = 'veil-wolf';
      host.dataset.companionRole = activeCompanionRole;

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 39 : 34;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      window.addEventListener('resize', resize);
      window.visualViewport?.addEventListener('resize', resize);
      removeResize = () => {
        observer.disconnect();
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', resize);
      };

      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (IS_MOBILE && now - lastFrame < 33) return;
        const delta = lastRigFrame ? Math.min(0.05, (now - lastRigFrame) / 1000) : (IS_MOBILE ? 1 / 30 : 1 / 60);
        lastFrame = now;
        lastRigFrame = now;
        if (hallPulse) {
          hallPulse.glowMaterial.opacity = 0.2 + Math.sin(now * 0.0017) * 0.055;
          hallPulse.mistMaterial.opacity = 0.1 + Math.sin(now * 0.00125) * 0.035;
          hallPulse.portalLight.intensity = (IS_MOBILE ? 6.1 : 7.2) + Math.sin(now * 0.0014) * 0.4;
          hallPulse.crystal.rotation.y = now * 0.00065;
        }
        companionRig?.update(now);
        playerRig?.update(delta);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      void loadVillageAssets(THREE, GLTFLoader, villageRoot, rig => { playerRig = rig; }, () => disposed);
    };

    boot().catch(error => console.error('Hall of the Veil failed to initialize', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      window.removeEventListener(COMPANION_SELECTION_EVENT, handleCompanionSelection as EventListener);
      playerRig?.stop();
      disposeScene(scene);
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} data-testid="modern-village-square-scene" data-scene="hall-of-the-veil-reference" data-active-companion="veil-wolf" data-companion-full-body="true" className="pointer-events-none absolute inset-0" />;
}
