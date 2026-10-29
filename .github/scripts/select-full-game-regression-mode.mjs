#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';

const START = '<!-- full-game-regression-selection:start -->';
const END = '<!-- full-game-regression-selection:end -->';
const MODES = new Set(['omit', 'smoke', 'full']);
const BINDING_CONCLUSIONS = new Set([
  'action_required',
  'cancelled',
  'failure',
  'stale',
  'timed_out',
]);

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function defaultMode(draft) {
  return draft ? 'smoke' : 'full';
}

function parseBoolean(value, label) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${label} must be true or false.`);
}

function canonicalChangedFiles(files) {
  const normalized = files
    .map((file) => file.trim().replaceAll('\\\\', '/'))
    .filter(Boolean)
    .sort();
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Exact-head changed-file list contains duplicates.');
  }
  for (const file of normalized) {
    if (file.startsWith('/') || file.includes('../')) {
      throw new Error(`Unsafe changed-file path: ${file}`);
    }
  }
  return normalized;
}

function isSafeOmitFile(file) {
  if (file === 'docs/ADAPTIVE_TEST_POLICY.md') return false;
  return (
    /^docs\/.+\.md$/i.test(file) ||
    /^scripts\/[^/]+\.json$/i.test(file) ||
    /^scripts\/verify-[^/]+\.mjs$/i.test(file) ||
    /^artifacts\/dungeon-rpg\/tests\/[^/]+\.contract\.mjs$/i.test(file)
  );
}

function parseSelection(body) {
  const starts = body.split(START).length - 1;
  const ends = body.split(END).length - 1;
  if (starts === 0 && ends === 0) return { status: 'missing', requested: null };
  if (starts !== 1 || ends !== 1) return { status: 'invalid', requested: null };

  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (end <= start) return { status: 'invalid', requested: null };
  const block = body.slice(start + START.length, end);
  const modeMatches = [
    ...block.matchAll(/### Requested Full Game Regression mode\s*\n\s*`(omit|smoke|full)`/gi),
  ];
  const rationaleMatch = block.match(
    /### Selection rationale\s*\n([\s\S]*?)(?=\n### |$)/i,
  );
  if (modeMatches.length !== 1 || !rationaleMatch) {
    return { status: 'invalid', requested: null };
  }
  const rationale = rationaleMatch[1].trim();
  if (rationale.length < 20 || /replace|todo|tbd/i.test(rationale)) {
    return { status: 'invalid', requested: null };
  }
  const requested = modeMatches[0][1].toLowerCase();
  if (!MODES.has(requested)) return { status: 'invalid', requested: null };
  return { status: 'valid', requested, rationale };
}

function parseAdaptivePlanResult(text) {
  const match = text.match(
    /Adaptive PR test plan passed for risk=(low|medium|high|critical), domains=([^:]+):/,
  );
  if (!match) return { status: 'invalid', risk: null, domains: null };
  return {
    status: 'valid',
    risk: match[1],
    domains: match[2].trim(),
  };
}

function parseBindingHistory(text) {
  const conclusions = text
    .split(/\s+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (conclusions.length === 0 || conclusions.includes('unknown')) {
    return { status: 'unknown', conclusions };
  }
  const binding = conclusions.filter((value) => BINDING_CONCLUSIONS.has(value));
  if (binding.length > 0) return { status: 'binding', conclusions };
  if (conclusions.some((value) => value !== 'success')) {
    return { status: 'unknown', conclusions };
  }
  return { status: 'clear', conclusions };
}

function resolveMode({ eventName, draft, body, changedFiles, adaptivePlan, bindingHistory }) {
  if (eventName !== 'pull_request') {
    return { requested: null, resolved: 'full', reasons: ['non_pull_request_full'] };
  }

  const fallback = defaultMode(draft);
  const selection = parseSelection(body);
  const reasons = [];
  if (selection.status !== 'valid') {
    reasons.push(`selection_${selection.status}_fail_closed`);
    return { requested: selection.requested, resolved: fallback, reasons };
  }
  if (adaptivePlan.status !== 'valid') {
    reasons.push('adaptive_plan_invalid_fail_closed');
    return { requested: selection.requested, resolved: fallback, reasons };
  }
  if (bindingHistory.status !== 'clear') {
    reasons.push(`binding_history_${bindingHistory.status}_fail_closed`);
    return { requested: selection.requested, resolved: fallback, reasons };
  }
  if (selection.requested === 'full') {
    return { requested: 'full', resolved: 'full', reasons: ['explicit_full'] };
  }
  if (selection.requested === 'smoke') {
    return {
      requested: 'smoke',
      resolved: draft ? 'smoke' : 'full',
      reasons: [draft ? 'explicit_draft_smoke' : 'ready_pr_requires_full'],
    };
  }

  const unsafe = changedFiles.filter((file) => !isSafeOmitFile(file));
  if (changedFiles.length === 0) {
    reasons.push('empty_changed_file_set_fail_closed');
    return { requested: 'omit', resolved: fallback, reasons };
  }
  if (unsafe.length > 0) {
    reasons.push('unsafe_changed_files_fail_closed', ...unsafe.map((file) => `unsafe:${file}`));
    return { requested: 'omit', resolved: fallback, reasons };
  }
  return { requested: 'omit', resolved: 'omit', reasons: ['safe_contract_only_diff'] };
}

function changedFilesDigest(files) {
  return createHash('sha256').update(`${files.join('\n')}\n`).digest('hex');
}

function makeReceipt({ eventName, baseSha, headSha, draft, changedFiles, adaptivePlan, bindingHistory, resolution }) {
  return {
    schema_version: 1,
    event_name: eventName,
    base_sha: baseSha || null,
    head_sha: headSha || null,
    draft: eventName === 'pull_request' ? draft : null,
    requested_mode: resolution.requested,
    resolved_mode: resolution.resolved,
    reasons: resolution.reasons,
    adaptive_plan: adaptivePlan,
    binding_history: bindingHistory,
    changed_file_count: changedFiles.length,
    changed_files_sha256: changedFilesDigest(changedFiles),
    changed_files: changedFiles,
  };
}

function selectionBlock(mode = 'omit') {
  return `${START}\n### Requested Full Game Regression mode\n\`${mode}\`\n\n### Selection rationale\nOnly repository contracts and documentation changed; executable game and browser surfaces are untouched.\n${END}`;
}

function expectResolution(fixture, expected, label) {
  const actual = resolveMode(fixture);
  if (actual.resolved !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual.resolved} (${actual.reasons.join(', ')})`);
  }
  return actual;
}

function selfTest() {
  const validPlan = { status: 'valid', risk: 'critical', domains: 'process, workflow' };
  const clearHistory = { status: 'clear', conclusions: ['success'] };
  const base = {
    eventName: 'pull_request',
    draft: true,
    body: selectionBlock(),
    adaptivePlan: validPlan,
    bindingHistory: clearHistory,
  };

  expectResolution({ ...base, changedFiles: [
    'docs/DUO_AUTHORITY_PRODUCTION_ROLLOUT.md',
    'scripts/duo-authority-production-history.json',
    'scripts/verify-duo-authority-production-plan.mjs',
    'artifacts/dungeon-rpg/tests/duo-authority-production-rollout.contract.mjs',
  ] }, 'omit', 'PR #493-like safe contract diff');
  expectResolution({ ...base, changedFiles: [
    'docs/SOCIAL_PROFILE_TRUST_BOUNDARY.md',
    'artifacts/dungeon-rpg/tests/social-profile-trust-boundary.contract.mjs',
  ] }, 'omit', 'PR #492-like safe contract diff');

  for (const file of [
    'artifacts/dungeon-rpg/src/game/GameCanvas.tsx',
    'artifacts/dungeon-rpg/public/models/rat.glb',
    'artifacts/dungeon-rpg/tests/full-game-smoke.spec.mjs',
    'artifacts/dungeon-rpg/playwright.regression.config.mjs',
    'artifacts/dungeon-rpg/package.json',
    'pnpm-lock.yaml',
    '.github/workflows/full-game-regression.yml',
    '.github/scripts/select-full-game-regression-mode.mjs',
  ]) {
    expectResolution({ ...base, changedFiles: [file] }, 'smoke', `draft unsafe diff ${file}`);
    expectResolution({ ...base, draft: false, changedFiles: [file] }, 'full', `ready unsafe diff ${file}`);
  }

  expectResolution({ ...base, body: '', changedFiles: ['docs/README.md'] }, 'smoke', 'missing selection');
  expectResolution({ ...base, body: `${START}\n\`omit\`\n${END}`, changedFiles: ['docs/README.md'] }, 'smoke', 'malformed selection');
  expectResolution({ ...base, body: `${selectionBlock()}\n${selectionBlock('full')}`, changedFiles: ['docs/README.md'] }, 'smoke', 'contradictory selection');
  expectResolution({ ...base, adaptivePlan: { status: 'invalid' }, changedFiles: ['docs/README.md'] }, 'smoke', 'invalid adaptive plan');
  expectResolution({ ...base, bindingHistory: { status: 'binding', conclusions: ['failure'] }, changedFiles: ['docs/README.md'] }, 'smoke', 'binding failure');
  expectResolution({ ...base, bindingHistory: { status: 'unknown', conclusions: ['unknown'] }, changedFiles: ['docs/README.md'] }, 'smoke', 'unknown binding history');
  expectResolution({ ...base, eventName: 'push', changedFiles: [] }, 'full', 'target push');
  expectResolution({ ...base, eventName: 'workflow_dispatch', changedFiles: [] }, 'full', 'manual run');

  const changedFiles = canonicalChangedFiles(['docs/z.md', 'docs/a.md']);
  const resolution = expectResolution({ ...base, changedFiles }, 'omit', 'deterministic receipt');
  const receiptA = makeReceipt({
    eventName: 'pull_request', baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40), draft: true,
    changedFiles, adaptivePlan: validPlan, bindingHistory: clearHistory, resolution,
  });
  const receiptB = makeReceipt({
    eventName: 'pull_request', baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40), draft: true,
    changedFiles: canonicalChangedFiles(['docs/a.md', 'docs/z.md']), adaptivePlan: validPlan,
    bindingHistory: clearHistory, resolution,
  });
  if (JSON.stringify(receiptA) !== JSON.stringify(receiptB)) {
    throw new Error('Exact-head selection receipt is not deterministic.');
  }

  const workflow = fs.readFileSync(new URL('../workflows/full-game-regression.yml', import.meta.url), 'utf8');
  const planStart = workflow.indexOf('\n  fgr-plan:');
  const staticStart = workflow.indexOf('\n  static-regression:');
  if (planStart < 0 || staticStart <= planStart) throw new Error('FGR plan job must precede static regression.');
  const planJob = workflow.slice(planStart, staticStart);
  for (const forbidden of ['pnpm install', 'pnpm/action-setup', 'actions/setup-node', 'playwright install', ' run build']) {
    if (planJob.includes(forbidden)) throw new Error(`FGR plan job contains expensive work: ${forbidden}`);
  }
  for (const contract of [
    "needs.fgr-plan.outputs.mode != 'omit'",
    "needs.fgr-plan.outputs.mode == 'smoke'",
    "needs.fgr-plan.outputs.mode == 'full'",
    'full-game-regression-selection-${{ github.event.pull_request.head.sha || github.sha }}',
  ]) {
    if (!workflow.includes(contract)) throw new Error(`FGR workflow selection contract missing: ${contract}`);
  }
  console.log('Adaptive Full Game Regression selector self-test passed.');
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

const eventName = arg('--event') ?? process.env.GITHUB_EVENT_NAME ?? '';
const bodyFile = arg('--body-file');
const changedFilesFile = arg('--changed-files');
const adaptivePlanFile = arg('--adaptive-plan-result');
const bindingHistoryFile = arg('--binding-history');
const output = arg('--output');
const receiptPath = arg('--receipt');
const baseSha = arg('--base-sha') ?? '';
const headSha = arg('--head-sha') ?? '';
const draft = eventName === 'pull_request' ? parseBoolean(arg('--draft') ?? '', '--draft') : false;

if (!output || !receiptPath) throw new Error('--output and --receipt are required.');
if (eventName === 'pull_request') {
  if (!/^[a-f0-9]{40}$/.test(baseSha) || !/^[a-f0-9]{40}$/.test(headSha)) {
    throw new Error('Pull-request selection requires exact 40-character base and head SHAs.');
  }
  for (const [label, value] of [
    ['--body-file', bodyFile],
    ['--changed-files', changedFilesFile],
    ['--adaptive-plan-result', adaptivePlanFile],
    ['--binding-history', bindingHistoryFile],
  ]) {
    if (!value) throw new Error(`${label} is required for pull-request selection.`);
  }
}

const body = bodyFile ? fs.readFileSync(bodyFile, 'utf8') : '';
const changedFiles = canonicalChangedFiles(
  changedFilesFile ? fs.readFileSync(changedFilesFile, 'utf8').split(/\r?\n/) : [],
);
const adaptivePlan = adaptivePlanFile
  ? parseAdaptivePlanResult(fs.readFileSync(adaptivePlanFile, 'utf8'))
  : { status: eventName === 'pull_request' ? 'invalid' : 'not_applicable', risk: null, domains: null };
const bindingHistory = bindingHistoryFile
  ? parseBindingHistory(fs.readFileSync(bindingHistoryFile, 'utf8'))
  : { status: eventName === 'pull_request' ? 'unknown' : 'not_applicable', conclusions: [] };
const resolution = resolveMode({ eventName, draft, body, changedFiles, adaptivePlan, bindingHistory });
const receipt = makeReceipt({ eventName, baseSha, headSha, draft, changedFiles, adaptivePlan, bindingHistory, resolution });

fs.writeFileSync(output, `${resolution.resolved}\n`);
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Full Game Regression mode=${resolution.resolved}: ${resolution.reasons.join(', ')}`);
