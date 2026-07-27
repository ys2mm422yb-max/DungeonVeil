import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = path.join(root, 'src/game/controlledKayKitRegistry.ts');
const runtimePath = path.join(root, 'src/game/controlledKayKitRuntime.ts');
const mainPath = path.join(root, 'src/main.tsx');
const assetDir = path.join(root, 'public/assets/kaykit-controlled');
const failures = [];

if (!fs.existsSync(registryPath)) failures.push('controlled KayKit registry missing');
if (!fs.existsSync(runtimePath)) failures.push('controlled KayKit runtime missing');
const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
const runtime = fs.existsSync(runtimePath) ? fs.readFileSync(runtimePath, 'utf8') : '';
const main = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
const expected = [{ file: 'Necromancer.glb', use: 'guild-raid-boss-veiled-archon', max: 750000 }];

for (const entry of expected) {
  const target = path.join(assetDir, entry.file);
  if (!fs.existsSync(target)) failures.push(`missing controlled asset: ${entry.file}`);
  else {
    const size = fs.statSync(target).size;
    if (size < 512) failures.push(`truncated controlled asset: ${entry.file}`);
    if (size > entry.max) failures.push(`controlled asset exceeds budget: ${entry.file} (${size} > ${entry.max})`);
  }
  if (!registry.includes(entry.file)) failures.push(`registry does not reference ${entry.file}`);
  if (!registry.includes(entry.use)) failures.push(`registry lacks concrete runtime use for ${entry.file}`);
}

const license = path.join(assetDir, 'LICENSE-KAYKIT-SKELETONS.txt');
if (!fs.existsSync(license) || !fs.readFileSync(license, 'utf8').includes('Creative Commons Zero')) failures.push('KayKit Skeletons CC0 license missing');

const files = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
for (const file of files) {
  if (!/\.(glb|txt)$/i.test(file)) failures.push(`disallowed controlled asset type: ${file}`);
  if (/\.(zip|blend|fbx|obj)$/i.test(file)) failures.push(`source/export file leaked into runtime assets: ${file}`);
}
if (files.filter(file => file.endsWith('.glb')).length !== expected.length) failures.push('unreferenced or unexpected controlled GLB present');

for (const contract of [
  ['runtime imports controlled registry', runtime.includes("controlledKayKitModel")],
  ['runtime loads local GLTFLoader', runtime.includes("three/addons/loaders/GLTFLoader.js")],
  ['runtime mounts only inside raid boss panel', runtime.includes("guild-raid-boss-panel")],
  ['runtime exposes evidence selector', runtime.includes("controlled-kaykit-veiled-archon")],
  ['runtime has visible non-WebGL fallback', runtime.includes("VEILED ARCHON")],
  ['runtime disposes renderer', runtime.includes("renderer?.dispose()")],
  ['runtime caps mobile pixel ratio', runtime.includes("Math.min(window.devicePixelRatio || 1, 1.5)")],
  ['main installs controlled runtime', main.includes('installControlledKayKitRuntime();')],
]) {
  if (!contract[1]) failures.push(contract[0]);
}

if (failures.length) {
  console.error('Block 15 controlled KayKit validation failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Block 15 controlled KayKit asset, license, visible runtime, fallback and size contracts verified.');
