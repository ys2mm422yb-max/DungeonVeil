import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '..', '..');

function read(relativePath) {
  const file = path.join(repoRoot, relativePath);
  if (!fs.existsSync(file)) throw new Error(`Missing required licensing file: ${relativePath}`);
  return fs.readFileSync(file, 'utf8');
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

const license = read('LICENSE');
const copyright = read('COPYRIGHT.md');
const thirdParty = read('THIRD_PARTY_LICENSES.md');
const readme = read('README.md');
const packageJson = JSON.parse(read('package.json'));
const kaykitLicense = read('artifacts/dungeon-rpg/public/assets/kaykit-controlled/LICENSE-KAYKIT-SKELETONS.txt');
const registry = read('artifacts/dungeon-rpg/src/game/controlledKayKitRegistry.ts');
const vite = read('artifacts/dungeon-rpg/vite.config.ts');

requireText(license, 'All rights reserved', 'Root LICENSE must state the proprietary rights reservation');
requireText(license, 'Public availability', 'Root LICENSE must explain that public visibility is not a usage grant');
requireText(license, 'Third-party software and assets remain governed by their respective licenses', 'Root LICENSE must preserve third-party rights');
requireText(copyright, 'Maximilian Trost', 'COPYRIGHT.md must identify the rights holder');
requireText(copyright, 'THIRD_PARTY_LICENSES.md', 'COPYRIGHT.md must link the third-party notice');
requireText(thirdParty, 'KayKit Character Pack: Skeletons 1.1', 'Third-party notice must identify the integrated KayKit pack');
requireText(thirdParty, 'CC0-1.0', 'Third-party notice must state the KayKit license identifier');
requireText(thirdParty, 'Three.js', 'Third-party notice must identify the local Three.js runtime');
requireText(thirdParty, '0.180.0', 'Third-party notice must state the pinned Three.js version');
requireText(readme, '[`LICENSE`](LICENSE)', 'README must link the proprietary license');
requireText(readme, '[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md)', 'README must link the third-party notice');
if (packageJson.license !== 'UNLICENSED') {
  throw new Error('Root package.json must use the UNLICENSED identifier and must not advertise an open-source license');
}
requireText(kaykitLicense, 'Creative Commons Zero, CC0', 'KayKit runtime notice must preserve the upstream CC0 statement');
requireText(registry, 'LICENSE-KAYKIT-SKELETONS.txt', 'Runtime registry must keep the KayKit notice path associated with the model');
requireText(vite, "'LICENSE'", 'The local Three.js build must preserve the upstream LICENSE file');

console.log('Block 16 licensing contract verified: proprietary package metadata, copyright, third-party notices and runtime asset licenses are present.');
