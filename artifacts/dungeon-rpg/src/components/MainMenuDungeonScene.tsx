import React, { useEffect, useRef } from 'react';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function buildVeilWorldOrb(THREE: any) {
  const root = new THREE.Group();
  root.name = 'VeilWorldOrb';

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.82, 36),
    new THREE.MeshBasicMaterial({ color: 0x050609, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.56;
  shadow.scale.y = 0.42;
  root.add(shadow);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.18, 0.44, 24),
    new THREE.MeshStandardMaterial({ color: 0x55422c, roughness: 0.8, metalness: 0.14 }),
  );
  pedestal.position.y = -1.34;
  root.add(pedestal);

  const pedestalTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.075, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xd1a759, emissive: 0x3b2306, emissiveIntensity: 0.28, roughness: 0.46, metalness: 0.5 }),
  );
  pedestalTrim.rotation.x = Math.PI / 2;
  pedestalTrim.position.y = -1.12;
  root.add(pedestalTrim);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1.48, IS_MOBILE ? 28 : 42, IS_MOBILE ? 20 : 30),
    new THREE.MeshStandardMaterial({
      color: 0x436b83,
      emissive: 0x172d46,
      emissiveIntensity: 0.66,
      roughness: 0.42,
      metalness: 0.08,
      transparent: true,
      opacity: 0.96,
    }),
  );
  globe.name = 'VeilWorldGlobe';
  root.add(globe);

  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.34, IS_MOBILE ? 24 : 34, IS_MOBILE ? 18 : 26),
    new THREE.MeshBasicMaterial({ color: 0x6f77dc, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  root.add(innerGlow);

  const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xb8d7e5, transparent: true, opacity: 0.2, depthWrite: false });
  const latitudeRings: any[] = [];
  for (const y of [-0.82, -0.4, 0, 0.4, 0.82]) {
    const radius = Math.sqrt(Math.max(0.12, 1.48 * 1.48 - y * y));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, IS_MOBILE ? 30 : 44), gridMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    root.add(ring);
    latitudeRings.push(ring);
  }

  const longitudeRings: any[] = [];
  for (const rotation of [0, Math.PI / 3, -Math.PI / 3]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.49, 0.018, 5, IS_MOBILE ? 30 : 44), gridMaterial);
    ring.rotation.y = rotation;
    root.add(ring);
    longitudeRings.push(ring);
  }

  const landMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6b768,
    emissive: 0x3f2907,
    emissiveIntensity: 0.34,
    roughness: 0.72,
    metalness: 0.08,
  });
  const landMasses: any[] = [];
  const landDefinitions: Array<[number, number, number, number, number, number]> = [
    [-0.62, 0.44, 1.32, 0.46, 0.24, -0.2],
    [0.72, 0.08, 1.28, 0.34, 0.2, 0.28],
    [-0.12, -0.66, 1.32, 0.28, 0.18, 0.55],
    [0.52, 0.72, 1.16, 0.22, 0.16, -0.48],
  ];
  landDefinitions.forEach(([x, y, z, sx, sy, rz], index) => {
    const land = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), landMaterial);
    land.position.set(x, y, z);
    land.scale.set(sx, sy, 0.09 + index * 0.006);
    land.rotation.z = rz;
    root.add(land);
    landMasses.push(land);
  });

  const veilRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.86, 0.07, 8, IS_MOBILE ? 38 : 56),
    new THREE.MeshBasicMaterial({ color: 0xa68cff, transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  veilRing.rotation.x = Math.PI / 2.45;
  veilRing.rotation.z = -0.16;
  root.add(veilRing);

  const horizonRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.035, 6, IS_MOBILE ? 36 : 52),
    new THREE.MeshBasicMaterial({ color: 0xf2c778, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  horizonRing.rotation.x = Math.PI / 2;
  root.add(horizonRing);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.72, 2.24, IS_MOBILE ? 44 : 64),
    new THREE.MeshBasicMaterial({ color: 0x8167d9, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.position.z = -0.48;
  root.add(halo);

  const moteCount = IS_MOBILE ? 8 : 13;
  const motes: any[] = [];
  for (let index = 0; index < moteCount; index++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(index % 3 === 0 ? 0.045 : 0.03, 6, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xd8c5ff : 0xffd38a, transparent: true, opacity: 0.74, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mote.userData.phase = index / moteCount * Math.PI * 2;
    root.add(mote);
    motes.push(mote);
  }

  root.userData.globe = globe;
  root.userData.innerGlow = innerGlow;
  root.userData.latitudeRings = latitudeRings;
  root.userData.longitudeRings = longitudeRings;
  root.userData.landMasses = landMasses;
  root.userData.veilRing = veilRing;
  root.userData.horizonRing = horizonRing;
  root.userData.halo = halo;
  root.userData.motes = motes;
  return root;
}

function buildVillageNpc(THREE: any, clothColor: number, accentColor: number, phase: number) {
  const root = new THREE.Group();
  root.userData.phase = phase;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.92, 10),
    new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.9, metalness: 0 }),
  );
  cloak.position.y = 0.48;
  root.add(cloak);

  const shoulders = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 10, 7),
    new THREE.MeshStandardMaterial({ color: clothColor, roughness: 0.78, metalness: 0.02 }),
  );
  shoulders.scale.set(1.18, 0.64, 0.9);
  shoulders.position.y = 0.78;
  root.add(shoulders);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc59b78, roughness: 0.82, metalness: 0 }),
  );
  head.position.y = 1.08;
  root.add(head);

  const badge = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.085, 0),
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.96 }),
  );
  badge.position.set(0, 0.82, 0.28);
  root.add(badge);

  root.userData.badge = badge;
  return root;
}

function buildVillageStall(THREE: any, roofColor: number) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x513821, roughness: 0.94, metalness: 0 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.86, metalness: 0 });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.34, 0.62), wood);
  counter.position.y = 0.34;
  root.add(counter);

  for (const x of [-0.7, 0.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.65, 0.1), wood);
    post.position.set(x, 1.08, 0);
    root.add(post);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.12, 0.95), roofMaterial);
  roof.position.y = 1.87;
  roof.rotation.z = 0.04;
  root.add(roof);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.06, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xf1c77d, transparent: true, opacity: 0.7 }),
  );
  trim.position.set(0, 1.79, 0.49);
  root.add(trim);
  return root;
}

export function MainMenuDungeonScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let lastFrame = 0;

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL);
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x17151c);
      scene.fog = new THREE.Fog(0x17151c, 13, 31);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.26 : 1.18;
      renderer.shadowMap.enabled = false;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
      camera.position.set(0, 4.35, 12.2);
      camera.lookAt(0, 2.25, -6.8);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 29),
        new THREE.MeshStandardMaterial({ color: 0x30271f, roughness: 0.96, metalness: 0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.02, -6.5);
      scene.add(floor);

      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x59452f, roughness: 0.9, metalness: 0.015 }),
      );
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0, -5.3);
      scene.add(path);

      const plaza = new THREE.Mesh(
        new THREE.CircleGeometry(4.6, IS_MOBILE ? 32 : 48),
        new THREE.MeshStandardMaterial({ color: 0x47372b, roughness: 0.92, metalness: 0.015 }),
      );
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(0, 0.008, -4.1);
      plaza.scale.z = 0.78;
      scene.add(plaza);

      const plazaRing = new THREE.Mesh(
        new THREE.RingGeometry(2.48, 2.62, 48),
        new THREE.MeshBasicMaterial({ color: 0xd3a85e, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }),
      );
      plazaRing.rotation.x = -Math.PI / 2;
      plazaRing.position.set(0, 0.02, -4.25);
      plazaRing.scale.z = 0.78;
      scene.add(plazaRing);

      scene.add(new THREE.HemisphereLight(0xffe0af, 0x151522, 1.28));
      scene.add(new THREE.AmbientLight(0xe8d8c1, 0.62));
      const keyLight = new THREE.DirectionalLight(0xffcf8d, 1.52);
      keyLight.position.set(-4.5, 9, 7);
      keyLight.castShadow = false;
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x8ca9ff, 0.68);
      fillLight.position.set(5.5, 7, 2);
      fillLight.castShadow = false;
      scene.add(fillLight);

      const orb = buildVeilWorldOrb(THREE);
      orb.position.set(0, 2.55, -7.7);
      orb.scale.setScalar(1.08);
      scene.add(orb);

      const stalls = [
        { x: -3.35, z: -1.85, rotation: 0.16, color: 0x84542f },
        { x: 3.35, z: -1.85, rotation: -0.16, color: 0x356b78 },
        { x: -3.45, z: -4.9, rotation: 0.1, color: 0x4d7041 },
        { x: 3.45, z: -4.9, rotation: -0.1, color: 0x734665 },
      ];
      stalls.forEach(entry => {
        const stall = buildVillageStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rotation;
        scene.add(stall);
      });

      const npcDefinitions = [
        { x: -2.55, z: -1.85, color: 0x7a4628, accent: 0xf3c96f },
        { x: 2.55, z: -1.85, color: 0x2f6370, accent: 0xa6e6f2 },
        { x: -2.65, z: -4.65, color: 0x416249, accent: 0xa4e5a9 },
        { x: 2.65, z: -4.65, color: 0x68435d, accent: 0xe0b5ff },
        { x: 0, z: -6.05, color: 0x5c4a76, accent: 0xe0ceff },
      ];
      const villageNpcs = npcDefinitions.map((entry, index) => {
        const npc = buildVillageNpc(THREE, entry.color, entry.accent, index * 1.2);
        npc.position.set(entry.x, 0, entry.z);
        npc.rotation.y = entry.x < 0 ? -0.2 : entry.x > 0 ? 0.2 : 0;
        scene.add(npc);
        return npc;
      });

      const lanternMaterial = new THREE.MeshBasicMaterial({ color: 0xffc978, transparent: true, opacity: 0.86 });
      for (const [x, z] of [[-1.72, -2.15], [1.72, -2.15], [-1.72, -5.4], [1.72, -5.4]] as Array<[number, number]>) {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lanternMaterial);
        lantern.position.set(x, 0.34, z);
        scene.add(lantern);
      }

      const clock = new THREE.Clock();
      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (IS_MOBILE && now - lastFrame < 33) return;
        lastFrame = now;

        const delta = Math.min(clock.getDelta(), 0.05);
        const pulse = 0.5 + Math.sin(now * 0.0018) * 0.5;

        orb.rotation.y += delta * 0.07;
        orb.userData.globe.rotation.y += delta * 0.12;
        orb.userData.innerGlow.material.opacity = 0.11 + pulse * 0.08;
        orb.userData.veilRing.rotation.z += delta * 0.13;
        orb.userData.horizonRing.rotation.z -= delta * 0.08;
        orb.userData.halo.material.opacity = 0.11 + pulse * 0.09;
        orb.userData.latitudeRings.forEach((ring: any, index: number) => {
          ring.material.opacity = 0.14 + pulse * 0.08 + index * 0.006;
        });
        orb.userData.longitudeRings.forEach((ring: any, index: number) => {
          ring.rotation.z += delta * (0.015 + index * 0.005);
        });
        orb.userData.landMasses.forEach((land: any, index: number) => {
          land.position.z = 1.29 + Math.sin(now * 0.0014 + index) * 0.035;
        });
        orb.userData.motes.forEach((mote: any, index: number) => {
          const phase = mote.userData.phase + now * (0.0005 + index * 0.000012);
          const radius = 1.82 + (index % 3) * 0.16;
          mote.position.x = Math.sin(phase) * radius;
          mote.position.y = Math.cos(phase * 0.72) * 1.35;
          mote.position.z = 0.22 + Math.cos(phase) * 0.34;
          mote.material.opacity = 0.42 + Math.sin(phase * 2) * 0.22;
        });

        villageNpcs.forEach((npc, index) => {
          const phase = now * 0.0015 + npc.userData.phase;
          npc.position.y = Math.sin(phase) * 0.025;
          npc.rotation.z = Math.sin(phase * 0.72) * 0.01;
          npc.userData.badge.rotation.y += delta * (0.5 + index * 0.04);
        });

        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      (host as any).__menuCleanup = () => window.removeEventListener('resize', resize);
    };

    boot().catch(error => console.error('Dungeon Veil menu scene failed', error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      (host as any).__menuCleanup?.();
      scene?.traverse?.((node: any) => {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
        else node.material?.dispose?.();
      });
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} data-testid="veil-world-orb-scene" className="absolute inset-0 pointer-events-none" />;
}
