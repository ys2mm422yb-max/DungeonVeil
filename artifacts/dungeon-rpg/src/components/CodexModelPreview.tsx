import React, { useEffect, useRef, useState } from 'react';
import type { Enemy, EnemyType } from '../game/entities';
import { createKayKitEnemyVisual, preloadKayKitEnemyVisuals } from './kaykitEnemy3D';
import { EnemyArtwork } from './CodexArtwork';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function previewEnemy(enemyType: EnemyType, room: number): Enemy {
  return {
    id: `codex-${Math.max(1, room)}-0`,
    type: 'enemy', enemyType,
    x: 0, y: 0, width: 48, height: 48, vx: 0, vy: 0,
    hp: 100, maxHp: 100, attack: 10, defense: 0, speed: 0,
    color: '#a78bfa', state: 'patrol', isDead: false,
    targetX: 0, targetY: 0, nextAttackTime: 0, flashUntil: 0,
    spawnTime: 0, lastAttackTime: 0, deathTime: 0,
  };
}

function disposeObject(root: any) {
  root?.traverse?.((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

export function CodexModelPreview({ enemyType, room, accent = '#a78bfa' }: { enemyType: EnemyType; room: number; accent?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let raf = 0;
    let renderer: any = null;
    let scene: any = null;
    let visual: any = null;
    let removeResize = () => {};
    let lastFrame = 0;
    setStatus('loading');

    const boot = async () => {
      const THREE = await import(/* @vite-ignore */ THREE_URL) as any;
      await preloadKayKitEnemyVisuals([enemyType]);
      if (disposed) return;

      scene = new THREE.Scene();
      scene.background = null;
      scene.fog = new THREE.FogExp2(0x080510, 0.055);
      renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, IS_MOBILE ? 1 : 1.35));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = IS_MOBILE ? 1.42 : 1.32;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.setAttribute('data-codex-preview-canvas', 'true');
      host.replaceChildren(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
      camera.position.set(0, 1.45, 5.5);
      camera.lookAt(0, 1.15, 0);

      scene.add(new THREE.HemisphereLight(0xd9d6ff, 0x160d24, 2.0));
      const key = new THREE.DirectionalLight(0xffddb0, 2.3);
      key.position.set(-3.2, 6.5, 4.8);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8b5cf6, 2.1);
      rim.position.set(4.2, 3.2, -3.6);
      scene.add(rim);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.72, IS_MOBILE ? 28 : 48),
        new THREE.MeshStandardMaterial({ color: 0x16111f, roughness: 0.9, transparent: true, opacity: 0.82 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.02;
      scene.add(floor);
      const sigil = new THREE.Mesh(
        new THREE.RingGeometry(1.03, 1.38, IS_MOBILE ? 28 : 48),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
      );
      sigil.rotation.x = -Math.PI / 2;
      sigil.position.y = 0.006;
      scene.add(sigil);

      const enemy = previewEnemy(enemyType, room);
      visual = await createKayKitEnemyVisual(THREE, enemy);
      if (disposed) {
        if (visual?.root) disposeObject(visual.root);
        return;
      }
      if (!visual?.root) throw new Error(`Codex preview visual unavailable: ${enemyType}`);
      scene.add(visual.root);
      visual.root.updateMatrixWorld(true);
      const initial = new THREE.Box3().setFromObject(visual.root);
      const size = initial.getSize(new THREE.Vector3());
      const scale = 2.7 / Math.max(size.y, size.x * 0.78, size.z * 0.78, 0.001);
      visual.root.scale.multiplyScalar(scale);
      visual.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(visual.root);
      const center = box.getCenter(new THREE.Vector3());
      visual.root.position.x -= center.x;
      visual.root.position.z -= center.z;
      visual.root.position.y -= box.min.y;
      visual.root.rotation.y = enemyType === 'boss' ? -0.2 : 0.18;
      setStatus('ready');

      const resize = () => {
        const width = Math.max(1, host.clientWidth || 320);
        const height = Math.max(1, host.clientHeight || 300);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      removeResize = () => observer.disconnect();

      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden || (IS_MOBILE && now - lastFrame < 33)) return;
        const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
        lastFrame = now;
        visual?.mixer?.update?.(delta);
        if (visual?.root) visual.root.rotation.y += delta * 0.12;
        sigil.rotation.z -= delta * 0.16;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
    };

    boot().catch(error => {
      console.error('Codex shared model preview failed', error);
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeResize();
      if (visual?.root) disposeObject(visual.root);
      scene?.remove?.(visual?.root);
      renderer?.renderLists?.dispose?.();
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer?.domElement?.remove?.();
    };
  }, [enemyType, room, accent]);

  return <div
    data-testid="codex-shared-model-preview"
    data-preview-renderers="1"
    data-preview-status={status}
    className="relative min-h-[250px] overflow-hidden rounded-[1.75rem] border border-violet-200/15 bg-[radial-gradient(circle_at_50%_35%,rgba(115,70,190,.18),rgba(5,3,10,.96)_72%)]"
  >
    <div ref={hostRef} className="absolute inset-0" />
    {status !== 'ready' && <div className="absolute inset-0 grid place-items-center">
      <EnemyArtwork enemyType={enemyType} room={room} accent={accent} className="h-28 w-28" />
    </div>}
    {status === 'loading' && <div className="absolute bottom-3 left-0 right-0 text-center text-[7px] font-black tracking-[.2em] text-violet-100/35">MODELL WIRD GELADEN</div>}
    {status === 'error' && <div className="absolute bottom-3 left-0 right-0 text-center text-[7px] font-black tracking-[.2em] text-red-100/45">STATISCHES PORTRÄT</div>}
  </div>;
}
