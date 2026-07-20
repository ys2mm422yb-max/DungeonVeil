import React, { useEffect, useRef } from 'react';
import {
  activeCompanionV5,
  COMPANION_COLLECTION_EVENT,
  type CompanionSpeciesV5,
} from '../game/companionCollectionV5';
import type { KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const localRuntimeUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const THREE_URL = localRuntimeUrl('assets/vendor/three/build/three.module.js');
const GLTF_URL = localRuntimeUrl('assets/vendor/three/examples/jsm/loaders/GLTFLoader.js');
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type MenuCompanionRig = {
  root: any;
  species: CompanionSpeciesV5;
  update: (now: number) => void;
  dispose: () => void;
};

function standardMaterial(THREE: any, color: number, emissive = 0x000000, intensity = 0, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness, metalness: 0.08 });
}

function glowMaterial(THREE: any, color: number, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function namedMesh(THREE: any, geometry: any, material: any, name: string) {
  const value = new THREE.Mesh(geometry, material);
  value.name = name;
  value.castShadow = false;
  value.receiveShadow = false;
  return value;
}

function addEyes(THREE: any, parent: any, material: any, y: number, z: number, spread: number) {
  for (const side of [-1, 1]) {
    const eye = namedMesh(THREE, new THREE.SphereGeometry(0.045, 10, 7), material, 'MenuCompanionEye');
    eye.position.set(side * spread, y, z);
    parent.add(eye);
  }
}

function createLynxVisual(THREE: any, visual: any, accent: number) {
  const fur = standardMaterial(THREE, 0x24384a, accent, 0.2, 0.76);
  const dark = standardMaterial(THREE, 0x101823, 0x07101a, 0.22, 0.86);
  const pale = standardMaterial(THREE, 0x86acc0, accent, 0.16, 0.72);
  const rune = standardMaterial(THREE, accent, accent, 1.5, 0.24);
  const eye = glowMaterial(THREE, 0xeaffff, 0.92);

  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.54, 1), fur, 'MenuVeilLynxBody');
  body.scale.set(0.78, 0.58, 1.18);
  body.position.y = 0.82;
  visual.add(body);

  const chest = namedMesh(THREE, new THREE.DodecahedronGeometry(0.38, 1), pale, 'MenuVeilLynxChest');
  chest.scale.set(0.76, 0.88, 0.68);
  chest.position.set(0, 0.94, 0.43);
  visual.add(chest);

  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.36, 1), fur, 'MenuVeilLynxHead');
  head.scale.set(0.92, 0.84, 0.9);
  head.position.set(0, 1.29, 0.76);
  visual.add(head);

  const cheeks: any[] = [];
  for (const side of [-1, 1]) {
    const cheek = namedMesh(THREE, new THREE.SphereGeometry(0.12, 10, 7), pale, 'MenuVeilLynxCheek');
    cheek.scale.set(1.12, 0.72, 0.88);
    cheek.position.set(side * 0.11, 1.2, 1.04);
    visual.add(cheek);
    cheeks.push(cheek);
    const ear = namedMesh(THREE, new THREE.ConeGeometry(0.14, 0.4, 5), fur, 'MenuVeilLynxEar');
    ear.position.set(side * 0.21, 1.62, 0.75);
    ear.rotation.z = side * -0.1;
    visual.add(ear);
  }
  addEyes(THREE, visual, eye, 1.36, 1.03, 0.14);
  const nose = namedMesh(THREE, new THREE.OctahedronGeometry(0.07, 0), dark, 'MenuVeilLynxNose');
  nose.scale.set(1.1, 0.72, 0.86);
  nose.position.set(0, 1.24, 1.15);
  visual.add(nose);

  const legPivots: any[] = [];
  for (const [x, z, phase] of [[-0.29, 0.38, 0], [0.29, 0.38, Math.PI], [-0.29, -0.4, Math.PI], [0.29, -0.4, 0]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.65, z);
    pivot.userData.phase = phase;
    const leg = namedMesh(THREE, new THREE.CylinderGeometry(0.075, 0.105, 0.52, 7), dark, 'MenuVeilLynxLeg');
    leg.position.y = -0.25;
    pivot.add(leg);
    const paw = namedMesh(THREE, new THREE.SphereGeometry(0.12, 9, 6), fur, 'MenuVeilLynxPaw');
    paw.scale.set(1.05, 0.48, 1.36);
    paw.position.set(0, -0.51, 0.06);
    pivot.add(paw);
    visual.add(pivot);
    legPivots.push(pivot);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.94, -0.6);
  const tail = namedMesh(THREE, new THREE.CylinderGeometry(0.07, 0.12, 1.12, 8), fur, 'MenuVeilLynxTail');
  tail.rotation.x = Math.PI / 2.7;
  tail.position.set(0, 0.2, -0.4);
  tailPivot.add(tail);
  visual.add(tailPivot);

  const crest = namedMesh(THREE, new THREE.OctahedronGeometry(0.1, 0), rune, 'MenuVeilLynxRune');
  crest.position.set(0, 1.49, 0.58);
  visual.add(crest);

  return (now: number) => {
    const idle = Math.sin(now * 0.0028);
    visual.position.y = 0.03 + idle * 0.018;
    head.rotation.y = Math.sin(now * 0.0014) * 0.05;
    cheeks.forEach((cheek, index) => { cheek.scale.y = 0.72 + Math.sin(now * 0.003 + index) * 0.015; });
    legPivots.forEach(pivot => { pivot.rotation.x = Math.sin(now * 0.0018 + pivot.userData.phase) * 0.028; });
    tailPivot.rotation.y = Math.sin(now * 0.0031) * 0.42;
    crest.rotation.y = now * 0.0018;
  };
}

function createRavenVisual(THREE: any, visual: any, accent: number) {
  const feather = standardMaterial(THREE, 0x211824, 0x32130a, 0.35, 0.78);
  const ember = standardMaterial(THREE, accent, accent, 1.55, 0.22);
  const eye = glowMaterial(THREE, 0xfff0cf, 0.95);
  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.44, 1), feather, 'MenuEmberRavenBody');
  body.scale.set(0.7, 0.94, 1.0);
  visual.add(body);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.29, 1), feather, 'MenuEmberRavenHead');
  head.position.set(0, 0.42, 0.43);
  visual.add(head);
  const beak = namedMesh(THREE, new THREE.ConeGeometry(0.12, 0.45, 5), ember, 'MenuEmberRavenBeak');
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.36, 0.76);
  visual.add(beak);
  addEyes(THREE, visual, eye, 0.49, 0.68, 0.12);
  const wings: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.32, 0.04, 0);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.48, 1.1, 5), feather, 'MenuEmberRavenWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.position.x = side * 0.44;
    pivot.add(wing);
    visual.add(pivot);
    wings.push(pivot);
  }
  return (now: number) => {
    const flap = Math.sin(now * 0.0075);
    visual.position.y = 0.9 + Math.sin(now * 0.003) * 0.1;
    wings[0].rotation.z = 0.18 + flap * 0.4;
    wings[1].rotation.z = -0.18 - flap * 0.4;
  };
}

function createSentinelVisual(THREE: any, visual: any, accent: number) {
  const stone = standardMaterial(THREE, 0x26312f, 0x0a2419, 0.32, 0.9);
  const rune = standardMaterial(THREE, accent, accent, 1.55, 0.22);
  const torso = namedMesh(THREE, new THREE.BoxGeometry(0.82, 0.94, 0.6), stone, 'MenuRuneSentinelTorso');
  torso.position.y = 1.0;
  visual.add(torso);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.32, 0), stone, 'MenuRuneSentinelHead');
  head.position.set(0, 1.68, 0.12);
  visual.add(head);
  const face = namedMesh(THREE, new THREE.OctahedronGeometry(0.1, 0), rune, 'MenuRuneSentinelFaceRune');
  face.position.set(0, 1.68, 0.43);
  visual.add(face);
  const arms: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.55, 1.32, 0);
    const arm = namedMesh(THREE, new THREE.BoxGeometry(0.27, 0.76, 0.3), stone, 'MenuRuneSentinelArm');
    arm.position.y = -0.33;
    pivot.add(arm);
    const fist = namedMesh(THREE, new THREE.DodecahedronGeometry(0.2, 0), rune, 'MenuRuneSentinelFist');
    fist.position.y = -0.73;
    pivot.add(fist);
    visual.add(pivot);
    arms.push(pivot);
  }
  for (const side of [-1, 1]) {
    const leg = namedMesh(THREE, new THREE.BoxGeometry(0.31, 0.66, 0.36), stone, 'MenuRuneSentinelLeg');
    leg.position.set(side * 0.25, 0.34, 0);
    visual.add(leg);
  }
  return (now: number) => {
    const idle = Math.sin(now * 0.0024);
    visual.position.y = 0.02 + Math.abs(idle) * 0.015;
    arms[0].rotation.z = 0.04 + idle * 0.025;
    arms[1].rotation.z = -0.04 - idle * 0.025;
    face.rotation.y = now * 0.0014;
  };
}

function createWispVisual(THREE: any, visual: any, accent: number) {
  const shell = standardMaterial(THREE, 0x3d3820, accent, 0.9, 0.3);
  const core = namedMesh(THREE, new THREE.IcosahedronGeometry(0.4, 1), shell, 'MenuLanternWispCore');
  visual.add(core);
  const inner = namedMesh(THREE, new THREE.SphereGeometry(0.23, 12, 8), glowMaterial(THREE, 0xfff1a3, 0.88), 'MenuLanternWispInnerLight');
  visual.add(inner);
  const orbit = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const shard = namedMesh(THREE, new THREE.OctahedronGeometry(0.1, 0), standardMaterial(THREE, accent, accent, 1.4, 0.22), 'MenuLanternWispShard');
    const angle = index / 5 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.66, Math.sin(angle * 2) * 0.14, Math.sin(angle) * 0.66);
    orbit.add(shard);
  }
  visual.add(orbit);
  const veil = namedMesh(THREE, new THREE.ConeGeometry(0.34, 0.96, 8, 1, true), glowMaterial(THREE, accent, 0.2), 'MenuLanternWispVeil');
  veil.position.y = -0.52;
  veil.rotation.x = Math.PI;
  visual.add(veil);
  return (now: number) => {
    visual.position.y = 0.96 + Math.sin(now * 0.0037) * 0.14;
    orbit.rotation.y = now * 0.0024;
    inner.scale.setScalar(1 + Math.sin(now * 0.006) * 0.08);
  };
}

function createDrakeVisual(THREE: any, visual: any, accent: number) {
  const scale = standardMaterial(THREE, 0x2d2040, 0x2b0f4d, 0.44, 0.7);
  const dark = standardMaterial(THREE, 0x15121d, 0x140824, 0.22, 0.84);
  const flame = standardMaterial(THREE, accent, accent, 1.55, 0.22);
  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.5, 1), scale, 'MenuDuskDrakeBody');
  body.scale.set(0.78, 0.62, 1.16);
  body.position.y = 0.8;
  visual.add(body);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.33, 1), scale, 'MenuDuskDrakeHead');
  head.scale.set(0.9, 0.75, 1.1);
  head.position.set(0, 1.3, 0.83);
  visual.add(head);
  const snout = namedMesh(THREE, new THREE.BoxGeometry(0.34, 0.2, 0.42), dark, 'MenuDuskDrakeSnout');
  snout.position.set(0, 1.23, 1.14);
  visual.add(snout);
  addEyes(THREE, visual, glowMaterial(THREE, 0xf8efff, 0.95), 1.39, 1.05, 0.13);
  const wings: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.32, 1.0, -0.05);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.48, 1.12, 4), scale, 'MenuDuskDrakeWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.position.x = side * 0.48;
    pivot.add(wing);
    visual.add(pivot);
    wings.push(pivot);
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.88, -0.58);
  const tail = namedMesh(THREE, new THREE.ConeGeometry(0.14, 1.18, 8), scale, 'MenuDuskDrakeTail');
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.52;
  tailPivot.add(tail);
  visual.add(tailPivot);
  const flameTip = namedMesh(THREE, new THREE.ConeGeometry(0.1, 0.34, 6), flame, 'MenuDuskDrakeVeilfire');
  flameTip.rotation.x = -Math.PI / 2;
  flameTip.position.set(0, 1.22, 1.45);
  visual.add(flameTip);
  return (now: number) => {
    const flap = Math.sin(now * 0.0055);
    visual.position.y = 0.04 + Math.sin(now * 0.0028) * 0.025;
    wings[0].rotation.z = 0.18 + flap * 0.2;
    wings[1].rotation.z = -0.18 - flap * 0.2;
    tailPivot.rotation.y = Math.sin(now * 0.003) * 0.34;
    flameTip.scale.setScalar(1 + Math.sin(now * 0.007) * 0.12);
  };
}

function createMenuCompanionRig(THREE: any, species: CompanionSpeciesV5, accent: number): MenuCompanionRig {
  const root = new THREE.Group();
  root.name = `MainMenuCompanion_${species}`;
  root.userData.companionSpecies = species;
  root.position.set(1.05, 0.09, -1.85);
  root.rotation.y = -0.2;

  const visual = new THREE.Group();
  visual.name = `MenuCompanionVisual_${species}`;
  root.add(visual);
  const updateVisual = species === 'veil-lynx'
    ? createLynxVisual(THREE, visual, accent)
    : species === 'ember-raven'
      ? createRavenVisual(THREE, visual, accent)
      : species === 'rune-sentinel'
        ? createSentinelVisual(THREE, visual, accent)
        : species === 'lantern-wisp'
          ? createWispVisual(THREE, visual, accent)
          : createDrakeVisual(THREE, visual, accent);

  const auraMaterial = glowMaterial(THREE, accent, 0.2);
  const aura = namedMesh(THREE, new THREE.RingGeometry(0.62, 0.93, IS_MOBILE ? 26 : 38), auraMaterial, 'MainMenuCompanionAura');
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.025;
  root.add(aura);
  const contact = namedMesh(THREE, new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), 'MainMenuCompanionContactShadow');
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(1, 0.52, 1);
  contact.position.y = 0.015;
  root.add(contact);

  return {
    root,
    species,
    update(now: number) {
      updateVisual(now);
      aura.rotation.z = now * 0.0005;
      aura.scale.setScalar(0.98 + Math.sin(now * 0.0027) * 0.035);
      auraMaterial.opacity = 0.17 + Math.sin(now * 0.0022) * 0.035;
    },
    dispose() {
      const geometries = new Set<any>();
      const materials = new Set<any>();
      root.traverse((node: any) => {
        if (node.geometry && !geometries.has(node.geometry)) {
          geometries.add(node.geometry);
          node.geometry.dispose?.();
        }
        const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
        nodeMaterials.filter(Boolean).forEach((material: any) => {
          if (materials.has(material)) return;
          materials.add(material);
          material.dispose?.();
        });
      });
    },
  };
}

function disposeScene(scene: any) {
  const geometries = new Set<any>();
  const materials = new Set<any>();
  scene?.traverse?.((node: any) => {
    if (node.geometry && !geometries.has(node.geometry)) {
      geometries.add(node.geometry);
      node.geometry.dispose?.();
    }
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.filter(Boolean).forEach((material: any) => {
      if (materials.has(material)) return;
      materials.add(material);
      material.map?.dispose?.();
      material.dispose?.();
    });
  });
}

function addHallArchitecture(THREE: any, scene: any) {
  const stone = standardMaterial(THREE, 0x17101f, 0x180b28, 0.24, 0.86);
  const trim = standardMaterial(THREE, 0x2b1a37, 0x34104f, 0.32, 0.72);
  for (const side of [-1, 1]) {
    for (const depth of [-4.45, -2.75]) {
      const column = new THREE.Group();
      column.name = 'MainMenuLiveGothicColumn';
      column.position.set(side * (depth < -4 ? 2.25 : 2.9), 0, depth);
      const shaft = namedMesh(THREE, new THREE.CylinderGeometry(0.2, 0.28, 3.7, 8), stone, 'MainMenuLiveColumnShaft');
      shaft.position.y = 1.85;
      column.add(shaft);
      const base = namedMesh(THREE, new THREE.CylinderGeometry(0.38, 0.45, 0.28, 8), trim, 'MainMenuLiveColumnBase');
      base.position.y = 0.14;
      column.add(base);
      const crown = namedMesh(THREE, new THREE.CylinderGeometry(0.38, 0.25, 0.32, 8), trim, 'MainMenuLiveColumnCrown');
      crown.position.y = 3.7;
      column.add(crown);
      scene.add(column);
    }
    const torch = namedMesh(THREE, new THREE.SphereGeometry(0.09, 10, 7), glowMaterial(THREE, 0xffad55, 0.72), 'MainMenuLiveTorchFlame');
    torch.position.set(side * 2.05, 2.25, -3.7);
    scene.add(torch);
    const torchLight = new THREE.PointLight(0xff9a4d, IS_MOBILE ? 1.25 : 1.6, 4.3, 2);
    torchLight.position.copy(torch.position);
    scene.add(torchLight);
  }
  for (let index = 0; index < 4; index += 1) {
    const step = namedMesh(THREE, new THREE.BoxGeometry(4.7 - index * 0.42, 0.16, 0.72), stone, 'MainMenuLivePortalStep');
    step.position.set(0, 0.08 + index * 0.13, -4.1 - index * 0.45);
    scene.add(step);
  }
}

export function LiveHybridMainMenuScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let playerRig: KayKitPlayerRig | null = null;
    let playerHolder: any = null;
    let companionRig: MenuCompanionRig | null = null;
    let companionLight: any = null;
    let portalGlow: any = null;
    let portalCore: any = null;
    let mist: any = null;
    let particles: any = null;
    let removeResize = () => {};
    let lastFrame = 0;
    let lastRigFrame = 0;
    let frameCount = 0;
    let THREE: any = null;

    host.dataset.rangerLoaded = 'false';
    host.dataset.animationState = 'booting';
    host.dataset.animationFrames = '0';
    host.dataset.companionSpecies = 'none';
    host.dataset.companionLevel = '0';

    const replaceCompanion = () => {
      if (!scene || !THREE) return;
      if (companionRig) {
        scene.remove(companionRig.root);
        companionRig.dispose();
        companionRig = null;
      }
      if (companionLight) {
        scene.remove(companionLight);
        companionLight = null;
      }
      const active = activeCompanionV5();
      if (!active) {
        host.dataset.companionSpecies = 'none';
        host.dataset.companionLevel = '0';
        return;
      }
      companionRig = createMenuCompanionRig(THREE, active.definition.species, active.definition.accentHex);
      companionRig.root.userData.companionLevel = active.level;
      const levelScale = 1 + Math.min(4, active.level - 1) * 0.025;
      companionRig.root.scale.setScalar((IS_MOBILE ? 0.62 : 0.68) * levelScale);
      scene.add(companionRig.root);
      companionLight = new THREE.PointLight(active.definition.accentHex, IS_MOBILE ? 1.45 : 1.9, 4.8, 2);
      companionLight.position.set(1.05, 1.45, -1.55);
      scene.add(companionLight);
      host.dataset.companionSpecies = active.definition.species;
      host.dataset.companionLevel = String(active.level);
    };

    const onCollectionChange = () => replaceCompanion();
    window.addEventListener(COMPANION_COLLECTION_EVENT, onCollectionChange);

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x08040e, 0.072);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.38 : 1.3;
      renderer.shadowMap.enabled = false;
      renderer.domElement.dataset.testid = 'live-hybrid-main-menu-canvas';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
      camera.position.set(0, 3.3, 8.5);
      camera.lookAt(0, 1.28, -2.05);

      const floor = namedMesh(THREE, new THREE.PlaneGeometry(11, 12), standardMaterial(THREE, 0x100b17, 0x160824, 0.25, 0.82), 'MainMenuLiveFloor');
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.02, -2.6);
      scene.add(floor);
      const aisle = namedMesh(THREE, new THREE.PlaneGeometry(3.45, 10), standardMaterial(THREE, 0x21122f, 0x310d4c, 0.38, 0.62), 'MainMenuLiveAisle');
      aisle.rotation.x = -Math.PI / 2;
      aisle.position.set(0, 0.005, -2.65);
      scene.add(aisle);
      addHallArchitecture(THREE, scene);

      portalGlow = namedMesh(THREE, new THREE.RingGeometry(1.22, 1.68, 52), glowMaterial(THREE, 0x9e65ff, 0.24), 'MainMenuLivePortalGlow');
      portalGlow.scale.y = 1.55;
      portalGlow.position.set(0, 2.45, -5.0);
      scene.add(portalGlow);
      portalCore = namedMesh(THREE, new THREE.CircleGeometry(1.2, 52), glowMaterial(THREE, 0x7c3aed, 0.11), 'MainMenuLivePortalCore');
      portalCore.scale.y = 1.55;
      portalCore.position.set(0, 2.45, -5.05);
      scene.add(portalCore);
      mist = namedMesh(THREE, new THREE.CircleGeometry(2.0, 40), glowMaterial(THREE, 0xb58cff, 0.08), 'MainMenuLiveMist');
      mist.rotation.x = -Math.PI / 2;
      mist.scale.set(1.5, 0.4, 1);
      mist.position.set(0, 0.08, -2.15);
      scene.add(mist);

      const particleCount = IS_MOBILE ? 48 : 82;
      const positions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 7.4;
        positions[index * 3 + 1] = Math.random() * 5.2 + 0.2;
        positions[index * 3 + 2] = -1 - Math.random() * 5.4;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xb58cff, size: IS_MOBILE ? 0.034 : 0.043, transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.AdditiveBlending }));
      particles.name = 'MainMenuLiveVeilParticles';
      scene.add(particles);

      const playerShadow = namedMesh(THREE, new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }), 'MainMenuPlayerContactShadow');
      playerShadow.rotation.x = -Math.PI / 2;
      playerShadow.scale.set(1.0, 0.54, 1);
      playerShadow.position.set(-0.1, 0.018, -1.75);
      scene.add(playerShadow);

      scene.add(new THREE.HemisphereLight(0x8f6bb4, 0x08040d, 1.18));
      scene.add(new THREE.AmbientLight(0x6d4b83, 0.46));
      const portalLight = new THREE.PointLight(0x9b5cff, IS_MOBILE ? 5.2 : 6.2, 13, 2);
      portalLight.position.set(0, 3.15, -4.3);
      scene.add(portalLight);
      const faceLight = new THREE.PointLight(0xffc98f, IS_MOBILE ? 2.6 : 3.1, 7, 2);
      faceLight.position.set(-1.75, 3.05, 0.55);
      scene.add(faceLight);
      const rimLight = new THREE.PointLight(0xb58cff, IS_MOBILE ? 2.7 : 3.3, 8, 2);
      rimLight.position.set(1.55, 2.75, -3.0);
      scene.add(rimLight);

      playerHolder = new THREE.Group();
      playerHolder.name = 'MainMenuLivePlayerHolder';
      playerHolder.position.set(-0.14, 0.12, 0.28);
      scene.add(playerHolder);
      replaceCompanion();

      try {
        const rig = await loadKayKitVillageArcher(THREE, GLTFLoader);
        if (disposed) {
          rig.stop();
          return;
        }
        playerRig = rig;
        playerHolder.add(rig.root);
        host.dataset.rangerLoaded = 'true';
        host.dataset.animationState = 'running';
      } catch (error) {
        host.dataset.rangerLoaded = 'failed';
        host.dataset.animationState = 'failed';
        console.error('Live hybrid menu Ranger failed to load', error);
      }

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        const portrait = camera.aspect < 0.72;
        camera.fov = portrait ? 34.5 : 30;
        camera.position.set(0, portrait ? 3.35 : 3.12, portrait ? 8.5 : 7.35);
        camera.lookAt(0, portrait ? 1.27 : 1.32, -2.0);
        if (playerHolder) playerHolder.scale.setScalar(portrait ? 1.38 : 1.5);
        if (companionRig) companionRig.root.scale.setScalar(portrait ? 0.64 : 0.74);
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
        frameCount += 1;
        if (frameCount % 5 === 0) host.dataset.animationFrames = String(frameCount);
        playerRig?.update(delta);
        companionRig?.update(now);
        if (portalGlow) {
          const pulse = Math.sin(now * 0.0018);
          portalGlow.material.opacity = 0.2 + pulse * 0.05;
          portalGlow.rotation.z = Math.sin(now * 0.00035) * 0.055;
          portalCore.material.opacity = 0.1 + pulse * 0.03;
          portalCore.scale.set(1 + pulse * 0.022, 1.55 + pulse * 0.036, 1);
          mist.material.opacity = 0.065 + Math.sin(now * 0.0012) * 0.02;
          mist.rotation.z = now * 0.00008;
          particles.rotation.y = Math.sin(now * 0.00018) * 0.08;
          particles.position.y = Math.sin(now * 0.0007) * 0.055;
        }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
    };

    void boot().catch(error => {
      host.dataset.animationState = 'failed';
      console.error('Live hybrid main menu failed to initialize', error);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      window.removeEventListener(COMPANION_COLLECTION_EVENT, onCollectionChange);
      playerRig?.stop();
      companionRig?.dispose();
      disposeScene(scene);
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div
    ref={hostRef}
    data-testid="live-hybrid-main-menu-scene"
    data-renderer="single-live-menu-canvas"
    data-ranger-loaded="false"
    data-animation-state="booting"
    data-animation-frames="0"
    data-companion-species="none"
    data-companion-level="0"
    className="pointer-events-none absolute inset-0"
  />;
}
