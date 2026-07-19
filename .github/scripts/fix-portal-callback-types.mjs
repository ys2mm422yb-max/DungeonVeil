import fs from 'node:fs';

const path = 'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx';
let source = fs.readFileSync(path, 'utf8');
const replacements = [
  ['portal.userData.vortexLayers.forEach((layer, index) => {', 'portal.userData.vortexLayers.forEach((layer: any, index: number) => {'],
  ['portal.userData.energyRibbons.forEach((ribbon, index) => {', 'portal.userData.energyRibbons.forEach((ribbon: any, index: number) => {'],
  ['portal.userData.runeDiamonds.forEach((rune, index) => {', 'portal.userData.runeDiamonds.forEach((rune: any, index: number) => {'],
  ['portal.userData.motes.forEach((mote, index) => {', 'portal.userData.motes.forEach((mote: any, index: number) => {'],
];
for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Missing portal callback anchor: ${before}`);
  source = source.replace(before, after);
}
fs.writeFileSync(path, source);
console.log('Portal animation callback parameters explicitly typed.');
