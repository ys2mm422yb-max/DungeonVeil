import React, { useEffect, useRef } from 'react';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function buildMenuVeil(THREE: any) {
  const root = new THREE.Group();
  root.name = 'DungeonVeilMenuPortal';

  const segments = IS_MOBILE ? 36 : 56;
  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.11, 8, segments),
    new THREE.MeshBasicMaterial({ color: 0xb89cff, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  outer.scale.y = 1.24;
  root.add(outer);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(1.73, 0.05, 6, IS_MOBILE ? 32 : 48),
    new THREE.MeshBasicMaterial({ color: 0x714be0, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  inner.scale.y = 1.29;
  root.add(inner);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.69, IS_MOBILE ? 36 : 56),
    new THREE.MeshBasicMaterial({ color: 0x120923, transparent: true, opacity: 0.92, depthWrite: false }),
  );
  core.scale.y = 1.29;
  core.position.z = -0.04;
  root.add(core);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(3.05, 4.2),
    new THREE.MeshBasicMaterial({ color: 0x6a3fc7, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  veil.position.z = 0.01;
  root.add(veil);

  const moteCount = IS_MOBILE ? 5 : 9;
  const motes: any[] = [];
  for (let index = 0; index < moteCount; index++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + (index % 2) * 0.012, 5, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xd9ccff : 0x8d6cff, transparent: true, opacity: 0.74, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    mote.userData.phase = index / moteCount * Math.PI * 2;
    root.add(mote);
    motes.push(mote);
  }

  root.userData.outer = outer;
  root.userData.inner = inner;
  root.userData.core = core;
  root.userData.veil = veil;
  root.userData.motes = motes;
  return root;
}

function buildVillageNpc(THREE: any, clothColor: number, accentColor: number, phase: number) {
  const root = new THREE.Group();
  root.userData.phase = phase;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
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
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.92 }),
  );
  badge.position.set(0, 0.82, 0.28);
  root.add(badge);

  root.userData.badge = badge;
  return root;
}

function buildVillageStall(THREE: any, roofColor: number) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a281a, roughness: 0.95, metalness: 0 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.88, metalness: 0 });

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
    new THREE.MeshBasicMaterial({ color: 0xe2b86f, transparent: true, opacity: 0.55 }),
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
      scene.background = new THREE.Color(0x050505);
      scene.fog = new THREE.Fog(0x050505, 12, 28);

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.12 : 1.07;
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 70);
      camera.position.set(0, 4.15, 11.8);
      camera.lookAt(0, 2.35, -7.4);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 28),
        new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.95, metalness: 0 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -0.02, -6.5);
      scene.add(floor);

      const path = new THREE.Mesh(
        new THREE.PlaneGeometry(3.7, 24),
        new THREE.MeshStandardMaterial({ color: 0x2b211b, roughness: 0.9, metalness: 0 }),
      );
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0, -5.5);
      scene.add(path);

      const plaza = new THREE.Mesh(
        new THREE.CircleGeometry(4.15, IS_MOBILE ? 28 : 40),
        new THREE.MeshStandardMaterial({ color: 0x241b16, roughness: 0.94, metalness: 0 }),
      );
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(0, 0.006, -2.9);
      plaza.scale.z = 0.72;
      scene.add(plaza);

      const rune = new THREE.Mesh(
        new THREE.RingGeometry(0.78, 0.86, 28),
        new THREE.MeshBasicMaterial({ color: 0xa77cff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
      );
      rune.rotation.x = -Math.PI / 2;
      rune.position.set(0, 0.02, -3.0);
      scene.add(rune);

      scene.add(new THREE.HemisphereLight(0xc8b897, 0x050505, 0.9));
      const keyLight = new THREE.DirectionalLight(0xffc987, 1.16);
      keyLight.position.set(-4, 9, 6);
      scene.add(keyLight);
      const portalLight = new THREE.PointLight(0x9a72ff, IS_MOBILE ? 3.6 : 5.4, 11, 2);
      portalLight.position.set(0, 2.55, -7.0);
      scene.add(portalLight);

      const portal = buildMenuVeil(THREE);
      portal.position.set(0, 2.7, -7.8);
      portal.scale.setScalar(1.08);
      scene.add(portal);

      const stalls = [
        { x: -3.15, z: -1.45, rotation: 0.16, color: 0x5e3a24 },
        { x: 3.15, z: -1.45, rotation: -0.16, color: 0x264c55 },
        { x: -3.25, z: -4.55, rotation: 0.1, color: 0x344f2d },
        { x: 3.25, z: -4.55, rotation: -0.1, color: 0x55314f },
      ];
      stalls.forEach(entry => {
        const stall = buildVillageStall(THREE, entry.color);
        stall.position.set(entry.x, 0, entry.z);
        stall.rotation.y = entry.rotation;
        scene.add(stall);
      });

      const npcDefinitions = [
        { x: -2.35, z: -1.45, color: 0x6e3c22, accent: 0xf2c56d },
        { x: 2.35, z: -1.45, color: 0x244b5b, accent: 0x8edcf0 },
        { x: -2.45, z: -4.25, color: 0x2f5137, accent: 0x91e09d },
        { x: 2.45, z: -4.25, color: 0x57344e, accent: 0xd7a4ff },
        { x: 0, z: -5.45, color: 0x44315f, accent: 0xc9b0ff },
      ];
      const villageNpcs = npcDefinitions.map((entry, index) => {
        const npc = buildVillageNpc(THREE, entry.color, entry.accent, index * 1.2);
        npc.position.set(entry.x, 0, entry.z);
        npc.rotation.y = entry.x < 0 ? -0.2 : entry.x > 0 ? 0.2 : 0;
        scene.add(npc);
        return npc;
      });

      const lanternMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd67, transparent: true, opacity: 0.72 });
      for (const [x, z] of [[-1.55, -1.9], [1.55, -1.9], [-1.55, -5.2], [1.55, -5.2]] as Array<[number, number]>) {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lanternMaterial);
        lantern.position.set(x, 0.32, z);
        scene.add(lantern);
      }

      const clock = new THREE.Clock();
      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
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
        const pulse = 0.5 + Math.sin(now * 0.0021) * 0.5;

        portal.userData.outer.rotation.z = now * 0.00016;
        portal.userData.inner.rotation.z = -now * 0.00028;
        portal.userData.core.material.opacity = 0.86 + pulse * 0.06;
        portal.userData.veil.material.opacity = 0.15 + pulse * 0.08;
        portal.userData.veil.scale.x = 0.97 + pulse * 0.04;
        portalLight.intensity = (IS_MOBILE ? 3.8 : 5.6) + pulse * 0.9;
        rune.rotation.z += delta * 0.08;
        rune.material.opacity = 0.24 + pulse * 0.12;

        villageNpcs.forEach((npc, index) => {
          const phase = now * 0.0016 + npc.userData.phase;
          npc.position.y = Math.sin(phase) * 0.025;
          npc.rotation.z = Math.sin(phase * 0.75) * 0.012;
          npc.userData.badge.rotation.y += delta * (0.55 + index * 0.04);
        });

        (portal.userData.motes as any[]).forEach((mote, index) => {
          const phase = mote.userData.phase + now * (0.00062 + index * 0.00001);
          const radius = 1.48 + (index % 2) * 0.2;
          mote.position.x = Math.sin(phase) * radius;
          mote.position.y = -1.72 + ((now * 0.00015 + index / Math.max(1, portal.userData.motes.length)) % 1) * 3.7;
          mote.position.z = 0.05 + Math.cos(phase) * 0.1;
          mote.material.opacity = 0.38 + Math.sin(phase * 2) * 0.22;
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
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 pointer-events-none" />;
}
