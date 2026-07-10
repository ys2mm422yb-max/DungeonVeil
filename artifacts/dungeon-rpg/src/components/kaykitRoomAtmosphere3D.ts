import { roomSetpieces } from '../game/roomSetpieceLayout';

const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LightSource = { x: number; z: number; color: number; intensity: number; range: number; phase: number };

function sourceForModel(model: string): Omit<LightSource, 'x' | 'z' | 'phase'> | null {
  const name = model.toLowerCase();
  if (name.includes('shrine_candles')) return { color: 0x8d67ff, intensity: 3.2, range: 6.2 };
  if (name.includes('torch')) return { color: 0xff8a3d, intensity: 2.8, range: 5.2 };
  if (name.includes('lantern')) return { color: 0xffb75e, intensity: 2.2, range: 4.2 };
  if (name.includes('candle')) return { color: 0xffc979, intensity: 1.35, range: 3.1 };
  return null;
}

function lightSources(room: number): LightSource[] {
  return roomSetpieces(room)
    .map((piece, index) => {
      const source = sourceForModel(piece.model);
      return source ? { ...source, x: piece.x, z: piece.z, phase: index * 1.73 + room * 0.61 } : null;
    })
    .filter((source): source is LightSource => Boolean(source))
    .slice(0, IS_MOBILE ? 4 : 8);
}

export function buildKayKitRoomAtmosphere(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `KayKitRoomAtmosphere_${room}`;

  const lights = lightSources(room).map(source => {
    const light = new THREE.PointLight(source.color, source.intensity, source.range, 2);
    light.position.set(source.x, source.model?.includes?.('shrine') ? 1.35 : 1.05, source.z);
    light.userData.baseIntensity = source.intensity;
    light.userData.phase = source.phase;
    root.add(light);
    return light;
  });

  const particleCount = IS_MOBILE ? 22 : 42;
  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  for (let index = 0; index < particleCount; index++) {
    const i = index * 3;
    positions[i] = (Math.random() - 0.5) * 18;
    positions[i + 1] = 0.15 + Math.random() * 2.8;
    positions[i + 2] = -8 + Math.random() * 16;
    seeds[index] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: room >= 11 ? 0xb89be4 : 0xd8c39a,
    size: IS_MOBILE ? 0.028 : 0.038,
    transparent: true,
    opacity: room >= 11 ? 0.2 : 0.14,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  root.add(dust);

  dust.onBeforeRender = () => {
    const now = performance.now() * 0.001;
    lights.forEach(light => {
      const base = light.userData.baseIntensity ?? 1;
      const phase = light.userData.phase ?? 0;
      light.intensity = base * (0.88 + Math.sin(now * 7.2 + phase) * 0.08 + Math.sin(now * 13.7 + phase * 1.4) * 0.04);
    });

    const attribute = geometry.getAttribute('position');
    for (let index = 0; index < particleCount; index++) {
      const i = index * 3;
      const seed = seeds[index];
      positions[i] += Math.sin(now * 0.55 + seed) * 0.0007;
      positions[i + 1] += 0.0018 + (index % 3) * 0.00035;
      positions[i + 2] += Math.cos(now * 0.42 + seed) * 0.00055;
      if (positions[i + 1] > 3.15) positions[i + 1] = 0.12;
    }
    attribute.needsUpdate = true;
  };

  root.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
  };
  return root;
}
