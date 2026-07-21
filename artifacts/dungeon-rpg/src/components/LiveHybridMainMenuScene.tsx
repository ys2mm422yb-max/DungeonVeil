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

function standardMaterial(THREE: any, color: number, emissive = 0x000000, intensity = 0, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness,
    metalness: 0.06,
  });
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
  const fur = standardMaterial(THREE, 0x24384a, accent, 0.18, 0.76);
  const dark = standardMaterial(THREE, 0x101823, 0x07101a, 0.2, 0.86);
  const pale = standardMaterial(THREE, 0x86acc0, accent, 0.14, 0.72);
  const rune = standardMaterial(THREE, accent, accent, 1.35, 0.24);
  const eye = glowMaterial(THREE, 0xeaffff, 0.9);

  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.5, 1), fur, 'MenuVeilLynxBody');
  body.scale.set(0.8, 0.56, 1.13);
  body.position.y = 0.77;
  visual.add(body);

  const chest = namedMesh(THREE, new THREE.DodecahedronGeometry(0.34, 1), pale, 'MenuVeilLynxChest');
  chest.scale.set(0.74, 0.88, 0.68);
  chest.position.set(0, 0.91, 0.4);
  visual.add(chest);

  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.33, 1), fur, 'MenuVeilLynxHead');
  head.scale.set(0.94, 0.84, 0.92);
  head.position.set(0, 1.24, 0.7);
  visual.add(head);

  for (const side of [-1, 1]) {
    const ear = namedMesh(THREE, new THREE.ConeGeometry(0.13, 0.38, 5), fur, 'MenuVeilLynxEar');
    ear.position.set(side * 0.2, 1.55, 0.7);
    ear.rotation.z = side * -0.1;
    visual.add(ear);
  }
  addEyes(THREE, visual, eye, 1.31, 0.96, 0.13);

  const nose = namedMesh(THREE, new THREE.OctahedronGeometry(0.065, 0), dark, 'MenuVeilLynxNose');
  nose.position.set(0, 1.19, 1.05);
  visual.add(nose);

  const legPivots: any[] = [];
  for (const [x, z, phase] of [[-0.27, 0.34, 0], [0.27, 0.34, Math.PI], [-0.27, -0.34, Math.PI], [0.27, -0.34, 0]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.58, z);
    pivot.userData.phase = phase;
    const leg = namedMesh(THREE, new THREE.CylinderGeometry(0.07, 0.1, 0.48, 7), dark, 'MenuVeilLynxLeg');
    leg.position.y = -0.24;
    pivot.add(leg);
    const paw = namedMesh(THREE, new THREE.SphereGeometry(0.11, 9, 6), fur, 'MenuVeilLynxPaw');
    paw.scale.set(1.06, 0.48, 1.32);
    paw.position.set(0, -0.48, 0.05);
    pivot.add(paw);
    visual.add(pivot);
    legPivots.push(pivot);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.9, -0.54);
  const tail = namedMesh(THREE, new THREE.CylinderGeometry(0.065, 0.11, 1.02, 8), fur, 'MenuVeilLynxTail');
  tail.rotation.x = Math.PI / 2.7;
  tail.position.set(0, 0.18, -0.36);
  tailPivot.add(tail);
  visual.add(tailPivot);

  const crest = namedMesh(THREE, new THREE.OctahedronGeometry(0.09, 0), rune, 'MenuVeilLynxRune');
  crest.position.set(0, 1.43, 0.54);
  visual.add(crest);

  return (now: number) => {
    const idle = Math.sin(now * 0.0028);
    visual.position.y = 0.025 + idle * 0.016;
    head.rotation.y = Math.sin(now * 0.0014) * 0.05;
    legPivots.forEach(pivot => { pivot.rotation.x = Math.sin(now * 0.0018 + pivot.userData.phase) * 0.026; });
    tailPivot.rotation.y = Math.sin(now * 0.0031) * 0.4;
    crest.rotation.y = now * 0.0018;
  };
}

function createRavenVisual(THREE: any, visual: any, accent: number) {
  const feather = standardMaterial(THREE, 0x211824, 0x32130a, 0.32, 0.78);
  const ember = standardMaterial(THREE, accent, accent, 1.45, 0.22);
  const eye = glowMaterial(THREE, 0xfff0cf, 0.92);

  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.42, 1), feather, 'MenuEmberRavenBody');
  body.scale.set(0.7, 0.94, 1.0);
  visual.add(body);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.27, 1), feather, 'MenuEmberRavenHead');
  head.position.set(0, 0.4, 0.4);
  visual.add(head);
  const beak = namedMesh(THREE, new THREE.ConeGeometry(0.11, 0.42, 5), ember, 'MenuEmberRavenBeak');
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.34, 0.72);
  visual.add(beak);
  addEyes(THREE, visual, eye, 0.47, 0.64, 0.11);

  const wings: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.29, 0.03, 0);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.45, 1.02, 5), feather, 'MenuEmberRavenWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.position.x = side * 0.4;
    pivot.add(wing);
    visual.add(pivot);
    wings.push(pivot);
  }

  return (now: number) => {
    const flap = Math.sin(now * 0.0075);
    visual.position.y = 0.85 + Math.sin(now * 0.003) * 0.09;
    wings[0].rotation.z = 0.18 + flap * 0.38;
    wings[1].rotation.z = -0.18 - flap * 0.38;
  };
}

function createSentinelVisual(THREE: any, visual: any, accent: number) {
  const stone = standardMaterial(THREE, 0x26312f, 0x0a2419, 0.3, 0.9);
  const rune = standardMaterial(THREE, accent, accent, 1.45, 0.22);

  const torso = namedMesh(THREE, new THREE.BoxGeometry(0.76, 0.88, 0.56), stone, 'MenuRuneSentinelTorso');
  torso.position.y = 0.92;
  visual.add(torso);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.3, 0), stone, 'MenuRuneSentinelHead');
  head.position.set(0, 1.55, 0.1);
  visual.add(head);
  const face = namedMesh(THREE, new THREE.OctahedronGeometry(0.09, 0), rune, 'MenuRuneSentinelFaceRune');
  face.position.set(0, 1.55, 0.39);
  visual.add(face);

  const arms: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.51, 1.2, 0);
    const arm = namedMesh(THREE, new THREE.BoxGeometry(0.25, 0.7, 0.28), stone, 'MenuRuneSentinelArm');
    arm.position.y = -0.31;
    pivot.add(arm);
    const fist = namedMesh(THREE, new THREE.DodecahedronGeometry(0.18, 0), rune, 'MenuRuneSentinelFist');
    fist.position.y = -0.68;
    pivot.add(fist);
    visual.add(pivot);
    arms.push(pivot);
  }
  for (const side of [-1, 1]) {
    const leg = namedMesh(THREE, new THREE.BoxGeometry(0.29, 0.61, 0.33), stone, 'MenuRuneSentinelLeg');
    leg.position.set(side * 0.23, 0.31, 0);
    visual.add(leg);
  }

  return (now: number) => {
    const idle = Math.sin(now * 0.0024);
    visual.position.y = 0.02 + Math.abs(idle) * 0.014;
    arms[0].rotation.z = 0.04 + idle * 0.025;
    arms[1].rotation.z = -0.04 - idle * 0.025;
    face.rotation.y = now * 0.0014;
  };
}

function createWispVisual(THREE: any, visual: any, accent: number) {
  const shell = standardMaterial(THREE, 0x3d3820, accent, 0.82, 0.3);
  const core = namedMesh(THREE, new THREE.IcosahedronGeometry(0.37, 1), shell, 'MenuLanternWispCore');
  visual.add(core);
  const inner = namedMesh(THREE, new THREE.SphereGeometry(0.21, 12, 8), glowMaterial(THREE, 0xfff1a3, 0.84), 'MenuLanternWispInnerLight');
  visual.add(inner);
  const orbit = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const shard = namedMesh(THREE, new THREE.OctahedronGeometry(0.09, 0), standardMaterial(THREE, accent, accent, 1.3, 0.22), 'MenuLanternWispShard');
    const angle = index / 5 * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 0.6, Math.sin(angle * 2) * 0.13, Math.sin(angle) * 0.6);
    orbit.add(shard);
  }
  visual.add(orbit);
  const veil = namedMesh(THREE, new THREE.ConeGeometry(0.31, 0.88, 8, 1, true), glowMaterial(THREE, accent, 0.17), 'MenuLanternWispVeil');
  veil.position.y = -0.48;
  veil.rotation.x = Math.PI;
  visual.add(veil);

  return (now: number) => {
    visual.position.y = 0.9 + Math.sin(now * 0.0037) * 0.13;
    orbit.rotation.y = now * 0.0024;
    inner.scale.setScalar(1 + Math.sin(now * 0.006) * 0.075);
  };
}

function createDrakeVisual(THREE: any, visual: any, accent: number) {
  const scale = standardMaterial(THREE, 0x2d2040, 0x2b0f4d, 0.4, 0.7);
  const dark = standardMaterial(THREE, 0x15121d, 0x140824, 0.2, 0.84);
  const flame = standardMaterial(THREE, accent, accent, 1.45, 0.22);

  const body = namedMesh(THREE, new THREE.DodecahedronGeometry(0.46, 1), scale, 'MenuDuskDrakeBody');
  body.scale.set(0.78, 0.62, 1.13);
  body.position.y = 0.74;
  visual.add(body);
  const head = namedMesh(THREE, new THREE.DodecahedronGeometry(0.31, 1), scale, 'MenuDuskDrakeHead');
  head.scale.set(0.9, 0.75, 1.08);
  head.position.set(0, 1.22, 0.77);
  visual.add(head);
  const snout = namedMesh(THREE, new THREE.BoxGeometry(0.31, 0.19, 0.38), dark, 'MenuDuskDrakeSnout');
  snout.position.set(0, 1.16, 1.05);
  visual.add(snout);
  addEyes(THREE, visual, glowMaterial(THREE, 0xf8efff, 0.92), 1.31, 0.97, 0.12);

  const wings: any[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.29, 0.94, -0.04);
    const wing = namedMesh(THREE, new THREE.ConeGeometry(0.44, 1.02, 4), scale, 'MenuDuskDrakeWing');
    wing.rotation.z = side * Math.PI / 2;
    wing.position.x = side * 0.43;
    pivot.add(wing);
    visual.add(pivot);
    wings.push(pivot);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.82, -0.54);
  const tail = namedMesh(THREE, new THREE.ConeGeometry(0.13, 1.06, 8), scale, 'MenuDuskDrakeTail');
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.47;
  tailPivot.add(tail);
  visual.add(tailPivot);

  const flameTip = namedMesh(THREE, new THREE.ConeGeometry(0.09, 0.31, 6), flame, 'MenuDuskDrakeVeilfire');
  flameTip.rotation.x = -Math.PI / 2;
  flameTip.position.set(0, 1.15, 1.33);
  visual.add(flameTip);

  return (now: number) => {
    const flap = Math.sin(now * 0.0055);
    visual.position.y = 0.04 + Math.sin(now * 0.0028) * 0.023;
    wings[0].rotation.z = 0.18 + flap * 0.19;
    wings[1].rotation.z = -0.18 - flap * 0.19;
    tailPivot.rotation.y = Math.sin(now * 0.003) * 0.32;
    flameTip.scale.setScalar(1 + Math.sin(now * 0.007) * 0.11);
  };
}

function createMenuCompanionRig(THREE: any, species: CompanionSpeciesV5, accent: number): MenuCompanionRig {
  const root = new THREE.Group();
  root.name = `MainMenuCompanion_${species}`;
  root.userData.companionSpecies = species;
  root.position.set(1.02, 0.08, -1.35);
  root.rotation.y = -0.16;

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

  const auraMaterial = glowMaterial(THREE, accent, 0.13);
  const aura = namedMesh(THREE, new THREE.RingGeometry(0.55, 0.76, IS_MOBILE ? 24 : 34), auraMaterial, 'MainMenuCompanionAura');
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.024;
  root.add(aura);
  const contact = namedMesh(THREE, new THREE.CircleGeometry(0.55, 26), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }), 'MainMenuCompanionContactShadow');
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(1, 0.52, 1);
  contact.position.y = 0.014;
  root.add(contact);

  return {
    root,
    species,
    update(now: number) {
      updateVisual(now);
      aura.rotation.z = now * 0.0005;
      aura.scale.setScalar(0.98 + Math.sin(now * 0.0027) * 0.032);
      auraMaterial.opacity = 0.11 + Math.sin(now * 0.0022) * 0.025;
    },
    dispose() {
      disposeObject(root);
    },
  };
}

function disposeObject(root: any) {
  const geometries = new Set<any>();
  const materials = new Set<any>();
  root?.traverse?.((node: any) => {
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

export function LiveHybridMainMenuScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let playerRig: KayKitPlayerRig | null = null;
    let playerHolder: any = null;
    let playerShadow: any = null;
    let companionRig: MenuCompanionRig | null = null;
    let companionLight: any = null;
    let veilHaze: any = null;
    let backLight: any = null;
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

    const applyResponsiveScale = () => {
      if (!camera || !renderer) return;
      const width = host.clientWidth || innerWidth;
      const height = host.clientHeight || innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      const portrait = camera.aspect < 0.72;
      camera.fov = portrait ? 34 : 29;
      camera.position.set(0, portrait ? 3.28 : 3.05, portrait ? 8.25 : 7.2);
      camera.lookAt(0, portrait ? 1.23 : 1.3, -1.55);
      if (playerHolder) playerHolder.scale.setScalar(portrait ? 1.28 : 1.42);
      if (companionRig) companionRig.root.scale.setScalar(portrait ? 0.6 : 0.68);
      camera.updateProjectionMatrix();
    };

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
      const levelScale = 1 + Math.min(4, active.level - 1) * 0.022;
      companionRig.root.scale.setScalar((IS_MOBILE ? 0.6 : 0.68) * levelScale);
      scene.add(companionRig.root);
      companionLight = new THREE.PointLight(active.definition.accentHex, IS_MOBILE ? 1.15 : 1.5, 4.1, 2);
      companionLight.position.set(1.05, 1.35, -0.9);
      scene.add(companionLight);
      host.dataset.companionSpecies = active.definition.species;
      host.dataset.companionLevel = String(active.level);
    };

    const onCollectionChange = () => {
      replaceCompanion();
      applyResponsiveScale();
    };
    window.addEventListener(COMPANION_COLLECTION_EVENT, onCollectionChange);

    const boot = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
      if (disposed) return;

      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.55 : 1.42;
      renderer.shadowMap.enabled = false;
      renderer.domElement.dataset.testid = 'live-hybrid-main-menu-canvas';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.imageRendering = 'auto';
      host.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
      camera.position.set(0, 3.28, 8.25);
      camera.lookAt(0, 1.23, -1.55);

      const floor = namedMesh(THREE, new THREE.PlaneGeometry(5.8, 5.2), standardMaterial(THREE, 0x130b1d, 0x1a092b, 0.2, 0.86), 'MainMenuLiveCharacterFloor');
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.025, -0.75);
      scene.add(floor);

      veilHaze = namedMesh(THREE, new THREE.CircleGeometry(1.65, 36), glowMaterial(THREE, 0x8d5ad8, 0.035), 'MainMenuLiveGroundHaze');
      veilHaze.rotation.x = -Math.PI / 2;
      veilHaze.scale.set(1.35, 0.38, 1);
      veilHaze.position.set(0, 0.025, -0.95);
      scene.add(veilHaze);

      playerShadow = namedMesh(THREE, new THREE.CircleGeometry(0.68, 30), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }), 'MainMenuPlayerContactShadow');
      playerShadow.rotation.x = -Math.PI / 2;
      playerShadow.scale.set(1.05, 0.5, 1);
      playerShadow.position.set(-0.12, 0.018, -0.58);
      scene.add(playerShadow);

      const particleCount = IS_MOBILE ? 28 : 46;
      const positions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 4.8;
        positions[index * 3 + 1] = Math.random() * 3.5 + 0.15;
        positions[index * 3 + 2] = -0.2 - Math.random() * 3.2;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
        color: 0xb99aff,
        size: IS_MOBILE ? 0.026 : 0.034,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      particles.name = 'MainMenuLiveVeilParticles';
      scene.add(particles);

      scene.add(new THREE.HemisphereLight(0xbfa4e8, 0x09050d, IS_MOBILE ? 1.65 : 1.5));
      scene.add(new THREE.AmbientLight(0x9a77ac, IS_MOBILE ? 0.72 : 0.62));

      backLight = new THREE.PointLight(0x8651d2, IS_MOBILE ? 2.0 : 2.4, 9.5, 2);
      backLight.position.set(0, 2.8, -3.5);
      scene.add(backLight);

      const keyLight = new THREE.PointLight(0xffd3a0, IS_MOBILE ? 4.8 : 4.35, 7.5, 2);
      keyLight.position.set(-1.55, 3.0, 1.35);
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(0x9fc8ff, IS_MOBILE ? 1.55 : 1.8, 6.2, 2);
      fillLight.position.set(1.65, 2.15, 0.2);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(0xb58cff, IS_MOBILE ? 1.85 : 2.2, 7.2, 2);
      rimLight.position.set(1.2, 2.65, -2.1);
      scene.add(rimLight);

      playerHolder = new THREE.Group();
      playerHolder.name = 'MainMenuLivePlayerHolder';
      playerHolder.position.set(-0.16, 0.08, -0.28);
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

      const resize = () => applyResponsiveScale();
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
        const pulse = Math.sin(now * 0.0018);
        if (backLight) backLight.intensity = (IS_MOBILE ? 1.9 : 2.3) + pulse * 0.25;
        if (veilHaze) {
          veilHaze.material.opacity = 0.03 + Math.sin(now * 0.00125) * 0.008;
          veilHaze.rotation.z = now * 0.00006;
        }
        if (particles) {
          particles.rotation.y = Math.sin(now * 0.00018) * 0.065;
          particles.position.y = Math.sin(now * 0.0007) * 0.04;
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
      disposeObject(scene);
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
