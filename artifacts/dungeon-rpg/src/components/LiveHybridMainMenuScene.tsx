import React, { useEffect, useRef } from 'react';
import {
  activeCompanionV5,
  COMPANION_COLLECTION_EVENT,
  type CompanionSpeciesV5,
} from '../game/companionCollectionV5';
import type { KayKitPlayerRig } from './kaykitPlayer3D';
import { loadKayKitVillageArcher } from './kaykitVillagePlayer3D';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type MenuCompanionRig = {
  root: any;
  species: CompanionSpeciesV5;
  update: (now: number) => void;
  dispose: () => void;
};

function standardMaterial(THREE: any, color: number, emissive: number, intensity: number, roughness = 0.68) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness, metalness: 0.08 });
}

function glowMaterial(THREE: any, color: number, opacity = 0.72) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function mesh(THREE: any, geometry: any, material: any, name: string) {
  const value = new THREE.Mesh(geometry, material);
  value.name = name;
  value.castShadow = false;
  value.receiveShadow = false;
  return value;
}

function createMenuCompanionRig(THREE: any, species: CompanionSpeciesV5, accent: number): MenuCompanionRig {
  const root = new THREE.Group();
  root.name = `MainMenuCompanion_${species}`;
  root.userData.companionSpecies = species;
  root.position.set(1.15, 0.12, -2.15);
  root.rotation.y = -0.22;
  root.scale.setScalar(IS_MOBILE ? 0.72 : 0.78);

  const dark = standardMaterial(THREE, 0x111019, 0x09050f, 0.28, 0.84);
  const body = standardMaterial(THREE, species === 'ember-raven' ? 0x21161c : 0x202332, accent, 0.34, 0.72);
  const rune = standardMaterial(THREE, accent, accent, 1.5, 0.24);
  const glow = glowMaterial(THREE, accent, 0.28);
  const pivots: any[] = [];
  let animatedBody: any = null;
  let tailPivot: any = null;
  let orbit: any = null;

  if (species === 'veil-lynx') {
    animatedBody = mesh(THREE, new THREE.DodecahedronGeometry(0.5, 1), body, 'MenuVeilLynxBody');
    animatedBody.scale.set(0.82, 0.62, 1.28);
    animatedBody.position.y = 0.86;
    root.add(animatedBody);
    const head = mesh(THREE, new THREE.DodecahedronGeometry(0.34, 1), body, 'MenuVeilLynxHead');
    head.position.set(0, 1.3, 0.72);
    root.add(head);
    const muzzle = mesh(THREE, new THREE.DodecahedronGeometry(0.16, 0), dark, 'MenuVeilLynxMuzzle');
    muzzle.scale.set(1.15, 0.65, 1.25);
    muzzle.position.set(0, 1.22, 1.0);
    root.add(muzzle);
    for (const side of [-1, 1]) {
      const ear = mesh(THREE, new THREE.ConeGeometry(0.14, 0.4, 5), body, 'MenuVeilLynxEar');
      ear.position.set(side * 0.2, 1.64, 0.7);
      ear.rotation.z = side * -0.12;
      root.add(ear);
      const eye = mesh(THREE, new THREE.SphereGeometry(0.045, 8, 6), rune, 'MenuVeilLynxEye');
      eye.position.set(side * 0.14, 1.38, 0.99);
      root.add(eye);
    }
    for (const [x, z, phase] of [[-0.29, 0.38, 0], [0.29, 0.38, Math.PI], [-0.29, -0.42, Math.PI], [0.29, -0.42, 0]] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.66, z);
      pivot.userData.phase = phase;
      const leg = mesh(THREE, new THREE.CylinderGeometry(0.08, 0.11, 0.56, 7), dark, 'MenuVeilLynxLeg');
      leg.position.y = -0.28;
      pivot.add(leg);
      root.add(pivot);
      pivots.push(pivot);
    }
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.98, -0.62);
    const tail = mesh(THREE, new THREE.CylinderGeometry(0.07, 0.12, 1.12, 8), body, 'MenuVeilLynxTail');
    tail.rotation.x = Math.PI / 2.7;
    tail.position.set(0, 0.2, -0.38);
    tailPivot.add(tail);
    root.add(tailPivot);
  } else if (species === 'ember-raven') {
    root.position.set(1.2, 0.5, -2.15);
    animatedBody = mesh(THREE, new THREE.DodecahedronGeometry(0.42, 1), body, 'MenuEmberRavenBody');
    animatedBody.scale.set(0.72, 0.94, 1.0);
    root.add(animatedBody);
    const head = mesh(THREE, new THREE.DodecahedronGeometry(0.27, 1), body, 'MenuEmberRavenHead');
    head.position.set(0, 0.42, 0.44);
    root.add(head);
    const beak = mesh(THREE, new THREE.ConeGeometry(0.12, 0.44, 5), rune, 'MenuEmberRavenBeak');
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.37, 0.74);
    root.add(beak);
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, 0.06, 0);
      const wing = mesh(THREE, new THREE.ConeGeometry(0.5, 1.2, 5), body, 'MenuEmberRavenWing');
      wing.rotation.z = side * Math.PI / 2;
      wing.position.x = side * 0.47;
      pivot.add(wing);
      root.add(pivot);
      pivots.push(pivot);
    }
  } else if (species === 'rune-sentinel') {
    root.position.set(1.12, 0.08, -2.18);
    root.scale.setScalar(IS_MOBILE ? 0.64 : 0.7);
    animatedBody = mesh(THREE, new THREE.BoxGeometry(0.86, 1.0, 0.62), body, 'MenuRuneSentinelTorso');
    animatedBody.position.y = 1.08;
    root.add(animatedBody);
    const head = mesh(THREE, new THREE.DodecahedronGeometry(0.32, 0), dark, 'MenuRuneSentinelHead');
    head.position.set(0, 1.78, 0.12);
    root.add(head);
    const face = mesh(THREE, new THREE.OctahedronGeometry(0.12, 0), rune, 'MenuRuneSentinelFaceRune');
    face.position.set(0, 1.78, 0.42);
    root.add(face);
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.58, 1.42, 0);
      const arm = mesh(THREE, new THREE.BoxGeometry(0.28, 0.82, 0.32), body, 'MenuRuneSentinelArm');
      arm.position.y = -0.35;
      pivot.add(arm);
      root.add(pivot);
      pivots.push(pivot);
      const leg = mesh(THREE, new THREE.BoxGeometry(0.34, 0.76, 0.38), dark, 'MenuRuneSentinelLeg');
      leg.position.set(side * 0.28, 0.4, 0);
      root.add(leg);
    }
  } else if (species === 'lantern-wisp') {
    root.position.set(1.16, 0.66, -2.15);
    animatedBody = mesh(THREE, new THREE.SphereGeometry(0.42, 16, 12), glow, 'MenuLanternWispBody');
    root.add(animatedBody);
    const core = mesh(THREE, new THREE.OctahedronGeometry(0.22, 0), rune, 'MenuLanternWispCore');
    root.add(core);
    orbit = new THREE.Group();
    for (let index = 0; index < 3; index += 1) {
      const spark = mesh(THREE, new THREE.OctahedronGeometry(0.07, 0), rune, 'MenuLanternWispSpark');
      const angle = index * Math.PI * 2 / 3;
      spark.position.set(Math.cos(angle) * 0.66, Math.sin(angle * 2) * 0.16, Math.sin(angle) * 0.66);
      orbit.add(spark);
    }
    root.add(orbit);
  } else {
    root.position.set(1.15, 0.22, -2.2);
    root.scale.setScalar(IS_MOBILE ? 0.58 : 0.64);
    animatedBody = mesh(THREE, new THREE.DodecahedronGeometry(0.55, 1), body, 'MenuDuskDrakeBody');
    animatedBody.scale.set(0.82, 0.68, 1.32);
    animatedBody.position.y = 0.9;
    root.add(animatedBody);
    const head = mesh(THREE, new THREE.DodecahedronGeometry(0.34, 1), body, 'MenuDuskDrakeHead');
    head.position.set(0, 1.28, 0.82);
    root.add(head);
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.42, 1.05, 0);
      const wing = mesh(THREE, new THREE.ConeGeometry(0.58, 1.32, 4), body, 'MenuDuskDrakeWing');
      wing.rotation.z = side * Math.PI / 2;
      wing.position.x = side * 0.5;
      pivot.add(wing);
      root.add(pivot);
      pivots.push(pivot);
      const eye = mesh(THREE, new THREE.SphereGeometry(0.045, 8, 6), rune, 'MenuDuskDrakeEye');
      eye.position.set(side * 0.14, 1.37, 1.1);
      root.add(eye);
    }
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.88, -0.7);
    const tail = mesh(THREE, new THREE.CylinderGeometry(0.07, 0.14, 1.35, 8), body, 'MenuDuskDrakeTail');
    tail.rotation.x = Math.PI / 2.6;
    tail.position.z = -0.5;
    tailPivot.add(tail);
    root.add(tailPivot);
  }

  const aura = mesh(THREE, new THREE.RingGeometry(0.62, 0.98, IS_MOBILE ? 24 : 36), glow, 'MainMenuCompanionAura');
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.025;
  root.add(aura);

  return {
    root,
    species,
    update(now: number) {
      const idle = Math.sin(now * 0.0026);
      aura.rotation.z = now * 0.00045;
      aura.scale.setScalar(0.96 + idle * 0.045);
      glow.opacity = 0.22 + idle * 0.055;
      if (animatedBody) animatedBody.rotation.y = Math.sin(now * 0.0012) * 0.035;
      if (species === 'veil-lynx') {
        root.position.y = 0.12 + idle * 0.018;
        pivots.forEach(pivot => { pivot.rotation.x = Math.sin(now * 0.002 + pivot.userData.phase) * 0.035; });
        if (tailPivot) tailPivot.rotation.y = Math.sin(now * 0.0032) * 0.35;
      } else if (species === 'ember-raven') {
        root.position.y = 0.5 + idle * 0.11;
        if (pivots[0]) pivots[0].rotation.z = 0.2 + Math.sin(now * 0.007) * 0.34;
        if (pivots[1]) pivots[1].rotation.z = -0.2 - Math.sin(now * 0.007) * 0.34;
      } else if (species === 'rune-sentinel') {
        root.position.y = 0.08 + Math.abs(idle) * 0.012;
        pivots.forEach((pivot, index) => { pivot.rotation.z = (index ? -1 : 1) * (0.04 + idle * 0.025); });
      } else if (species === 'lantern-wisp') {
        root.position.y = 0.66 + idle * 0.13;
        if (orbit) orbit.rotation.y = now * 0.0018;
      } else {
        root.position.y = 0.22 + idle * 0.045;
        if (pivots[0]) pivots[0].rotation.z = 0.18 + Math.sin(now * 0.0045) * 0.18;
        if (pivots[1]) pivots[1].rotation.z = -0.18 - Math.sin(now * 0.0045) * 0.18;
        if (tailPivot) tailPivot.rotation.y = Math.sin(now * 0.0028) * 0.28;
      }
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

    const replaceCompanion = () => {
      if (!scene || !THREE) return;
      if (companionRig) {
        scene.remove(companionRig.root);
        companionRig.dispose();
        companionRig = null;
      }
      if (companionLight) {
        scene.remove(companionLight);
        companionLight.dispose?.();
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
      companionRig.root.scale.multiplyScalar(1 + Math.min(4, active.level - 1) * 0.035);
      scene.add(companionRig.root);
      companionLight = new THREE.PointLight(active.definition.accentHex, IS_MOBILE ? 1.8 : 2.3, 5.5, 2);
      companionLight.position.set(1.15, 1.5, -1.7);
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
      scene.fog = new THREE.FogExp2(0x090510, 0.075);

      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.35 : 1.28;
      renderer.shadowMap.enabled = false;
      renderer.domElement.dataset.testid = 'live-hybrid-main-menu-canvas';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
      camera.position.set(0, 3.35, 8.8);
      camera.lookAt(0, 1.25, -2.1);

      const floor = mesh(THREE, new THREE.PlaneGeometry(10, 12), standardMaterial(THREE, 0x120d18, 0x130820, 0.3, 0.74), 'MainMenuLiveFloor');
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.02, -2.7);
      scene.add(floor);

      const aisle = mesh(THREE, new THREE.PlaneGeometry(3.2, 10), standardMaterial(THREE, 0x221330, 0x2e0d4e, 0.42, 0.58), 'MainMenuLiveAisle');
      aisle.rotation.x = -Math.PI / 2;
      aisle.position.set(0, 0.005, -2.7);
      scene.add(aisle);

      const portalMaterial = glowMaterial(THREE, 0x9e65ff, 0.24);
      portalGlow = mesh(THREE, new THREE.RingGeometry(1.25, 1.7, 48), portalMaterial, 'MainMenuLivePortalGlow');
      portalGlow.scale.y = 1.55;
      portalGlow.position.set(0, 2.45, -5.0);
      scene.add(portalGlow);

      const portalCoreMaterial = glowMaterial(THREE, 0x7c3aed, 0.12);
      portalCore = mesh(THREE, new THREE.CircleGeometry(1.23, 48), portalCoreMaterial, 'MainMenuLivePortalCore');
      portalCore.scale.y = 1.55;
      portalCore.position.set(0, 2.45, -5.05);
      scene.add(portalCore);

      const mistMaterial = glowMaterial(THREE, 0xb58cff, 0.09);
      mist = mesh(THREE, new THREE.CircleGeometry(2.0, 40), mistMaterial, 'MainMenuLiveMist');
      mist.rotation.x = -Math.PI / 2;
      mist.scale.set(1.5, 0.4, 1);
      mist.position.set(0, 0.08, -2.25);
      scene.add(mist);

      const particleCount = IS_MOBILE ? 52 : 86;
      const positions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 7.2;
        positions[index * 3 + 1] = Math.random() * 5.2 + 0.2;
        positions[index * 3 + 2] = -1 - Math.random() * 5.5;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({ color: 0xb58cff, size: IS_MOBILE ? 0.035 : 0.045, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
      particles = new THREE.Points(particleGeometry, particleMaterial);
      particles.name = 'MainMenuLiveVeilParticles';
      scene.add(particles);

      const playerShadow = mesh(THREE, new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }), 'MainMenuPlayerContactShadow');
      playerShadow.rotation.x = -Math.PI / 2;
      playerShadow.scale.set(1.0, 0.55, 1);
      playerShadow.position.set(-0.1, 0.018, -1.9);
      scene.add(playerShadow);

      scene.add(new THREE.HemisphereLight(0x8f6bb4, 0x09050d, 1.2));
      scene.add(new THREE.AmbientLight(0x6d4b83, 0.48));
      const portalLight = new THREE.PointLight(0x9b5cff, IS_MOBILE ? 5.4 : 6.4, 13, 2);
      portalLight.position.set(0, 3.2, -4.3);
      scene.add(portalLight);
      const faceLight = new THREE.PointLight(0xffc98f, IS_MOBILE ? 2.5 : 3.0, 7, 2);
      faceLight.position.set(-1.8, 3.25, 0.6);
      scene.add(faceLight);
      const rimLight = new THREE.PointLight(0xb58cff, IS_MOBILE ? 2.8 : 3.4, 8, 2);
      rimLight.position.set(1.65, 2.8, -3.2);
      scene.add(rimLight);

      playerHolder = new THREE.Group();
      playerHolder.name = 'MainMenuLivePlayerHolder';
      playerHolder.position.set(-0.12, 0.12, 0.15);
      playerHolder.scale.setScalar(IS_MOBILE ? 1.36 : 1.28);
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
        camera.fov = portrait ? 34.5 : 31;
        camera.position.set(0, portrait ? 3.38 : 3.05, portrait ? 8.65 : 8.25);
        camera.lookAt(0, portrait ? 1.28 : 1.35, -2.05);
        if (playerHolder) playerHolder.scale.setScalar(portrait ? 1.38 : 1.22);
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
        if (frameCount % 15 === 0) host.dataset.animationFrames = String(frameCount);
        playerRig?.update(delta);
        companionRig?.update(now);
        if (portalGlow) {
          const pulse = Math.sin(now * 0.0018);
          portalGlow.material.opacity = 0.2 + pulse * 0.055;
          portalGlow.rotation.z = Math.sin(now * 0.00035) * 0.06;
          portalCore.material.opacity = 0.1 + pulse * 0.035;
          portalCore.scale.set(1 + pulse * 0.025, 1.55 + pulse * 0.04, 1);
          mist.material.opacity = 0.07 + Math.sin(now * 0.0012) * 0.025;
          mist.rotation.z = now * 0.00008;
          particles.rotation.y = Math.sin(now * 0.00018) * 0.08;
          particles.position.y = Math.sin(now * 0.0007) * 0.06;
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
