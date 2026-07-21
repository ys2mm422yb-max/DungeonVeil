const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

export const EARLY_VEIL_ROOM_RANGE = Object.freeze({ first: 1, last: 9 });
export const EARLY_VEIL_ENVIRONMENT = Object.freeze({
  background: 0x08050e,
  fog: 0x140b21,
  exposure: IS_MOBILE ? 0.94 : 0.98,
});

function runeTexture(THREE: any) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, 256, 256);
  context.translate(128, 128);
  context.strokeStyle = 'rgba(208, 177, 255, .96)';
  context.shadowColor = 'rgba(145, 82, 255, .96)';
  context.shadowBlur = 18;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, 96, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, 72, 0, Math.PI * 2);
  context.stroke();
  context.rotate(Math.PI / 4);
  context.strokeRect(-40, -40, 80, 80);
  context.rotate(-Math.PI / 4);
  context.beginPath();
  context.moveTo(0, -68);
  context.lineTo(18, -18);
  context.lineTo(62, 0);
  context.lineTo(18, 18);
  context.lineTo(0, 68);
  context.lineTo(-18, 18);
  context.lineTo(-62, 0);
  context.lineTo(-18, -18);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(-78, -38);
  context.lineTo(-48, -18);
  context.lineTo(-66, 12);
  context.moveTo(78, -38);
  context.lineTo(48, -18);
  context.lineTo(66, 12);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function tuneBaseLights(root: any) {
  const lights = Array.isArray(root.userData?.architectureLights) ? root.userData.architectureLights : [];
  for (const light of lights) {
    if (light.isAmbientLight) {
      light.color?.setHex?.(0x8d72ac);
      light.intensity = IS_MOBILE ? 0.11 : 0.14;
    } else if (light.isHemisphereLight) {
      light.color?.setHex?.(0x7650a9);
      light.groundColor?.setHex?.(0x07040b);
      light.intensity = IS_MOBILE ? 0.27 : 0.32;
    } else if (light.isPointLight) {
      light.color?.setHex?.(0x8e55db);
      light.intensity = Math.min(Number(light.intensity) || 0, IS_MOBILE ? 1.18 : 2.2);
    }
  }
}

export function buildEarlyVeilRoomAtmosphere(THREE: any, root: any, room: number) {
  if (room < EARLY_VEIL_ROOM_RANGE.first || room > EARLY_VEIL_ROOM_RANGE.last) return null;

  root.userData.environment = { ...EARLY_VEIL_ENVIRONMENT };
  tuneBaseLights(root);

  const group = new THREE.Group();
  group.name = `EarlyVeilAtmosphereRoom${room}`;
  group.userData.roomRange = '1-9';
  group.userData.noCollision = true;
  const disposable: any[] = [];

  const veilLight = new THREE.PointLight(0x9b64ff, IS_MOBILE ? 2.05 : 3.45, 18, 2);
  veilLight.name = 'EarlyVeilCentralLight';
  veilLight.position.set(0, 3.4, room === 9 ? 0 : -1.8);
  group.add(veilLight);

  const rearLight = new THREE.PointLight(0x5b37a8, IS_MOBILE ? 0.88 : 1.6, 20, 2);
  rearLight.name = 'EarlyVeilRearDepthLight';
  rearLight.position.set(0, 4.8, -9.2);
  group.add(rearLight);

  for (const x of [-5.7, 5.7]) {
    const torchLight = new THREE.PointLight(0xff9b4f, IS_MOBILE ? 0.42 : 0.78, 7.5, 2);
    torchLight.name = 'EarlyVeilWarmTorchLight';
    torchLight.position.set(x, 2.35, -4.6);
    group.add(torchLight);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(IS_MOBILE ? 0.09 : 0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffb56e, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    flame.name = 'EarlyVeilWarmTorchFlame';
    flame.position.copy(torchLight.position);
    flame.onBeforeRender = () => {
      const pulse = 0.82 + Math.sin(performance.now() * 0.0045 + x) * 0.18;
      flame.scale.setScalar(pulse);
      flame.material.opacity = 0.72 + pulse * 0.18;
    };
    group.add(flame);
    disposable.push(flame.geometry, flame.material);
  }

  const floorVeilMaterial = new THREE.MeshBasicMaterial({
    color: 0x100919,
    transparent: true,
    opacity: IS_MOBILE ? 0.34 : 0.3,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const floorVeil = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), floorVeilMaterial);
  floorVeil.name = 'EarlyVeilStoneDarkeningLayer';
  floorVeil.rotation.x = -Math.PI / 2;
  floorVeil.position.y = 0.026;
  floorVeil.renderOrder = -6;
  group.add(floorVeil);
  disposable.push(floorVeil.geometry, floorVeilMaterial);

  const texture = runeTexture(THREE);
  if (texture) {
    const runeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xc09aff,
      transparent: true,
      opacity: room === 9 ? 0.48 : room === 1 || room === 5 ? 0.32 : 0.18,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const runePlane = new THREE.Mesh(new THREE.PlaneGeometry(room === 9 ? 5.2 : 3.6, room === 9 ? 5.2 : 3.6), runeMaterial);
    runePlane.name = 'EarlyVeilFloorRune';
    runePlane.rotation.x = -Math.PI / 2;
    runePlane.position.set(0, 0.062, room === 9 ? 0 : -0.8);
    runePlane.renderOrder = -2;
    runePlane.onBeforeRender = () => {
      const pulse = 0.5 + Math.sin(performance.now() * 0.0018 + room) * 0.5;
      runeMaterial.opacity = (room === 9 ? 0.4 : room === 1 || room === 5 ? 0.26 : 0.14) + pulse * (room === 9 ? 0.1 : 0.07);
      runePlane.rotation.z = performance.now() * (room === 9 ? 0.00005 : 0.000025);
    };
    group.add(runePlane);
    disposable.push(texture, runePlane.geometry, runeMaterial);
  }

  const mistMaterial = new THREE.MeshBasicMaterial({
    color: 0x8b5ad2,
    transparent: true,
    opacity: IS_MOBILE ? 0.055 : 0.07,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  for (const [index, z] of [-5.8, 0.2, 5.3].entries()) {
    const mist = new THREE.Mesh(new THREE.CircleGeometry(index === 1 ? 5.4 : 4.2, IS_MOBILE ? 24 : 40), mistMaterial.clone());
    mist.name = 'EarlyVeilFloorMist';
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(index === 1 ? 0 : index === 0 ? -2.4 : 2.4, 0.045 + index * 0.002, z);
    mist.scale.set(1.45, 0.55, 1);
    mist.onBeforeRender = () => {
      const drift = performance.now() * 0.00008 + index * 2.1;
      mist.position.x += (Math.sin(drift) * 0.018 - Number(mist.userData.lastDrift ?? 0));
      mist.userData.lastDrift = Math.sin(drift) * 0.018;
      mist.material.opacity = (IS_MOBILE ? 0.042 : 0.055) + Math.sin(drift * 1.7) * 0.01;
    };
    group.add(mist);
    disposable.push(mist.geometry, mist.material);
  }
  mistMaterial.dispose();

  const environmentMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, colorWrite: false });
  const environmentDriver = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001), environmentMaterial);
  const background = new THREE.Color(EARLY_VEIL_ENVIRONMENT.background);
  const fog = new THREE.Fog(EARLY_VEIL_ENVIRONMENT.fog, 23, 54);
  environmentDriver.name = 'EarlyVeilEnvironmentDriver';
  environmentDriver.frustumCulled = false;
  environmentDriver.renderOrder = 10000;
  environmentDriver.onBeforeRender = (renderer: any, scene: any) => {
    scene.background = background;
    scene.fog = fog;
    renderer.toneMappingExposure = EARLY_VEIL_ENVIRONMENT.exposure;
  };
  group.add(environmentDriver);
  disposable.push(environmentDriver.geometry, environmentMaterial);

  group.userData.dispose = () => {
    environmentDriver.onBeforeRender = () => undefined;
    group.traverse((node: any) => { if (node.onBeforeRender) node.onBeforeRender = () => undefined; });
    disposable.forEach(resource => resource?.dispose?.());
  };
  return group;
}
