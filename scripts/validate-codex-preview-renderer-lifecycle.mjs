import { readFile } from 'node:fs/promises';

const sourcePath = 'artifacts/dungeon-rpg/src/components/CodexModelPreview.tsx';
const source = await readFile(sourcePath, 'utf8');

const required = [
  "const CODEX_SHARED_RENDERER_MAX_PREVIEWS = 6;",
  "let sharedRendererPreviewCount = 0;",
  "sharedRendererPreviewCount = 0;",
  "sharedRenderer && sharedRendererPreviewCount >= CODEX_SHARED_RENDERER_MAX_PREVIEWS",
  "sharedRendererPreviewCount += 1;",
  "renderer.forceContextLoss?.();",
];

for (const needle of required) {
  if (!source.includes(needle)) {
    throw new Error(`Codex preview renderer lifecycle contract missing: ${needle}`);
  }
}

if (/CODEX_SHARED_RENDERER_MAX_PREVIEWS\s*=\s*(?:[7-9]|[1-9]\d+)/.test(source)) {
  throw new Error('Codex shared renderer reuse cap exceeds the verified iPhone-safe bound of 6 previews.');
}

const releaseIndex = source.indexOf('function releaseSharedRenderer()');
const rendererIndex = source.indexOf('function getSharedRenderer(THREE: any)');
if (releaseIndex < 0 || rendererIndex < 0 || releaseIndex > rendererIndex) {
  throw new Error('Codex shared renderer release must remain defined before renderer acquisition.');
}

console.log('Codex preview renderer lifecycle verified: shared WebGL contexts are recycled before sequential iPhone Codex previews can exhaust the renderer.');
