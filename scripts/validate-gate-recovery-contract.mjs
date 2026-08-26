import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const recovery = read('.github/workflows/gate-recovery-dispatch.yml');
const fgr = read('.github/workflows/full-game-regression.yml');
const runtime = read('.github/workflows/complete-runtime-evidence-qa.yml');
const playwright = read('artifacts/dungeon-rpg/playwright.regression.config.mjs');

const requireText = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`Gate recovery contract missing ${label}: ${needle}`);
};

requireText(recovery, 'actions: write', 'authenticated Actions dispatch permission');
requireText(recovery, "'fix/mobile-telegraphs-room-21-50-balance'", 'fixed target branch guard');
requireText(recovery, "run.status !== 'queued'", 'queued-state guard');
requireText(recovery, 'jobs.total_count !== 0', 'jobs=[] pre-job zombie guard');
requireText(recovery, "pr.head.sha !== request.exact_head", 'unchanged exact-head guard');
requireText(recovery, "workflow_id: 'full-game-regression.yml'", 'FGR dispatch');
requireText(recovery, "full_evidence: 'true'", 'mandatory FGR full evidence');
requireText(recovery, "workflow_id: 'complete-runtime-evidence-qa.yml'", 'Complete Runtime dispatch');
requireText(recovery, 'assertNoReplacement', 'replacement deduplication');
requireText(recovery, 'issues.createComment', 'durable recovery receipt');

requireText(fgr, 'workflow_dispatch:', 'FGR manual recovery entrypoint');
requireText(fgr, 'full_evidence:', 'FGR full-evidence input');
requireText(fgr, "inputs.full_evidence == true", 'FGR full four-device selection');
requireText(runtime, 'workflow_dispatch:', 'Complete Runtime manual recovery entrypoint');

for (const project of ['iphone-webkit', 'android-chromium', 'ipad-portrait-webkit', 'android-tablet-chromium']) {
  requireText(fgr, `project: ${project}`, `FGR project ${project}`);
  requireText(runtime, `project: ${project}`, `Complete Runtime project ${project}`);
}

requireText(playwright, 'retries: 0', 'Playwright retries=0');

console.log('Gate recovery contract OK: unchanged-head guards, jobs=[] classification, full FGR evidence, four-device Complete Runtime, durable receipts, retries=0.');
