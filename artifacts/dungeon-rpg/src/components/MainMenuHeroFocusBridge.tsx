import { useEffect, useRef } from 'react';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const IS_MOBILE = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

function sceneFrom(candidate: any) {
  let current = candidate;
  while (current?.parent) current = current.parent;
  return current?.isScene ? current : null;
}

export function MainMenuHeroFocusBridge() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let THREE: any = null;
    let hallScene: any = null;
    let originalAdd: ((...objects: any[]) => any) | null = null;
    let patchedAdd: ((this: any, ...objects: any[]) => any) | null = null;

    const capture = (candidate: any) => {
      const scene = sceneFrom(candidate);
      if (!scene?.getObjectByName?.('ModernKayKitVillageSquare')) return;
      hallScene = scene;
    };

    const tune = () => {
      const marker = markerRef.current;
      if (!hallScene) {
        if (marker) marker.dataset.sceneCaptured = 'false';
        return;
      }

      const wolf = hallScene.getObjectByName('HallActiveCompanionVeilWolf');
      const ranger = hallScene.getObjectByName('VillageEquippedPlayer');
      const portal = hallScene.getObjectByName('HallOfTheVeilPortal');
      const portalCore = hallScene.getObjectByName('HallPortalCore');
      const portalGlow = hallScene.getObjectByName('HallPortalOuterGlow');
      const runeFrame = hallScene.getObjectByName('HallPortalRuneFrame');

      if (wolf) {
        wolf.position.x = 1.12;
        wolf.position.z = -3.08;
        wolf.rotation.y = -0.5;
        wolf.scale.setScalar(IS_MOBILE ? 0.58 : 0.55);
        wolf.userData.heroPairFocus = true;
      }
      if (portal) {
        portal.position.z = -10.15;
        portal.scale.setScalar(IS_MOBILE ? 0.88 : 0.92);
        portal.userData.backgroundArchitecture = true;
      }
      if (portalCore?.material) portalCore.material.opacity = IS_MOBILE ? 0.68 : 0.74;
      if (portalGlow?.material) portalGlow.material.opacity = IS_MOBILE ? 0.1 : 0.13;
      if (runeFrame?.material) runeFrame.material.emissiveIntensity = IS_MOBILE ? 0.7 : 0.82;

      if (marker) {
        marker.dataset.sceneCaptured = 'true';
        marker.dataset.rangerFocused = ranger ? 'true' : 'false';
        marker.dataset.wolfFocused = wolf ? 'true' : 'false';
        marker.dataset.portalRecessed = portal ? 'true' : 'false';
      }
    };

    const loop = () => {
      if (disposed) return;
      tune();
      raf = requestAnimationFrame(loop);
    };

    const install = async () => {
      THREE = await import(/* @vite-ignore */ THREE_URL);
      if (disposed) return;
      originalAdd = THREE.Object3D.prototype.add;
      patchedAdd = function patchedHeroFocusAdd(this: any, ...objects: any[]) {
        const result = originalAdd!.apply(this, objects);
        capture(this);
        objects.forEach(capture);
        return result;
      };
      THREE.Object3D.prototype.add = patchedAdd;
      raf = requestAnimationFrame(loop);
    };

    void install().catch(error => console.error('Main-menu hero focus bridge could not start', error));
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (THREE && originalAdd && patchedAdd && THREE.Object3D.prototype.add === patchedAdd) {
        THREE.Object3D.prototype.add = originalAdd;
      }
    };
  }, []);

  return <span
    ref={markerRef}
    className="hidden"
    aria-hidden="true"
    data-testid="main-menu-hero-focus-bridge"
    data-scene-captured="false"
    data-ranger-focused="false"
    data-wolf-focused="false"
    data-portal-recessed="false"
  />;
}
