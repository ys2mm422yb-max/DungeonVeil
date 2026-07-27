export const CONTROLLED_KAYKIT_MODELS = {
  veiledArchon: {
    path: 'assets/kaykit-controlled/Necromancer.glb',
    sourcePr: 315,
    sourcePackage: 'KayKit_Skeletons_1.1_EXTRA',
    licensePath: 'assets/kaykit-controlled/LICENSE-KAYKIT-SKELETONS.txt',
    runtimeUse: 'guild-raid-boss-veiled-archon',
    fallback: 'existing-demon-visual',
    maxBytes: 750000,
    targetHeight: 1.7,
    rotationY: Math.PI,
  },
} as const;

export type ControlledKayKitModelId = keyof typeof CONTROLLED_KAYKIT_MODELS;

export function controlledKayKitModel(id: ControlledKayKitModelId) {
  return CONTROLLED_KAYKIT_MODELS[id];
}
