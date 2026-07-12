import fs from 'node:fs';
import path from 'node:path';

const buildRoot = path.resolve(process.argv[2] ?? 'dist/public');
const expectedBase = process.env.EXPECTED_BASE_PATH ?? '/DungeonVeil/';
const expectedAssetPrefix = `${expectedBase.replace(/\/$/, '')}/assets/`;
const runtimeExtensions = new Set(['.html', '.js', '.mjs']);

if (!fs.existsSync(buildRoot)) {
  throw new Error(`Pages build directory does not exist: ${buildRoot}`);
}

const runtimeFiles = [];
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (runtimeExtensions.has(path.extname(entry.name))) runtimeFiles.push(fullPath);
  }
};
walk(buildRoot);

if (!runtimeFiles.length) throw new Error('No built HTML or JavaScript runtime files were found.');
if (!fs.existsSync(path.join(buildRoot, 'index.html'))) throw new Error('Built index.html is missing.');

const rootRelativeAssetPattern = /(["'`])\/assets\//g;
const invalidReferences = [];
let combinedJavaScript = '';

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (/\.(?:m?js)$/.test(file)) combinedJavaScript += `${source}\n`;

  for (const match of source.matchAll(rootRelativeAssetPattern)) {
    const before = source.slice(Math.max(0, match.index - 70), match.index);
    if (before.endsWith(expectedBase.replace(/\/$/, ''))) continue;
    const context = source
      .slice(Math.max(0, match.index - 180), Math.min(source.length, match.index + 260))
      .replace(/\s+/g, ' ');
    invalidReferences.push(`${path.relative(buildRoot, file)}\n${context}`);
  }
}

if (invalidReferences.length) {
  throw new Error(`Root-relative asset references would break on GitHub Pages:\n${invalidReferences.join('\n---\n')}`);
}

if (!combinedJavaScript.includes(expectedAssetPrefix)) {
  throw new Error(`Expected Pages asset prefix is missing from built JavaScript: ${expectedAssetPrefix}`);
}

const manifestPath = path.join(buildRoot, 'assets', 'kaykit', 'manifest.json');
if (!fs.existsSync(manifestPath)) throw new Error('KayKit manifest is missing from the Pages artifact.');

const requiredAssetDirectories = [
  path.join(buildRoot, 'assets', 'kaykit'),
  path.join(buildRoot, 'assets', 'imported'),
];
for (const directory of requiredAssetDirectories) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Required asset directory is missing: ${path.relative(buildRoot, directory)}`);
  }
}

console.log(`Pages build verified: ${runtimeFiles.length} runtime files, base ${expectedBase}, KayKit and imported assets present.`);
