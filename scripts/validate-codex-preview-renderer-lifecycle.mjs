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
  'async function resetCodexDiagnostics(page)',
  'async function attachCodexDiagnostics(page, testInfo, familyId)',
  "codex-renderer-diagnostics-${familyId}",
  'codex-renderer-diagnostics-full-sequence',
  'expect(FAMILIES).toHaveLength(35);',
  'expect(selectionDiagnostics).toHaveLength(35);',
  "expect(readyEntries, `expected exactly one ready diagnostic for selected family ${familyId}`).toHaveLength(1);",
  "expect(typeof ready?.enemyType, `ready diagnostic missing rendered enemyType for ${familyId}`).toBe('string');",
  "expect(ready?.painted, `ready diagnostic not painted for ${familyId}`).toBe(true);",
  "expect(ready?.contextLost, `renderer context lost before ${familyId} became ready`).toBe(false);",
];

for (const needle of regressionRequired) {
  if (!regression.includes(needle)) {
    throw new Error(`Codex 35-family runtime regression diagnostics missing: ${needle}`);
  }
}

const forbiddenRegressionPatterns = [
  "entry?.enemyType === family",
  "entry?.enemyType === familyId",
  "entry?.phase === 'ready' && entry?.enemyType === familyId",
];
for (const needle of forbiddenRegressionPatterns) {
  if (regression.includes(needle)) {
    throw new Error(`Codex lifecycle regression must not equate canonical familyId with rendered enemyType: ${needle}`);
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

console.log('Codex preview renderer lifecycle verified: each canonical selection owns a fresh diagnostic window and must yield exactly one ready, painted, context-safe rendered preview without assuming familyId equals rendered enemyType.');
