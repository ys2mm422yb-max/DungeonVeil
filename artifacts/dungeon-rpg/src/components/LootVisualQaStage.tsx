import React, { useEffect, useRef } from 'react';
import type { Item } from '../game/entities';
import { createKayKitLootVisual } from './kaykitLoot3D';

const THREE_URL = `${import.meta.env.BASE_URL}assets/vendor/three/build/three.module.js`;

const entries: Array<{ label: string; item: Item; x: number; z: number }> = [
  { label: 'Bogen', x: -1.15, z: -0.8, item: { id: 'qa-bow', type: 'item', itemType: 'equipment', equipmentId: 'ash-bow', equipmentRarity: 'rare', equipmentSource: 'hunt', value: 1, color: '#e28c4d', spawnTime: 0, x: 0, y: 0, width: 24, height: 24, vx: 0, vy: 0 } },
  { label: 'Köcher', x: 1.15, z: -0.8, item: { id: 'qa-quiver', type: 'item', itemType: 'equipment', equipmentId: 'ranger-quiver', equipmentRarity: 'common', equipmentSource: 'forge', value: 1, color: '#73d1e6', spawnTime: 0, x: 0, y: 0, width: 24, height: 24, vx: 0, vy: 0 } },
  { label: 'Rüstung', x: -1.15, z: 0.95, item: { id: 'qa-armor', type: 'item', itemType: 'equipment', equipmentId: 'ranger-cloak', equipmentRarity: 'epic', equipmentSource: 'warden', value: 1, color: '#c8a4ff', spawnTime: 0, x: 0, y: 0, width: 24, height: 24, vx: 0, vy: 0 } },
  { label: 'Relikt', x: 1.15, z: 0.95, item: { id: 'qa-relic', type: 'item', itemType: 'relic', relicId: 'marked-claw', value: 1, color: '#b77aff', spawnTime: 0, x: 0, y: 0, width: 24, height: 24, vx: 0, vy: 0 } },
];

function dispose(root: any) {
  root?.traverse?.((node: any) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material: any) => material.dispose?.());
  });
}

export function LootVisualQaStage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stopped = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let roots: any[] = [];
    let removeResize = () => {};
    host.dataset.ready = 'false';

    const start = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07050b);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.domElement.dataset.testid = 'loot-visual-qa-canvas';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      host.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
      camera.position.set(0, 4.9, 7.8);
      camera.lookAt(0, 0.55, 0.1);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), new THREE.MeshStandardMaterial({ color: 0x17101f, roughness: 0.9 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.04;
      scene.add(floor);
      scene.add(new THREE.GridHelper(7, 18, 0x56366f, 0x24172f));
      scene.add(new THREE.HemisphereLight(0xcdb8ff, 0x0b0710, 2.2));
      scene.add(new THREE.AmbientLight(0xb89cd7, 0.7));
      const warm = new THREE.PointLight(0xffc27c, 4, 10, 2);
      warm.position.set(-3, 5, 4);
      scene.add(warm);
      const cool = new THREE.PointLight(0xa37aff, 3.3, 10, 2);
      cool.position.set(3, 3.4, -2.4);
      scene.add(cool);

      roots = await Promise.all(entries.map(async entry => {
        const root = await createKayKitLootVisual(entry.item);
        if (!root) throw new Error(`Loot model missing: ${entry.label}`);
        root.position.set(entry.x, 0.04, entry.z);
        scene.add(root);
        return root;
      }));
      if (stopped) return;
      host.dataset.actualModelCount = String(roots.filter(root => root.userData.usesActualEquipmentModel || root.userData.relic).length);
      host.dataset.ready = 'true';

      const resize = () => {
        const width = host.clientWidth || innerWidth;
        const height = host.clientHeight || innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.fov = camera.aspect < 0.72 ? 44 : 36;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      removeResize = () => observer.disconnect();

      const loop = (now: number) => {
        if (stopped) return;
        frame = requestAnimationFrame(loop);
        roots.forEach((root, index) => {
          root.rotation.y += 0.0028;
          root.position.y = 0.04 + Math.sin(now * 0.0025 + index) * 0.035;
          if (root.userData.halo) root.userData.halo.rotation.z = now * 0.0004;
        });
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(loop);
    };

    void start().catch(error => {
      host.dataset.ready = 'failed';
      console.error('Loot visual QA failed', error);
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      removeResize();
      roots.forEach(dispose);
      dispose(scene);
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return <main data-testid="loot-visual-qa-stage" className="fixed inset-0 overflow-hidden bg-[#07050b] text-white">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/90 to-transparent px-5 pb-14 pt-[max(22px,calc(env(safe-area-inset-top)+10px))] text-center">
      <div className="text-[8px] font-black uppercase tracking-[.32em] text-violet-100/42">DROP-AUDIT</div>
      <h1 className="mt-1 text-2xl font-black text-violet-50">Echte Beutemodelle im Raum</h1>
    </div>
    <div ref={hostRef} data-testid="loot-visual-qa-host" data-ready="false" data-actual-model-count="0" className="absolute inset-0" />
    <div className="pointer-events-none absolute inset-x-3 bottom-[max(18px,calc(env(safe-area-inset-bottom)+10px))] z-10 grid grid-cols-2 gap-2">
      {entries.map(entry => <div key={entry.item.id} className="rounded-2xl border border-white/10 bg-black/64 px-3 py-2 text-center backdrop-blur-md"><div className="text-[8px] font-black uppercase tracking-[.13em] text-white/78">{entry.label}</div><div className="mt-0.5 text-[6px] text-white/32">{entry.item.itemType === 'relic' ? 'RELIQUIAR' : entry.item.equipmentId}</div></div>)}
    </div>
  </main>;
}
