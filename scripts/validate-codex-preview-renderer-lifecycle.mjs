import { readFile } from 'node:fs/promises';

const sourcePath = 'artifacts/dungeon-rpg/src/components/CodexModelPreview.tsx';
const regressionPath = 'artifacts/dungeon-rpg/tests/enemy-roster-visual-evidence.spec.mjs';
const [source, regression] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(regressionPath, 'utf8'),
]);

const sourceRequired = [
  'let sharedRendererGeneration = 0;',
  'let sharedRendererContextLost = false;',
  'function rendererMemory(renderer: any)',
  'window as any',
  '__dungeonVeilCodexPreviewDiagnostics',
  "phase: 'acquire'",
  "phase: 'paint-attempt'",
  "phase: 'ready'",
  "phase: 'error'",
  "phase: 'context-lost'",
  "phase: 'release'",
  "sharedRenderer.domElement.addEventListener('webglcontextlost'",
  'generation: sharedRendererGeneration',
  'previewCount: sharedRendererPreviewCount',
  'contextLost:',
  'memory: rendererMemory(renderer)',
];

for (const needle of sourceRequired) {
  if (!source.includes(needle)) {
    throw new Error(`Codex preview runtime diagnostics contract missing: ${needle}`);
  }
}

const regressionRequired = [
  "test('complete canonical enemy roster is visibly reviewable in Codex and deterministic combat'",
  "window.__dungeonVeilCodexPreviewDiagnostics = [];",
  'async function attachCodexDiagnostics(page, testInfo, familyId)',
  "codex-renderer-diagnostics-${familyId}",
  'codex-renderer-diagnostics-full-sequence',
  'expect(FAMILIES).toHaveLength(35);',
  "expect(fullDiagnostics.filter(entry => entry?.phase === 'ready')).toHaveLength(35);",
  "expect(ready?.painted, `ready diagnostic not painted for ${familyId}`).toBe(true);",
  "expect(ready?.contextLost, `renderer context lost before ${familyId} became ready`).toBe(false);",
];

for (const needle of regressionRequired) {
  if (!regression.includes(needle)) {
    throw new Error(`Codex 35-family runtime regression diagnostics missing: ${needle}`);
  }
}

const familyBlock = regression.match(/const FAMILIES = \[([\s\S]*?)\];/);
if (!familyBlock) throw new Error('Codex lifecycle contract cannot find the canonical FAMILIES sequence.');
const familyCount = [...familyBlock[1].matchAll(/'[^']+'/g)].length;
if (familyCount !== 35) {
  throw new Error(`Codex lifecycle regression must exercise exactly 35 canonical families; found ${familyCount}.`);
}

if (source.includes('verified iPhone-safe bound') || source.includes('iPhone-safe bound')) {
  throw new Error('Codex lifecycle source must not claim a preview-count constant is proven iPhone-safe.');
}

console.log('Codex preview renderer lifecycle verified: the real 35-family regression captures renderer generation, context-loss, paint-attempt and memory diagnostics for every selected family.');
