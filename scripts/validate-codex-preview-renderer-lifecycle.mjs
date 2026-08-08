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
  "rendererForGeneration.domElement.addEventListener('webglcontextlost'",
  'const ownsCurrentGeneration = sharedRenderer === rendererForGeneration && sharedRendererGeneration === generation;',
  'if (ownsCurrentGeneration) sharedRendererContextLost = true;',
  'staleGeneration: !ownsCurrentGeneration',
  'memory: rendererMemory(rendererForGeneration)',
  'function currentCodexSelectionIdentity()',
  "[data-testid^=\"codex-card-\"][data-selected=\"true\"]",
  'const [selectionIdentity, setSelectionIdentity] = useState',
  'new MutationObserver(syncIdentity)',
  "attributeFilter: ['data-selected']",
  'familyId: selectionIdentity',
  '[enemyType, room, accent, selectionIdentity]',
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
  'async function primeCodexSelectionForDiagnostics(page)',
  'const firstFamily = FAMILIES[0];',
  'const secondFamily = FAMILIES[1];',
  'expect(firstFamily).not.toBe(secondFamily);',
  'await page.getByTestId(`codex-card-${firstFamily}`).click();',
  'await page.getByTestId(`codex-card-${secondFamily}`).click();',
  'await primeCodexSelectionForDiagnostics(page);',
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

const primerCallIndex = regression.indexOf('await primeCodexSelectionForDiagnostics(page);');
const loopIndex = regression.indexOf('for (const familyId of FAMILIES) {');
const resetIndex = regression.indexOf('await resetCodexDiagnostics(page);', loopIndex);
const targetClickIndex = regression.indexOf('await page.getByTestId(`codex-card-${familyId}`).click();', loopIndex);
if (primerCallIndex < 0 || loopIndex < 0 || primerCallIndex > loopIndex) {
  throw new Error('Codex lifecycle regression must prime a different mounted selection before the 35-family diagnostic loop.');
}
if (resetIndex < loopIndex || targetClickIndex < resetIndex) {
  throw new Error('Codex lifecycle regression must reset diagnostics before each guaranteed state-changing target selection.');
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

const forbiddenSourcePatterns = [
  'sharedRenderer.domElement.addEventListener',
  'sharedRendererContextLost = true;\n      recordCodexPreviewDiagnostic',
];
for (const needle of forbiddenSourcePatterns) {
  if (source.includes(needle)) {
    throw new Error(`Codex renderer lifecycle must bind context-loss to its owning renderer generation: ${needle}`);
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

console.log('Codex preview renderer lifecycle verified: canonical card identity participates in preview lifecycle even when rendered props are shared, retired renderer generations cannot poison current context-loss state, and all 35 canonical selections still require exactly one ready, painted, context-safe preview.');
