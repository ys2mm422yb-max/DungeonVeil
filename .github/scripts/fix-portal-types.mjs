import fs from 'node:fs';

const path = 'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx';
let source = fs.readFileSync(path, 'utf8');
const replacements = [
  ['        const vortexLayers = [];', '        const vortexLayers: any[] = [];'],
  ['        const energyRibbons = [];', '        const energyRibbons: any[] = [];'],
  ['        const runeDiamonds = [];', '        const runeDiamonds: any[] = [];'],
  ['        const motes = [];', '        const motes: any[] = [];'],
];
for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Missing portal type anchor: ${before}`);
  source = source.replace(before, after);
}
fs.writeFileSync(path, source);
console.log('Portal visual collections explicitly typed.');
