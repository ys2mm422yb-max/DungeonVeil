import { roomSetpieces } from '../game/roomSetpieceLayout';
import { roomIdentity } from '../game/roomIdentity';

const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

type LightSource = { x: number; y: number; z: number; color: number; intensity: number; range: number; phase: number };
type MoodProfile = {
  dustColor: number;
  dustOpacity: number;
  focusColor: number;
  focusIntensity: number;
  focusRange: number;
  focusX: number;
  focusZ: number;
  hazeColor: number;
  hazeOpacity: number;
  hazeScaleX: number;
  hazeScaleZ: number;
};

function sourceForModel(model: string): Omit<LightSource, 'x' | 'z' | 'phase'> | null {
  const name = model.toLowerCase();
  if (name.includes('shrine_candles')) return { y: 1.35, color: 0x8d67ff, intensity: 3.2, range: 6.2 };
  if (name.includes('torch')) return { y: 1.3, color: 0xff8a3d, intensity: 2.8, range: 5.2 };
  if (name.includes('lantern')) return { y: 0.75, color: 0xffb75e, intensity: 2.2, range: 4.2 };
  if (name.includes('candle')) return { y: 0.45, color: 0xffc979, intensity: 1.35, range: 3.1 };
  return null;
}

function moodForRoom(room: number): MoodProfile {
  const id = roomIdentity(room).id;
  const base: MoodProfile = {
    dustColor: 0xd8c39a,
    dustOpacity: 0.13,
    focusColor: 0xe7ad68,
    focusIntensity: 2.1,
    focusRange: 9,
    focusX: 0,
    focusZ: -2,
    hazeColor: 0x8d6036,
    hazeOpacity: 0.075,
    hazeScaleX: 4.8,
    hazeScaleZ: 3.4,
  };

  if (id === 'storehouse' || id === 'guardroom' || id === 'miners-camp' || id === 'workshop' || id === 'material-vault') {
    return { ...base, focusColor: 0xffb461, focusX: id === 'guardroom' ? -2.2 : 0, focusZ: id === 'miners-camp' ? -0.5 : -3.1, hazeColor: 0x7d532f, hazeOpacity: 0.06 };
  }
  if (id === 'forge' || id === 'fractured-workshop' || id === 'crystal-foundry') {
    return { ...base, dustColor: 0xd9a078, dustOpacity: 0.18, focusColor: id === 'crystal-foundry' ? 0xb26dff : 0xff6f35, focusIntensity: 3.4, focusRange: 11, focusZ: -1.4, hazeColor: id === 'crystal-foundry' ? 0x6b3aa7 : 0xa83f1e, hazeOpacity: 0.13, hazeScaleX: 5.8, hazeScaleZ: 3.2 };
  }
  if (id === 'quarters') {
    return { ...base, dustColor: 0xd7c5a8, dustOpacity: 0.1, focusColor: 0xe9bb7c, focusIntensity: 1.7, focusZ: 1, hazeColor: 0x6f5139, hazeOpacity: 0.055, hazeScaleX: 4.3, hazeScaleZ: 4.1 };
  }
  if (id === 'blood-archive' || id === 'rune-sanctum') {
    return { ...base, dustColor: 0xc7b0dc, dustOpacity: 0.16, focusColor: id === 'rune-sanctum' ? 0x8068ff : 0xb95a72, focusIntensity: 2.8, focusRange: 10, focusZ: 0, hazeColor: id === 'rune-sanctum' ? 0x4d3b9f : 0x6c2939, hazeOpacity: 0.11, hazeScaleX: 5, hazeScaleZ: 4.2 };
  }
  if (id === 'overgrown-vault' || id === 'root-chamber') {
    return { ...base, dustColor: 0xa6c68e, dustOpacity: 0.15, focusColor: 0x8bc46d, focusIntensity: 2.5, focusRange: 10, focusX: id === 'root-chamber' ? -0.8 : 2.5, focusZ: 0.5, hazeColor: 0x42633b, hazeOpacity: 0.1, hazeScaleX: 6.2, hazeScaleZ: 4.8 };
  }
  if (id === 'ritual-antechamber' || id === 'veil-shrine' || id === 'broken-ritual') {
    return { ...base, dustColor: 0xc1a2e7, dustOpacity: 0.22, focusColor: 0x8d67ff, focusIntensity: 3.8, focusRange: 12, focusX: id === 'broken-ritual' ? 0.6 : 0, focusZ: -5.8, hazeColor: 0x5d3395, hazeOpacity: 0.145, hazeScaleX: 5.2, hazeScaleZ: 4.2 };
  }
  if (id === 'old-passage' || id === 'guardian-hall' || id === 'grave-gallery' || id === 'first-warden') {
    return { ...base, dustColor: 0xbab1a8, dustOpacity: 0.17, focusColor: id === 'first-warden' ? 0x9a79ff : 0xc29a6a, focusIntensity: id === 'first-warden' ? 4.2 : 2.4, focusRange: id === 'first-warden' ? 14 : 10, focusZ: -5.8, hazeColor: id === 'first-warden' ? 0x4f377f : 0x51463c, hazeOpacity: id === 'first-warden' ? 0.15 : 0.08, hazeScaleX: id === 'first-warden' ? 6.8 : 5.2, hazeScaleZ: 4.4 };
  }
  return base;
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
  const mood = moodForRoom(room);

  const lights = lightSources(room).map(source => {
    const light = new THREE.PointLight(source.color, source.intensity, source.range, 2);
    light.position.set(source.x, source.y, source.z);
    light.userData.baseIntensity = source.intensity;
    light.userData.phase = source.phase;
    root.add(light);
    return light;
  });

  const focusLight = new THREE.PointLight(mood.focusColor, IS_MOBILE ? mood.focusIntensity * 0.72 : mood.focusIntensity, mood.focusRange, 2);
  focusLight.position.set(mood.focusX, 1.35, mood.focusZ);
  root.add(focusLight);

  const hazeGeometry = new THREE.CircleGeometry(1, IS_MOBILE ? 28 : 44);
  const hazeMaterial = new THREE.MeshBasicMaterial({
    color: mood.hazeColor,
    transparent: true,
    opacity: mood.hazeOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
  haze.rotation.x = -Math.PI / 2;
  haze.position.set(mood.focusX, 0.035, mood.focusZ);
  haze.scale.set(mood.hazeScaleX, mood.hazeScaleZ, 1);
  root.add(haze);

  const particleCount = IS_MOBILE ? 22 : 42;
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  const riseSpeeds = new Float32Array(particleCount);
  for (let index = 0; index < particleCount; index++) {
    const i = index * 3;
    basePositions[i] = (Math.random() - 0.5) * 18;
    basePositions[i + 1] = 0.15 + Math.random() * 2.8;
    basePositions[i + 2] = -8 + Math.random() * 16;
    positions[i] = basePositions[i];
    positions[i + 1] = basePositions[i + 1];
    positions[i + 2] = basePositions[i + 2];
    seeds[index] = Math.random() * Math.PI * 2;
    riseSpeeds[index] = 0.09 + (index % 4) * 0.018;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: mood.dustColor,
    size: IS_MOBILE ? 0.028 : 0.038,
    transparent: true,
    opacity: mood.dustOpacity,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(geometry, material);
  dust.frustumCulled = false;
  root.add(dust);
  const startedAt = performance.now() * 0.001;

  dust.onBeforeRender = () => {
    const now = performance.now() * 0.001;
    const elapsed = now - startedAt;
    lights.forEach(light => {
      const base = light.userData.baseIntensity ?? 1;
      const phase = light.userData.phase ?? 0;
      light.intensity = base * (0.88 + Math.sin(now * 7.2 + phase) * 0.08 + Math.sin(now * 13.7 + phase * 1.4) * 0.04);
    });
    const focusPulse = 0.94 + Math.sin(now * 1.7 + room * 0.41) * 0.06;
    focusLight.intensity = (IS_MOBILE ? mood.focusIntensity * 0.72 : mood.focusIntensity) * focusPulse;
    hazeMaterial.opacity = mood.hazeOpacity * (0.88 + Math.sin(now * 0.8 + room) * 0.12);

    const attribute = geometry.getAttribute('position');
    for (let index = 0; index < particleCount; index++) {
      const i = index * 3;
      const seed = seeds[index];
      positions[i] = basePositions[i] + Math.sin(elapsed * 0.55 + seed) * 0.08;
      positions[i + 1] = 0.12 + ((basePositions[i + 1] - 0.12 + elapsed * riseSpeeds[index]) % 3.03);
      positions[i + 2] = basePositions[i + 2] + Math.cos(elapsed * 0.42 + seed) * 0.07;
    }
    attribute.needsUpdate = true;
  };

  root.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
    hazeGeometry.dispose();
    hazeMaterial.dispose();
  };
  return root;
}
