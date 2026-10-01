import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SPEC_FILE = 'player-death-state.spec.mjs';
const TEST_TITLE = 'solo death uses an explicit visual death state before the final overlay';
const ALLOWED_PROJECTS = new Set(['android-chromium', 'android-tablet-chromium']);
const STAGING_PREFIX = 'player-death-success-evidence';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message) {
  throw new Error(`Player-death success evidence rejected: ${message}`);
}

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) fail(`invalid argument sequence at ${key ?? '<end>'}`);
    values.set(key.slice(2), value);
  }
  const required = ['report', 'results-root', 'output-root', 'project', 'head-sha', 'checkout-sha', 'run-id', 'run-attempt'];
  for (const key of required) if (!values.get(key)) fail(`missing --${key}`);
  return Object.fromEntries(values);
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function relativeWithin(root, candidate) {
  if (!isWithin(root, candidate)) fail(`path escapes results root: ${candidate}`);
  return path.relative(root, candidate).split(path.sep).join('/');
}

async function regularRealFile(filePath, root) {
  const metadata = await fs.lstat(filePath).catch(() => null);
  if (!metadata?.isFile() || metadata.isSymbolicLink()) fail(`expected a regular non-symlink file: ${filePath}`);
  const real = await fs.realpath(filePath);
  relativeWithin(root, real);
  return real;
}

async function resolveAttachment(attachmentPath, reportPath, resultsRoot) {
  if (!attachmentPath) fail('matched video attachment has no path');
  const candidates = path.isAbsolute(attachmentPath)
    ? [attachmentPath]
    : [path.resolve(process.cwd(), attachmentPath), path.resolve(path.dirname(reportPath), attachmentPath)];
  const matches = [];
  for (const candidate of candidates) {
    const metadata = await fs.stat(candidate).catch(() => null);
    if (!metadata?.isFile()) continue;
    const real = await fs.realpath(candidate);
    if (isWithin(resultsRoot, real) && !matches.includes(real)) matches.push(real);
  }
  if (matches.length !== 1) fail(`video attachment must resolve exactly once inside results root, found ${matches.length}`);
  return regularRealFile(matches[0], resultsRoot);
}

function collectMatches(report, project) {
  const matches = [];
  const visitSuite = (suite, inheritedFile = '') => {
    const suiteFile = suite.file || inheritedFile;
    for (const spec of suite.specs || []) {
      const specFile = spec.file || suiteFile;
      if (path.basename(specFile || '') !== SPEC_FILE || spec.title !== TEST_TITLE) continue;
      for (const test of spec.tests || []) {
        if (test.projectName === project) matches.push({ spec, test });
      }
    }
    for (const child of suite.suites || []) visitSuite(child, child.file || suiteFile);
  };
  for (const suite of report.suites || []) visitSuite(suite);
  return matches;
}

function validateTrace(trace, project) {
  if (trace.project !== project) fail(`trace project ${trace.project ?? '<missing>'} does not match ${project}`);
  if (!Number.isFinite(trace.deathSequenceObservedMs) || trace.deathSequenceObservedMs < 0 || trace.deathSequenceObservedMs > 2_000) {
    fail(`deathSequenceObservedMs must be finite and within 0..2000, found ${trace.deathSequenceObservedMs}`);
  }
  if (!Array.isArray(trace.deathSequenceStates) || !trace.deathSequenceStates.includes('settling') || !trace.deathSequenceStates.includes('settled')) {
    fail('deathSequenceStates must contain settling and settled');
  }
  if (trace.deathSequenceStates.indexOf('settling') > trace.deathSequenceStates.lastIndexOf('settled')) {
    fail('deathSequenceStates must transition from settling to settled');
  }
  if (trace.deathSequence !== 'settled') fail(`terminal deathSequence must be settled, found ${trace.deathSequence}`);
  if (!Number.isFinite(trace.deathSequenceCommittedAt)) fail('deathSequenceCommittedAt must be finite');
  if (trace.rendererDeathState !== 'active') fail(`rendererDeathState must be active, found ${trace.rendererDeathState}`);
  if (trace.terminalRenderMode !== 'frozen-final-pose') fail(`terminalRenderMode must be frozen-final-pose, found ${trace.terminalRenderMode}`);
  if (trace.terminalRenderFrames !== 1) fail(`terminalRenderFrames must be 1, found ${trace.terminalRenderFrames}`);
  if (trace.after?.status !== 'gameover' || !Number.isFinite(trace.after?.hp) || trace.after.hp > 0) fail('trace must end in gameover with non-positive HP');
  if (trace.postDeathAttackBlocked !== true || !Number.isFinite(trace.postDeathAttackObservedMs) || trace.postDeathAttackObservedMs < 750) {
    fail('trace must prove attacks stayed blocked for the full 750 ms post-death window');
  }
}

async function digest(filePath) {
  const bytes = await fs.readFile(filePath);
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

async function copyEvidence(source, destination, resultsRoot, category) {
  await fs.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
  const sourceDigest = await digest(source);
  const stagedDigest = await digest(destination);
  if (sourceDigest.sha256 !== stagedDigest.sha256 || sourceDigest.bytes !== stagedDigest.bytes) fail(`copy integrity mismatch for ${source}`);
  return {
    category,
    sourcePath: relativeWithin(resultsRoot, source),
    stagedName: path.basename(destination),
    ...stagedDigest,
  };
}

async function writeMetadata(directory, manifest, files) {
  await fs.writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify({ ...manifest, artifactFiles: files }, null, 2)}\n`);
  const sums = files.map(file => `${file.sha256}  ${file.stagedName}`).join('\n');
  await fs.writeFile(path.join(directory, 'SHA256SUMS'), `${sums}\n`);
}

export async function prepareEvidence(options) {
  const project = options.project;
  if (!ALLOWED_PROJECTS.has(project)) fail(`unsupported project ${project}`);
  for (const field of ['head-sha', 'checkout-sha']) {
    if (!/^[0-9a-f]{40}$/.test(options[field])) fail(`${field} must be a lowercase 40-character commit SHA`);
  }
  if (!/^\d+$/.test(options['run-id']) || !/^\d+$/.test(options['run-attempt'])) fail('run-id and run-attempt must be positive integers');

  const reportPath = await fs.realpath(path.resolve(options.report));
  const resultsRoot = await fs.realpath(path.resolve(options['results-root']));
  relativeWithin(resultsRoot, reportPath);
  const outputRoot = path.resolve(options['output-root']);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (!path.basename(outputRoot).startsWith(STAGING_PREFIX) || !isWithin(temporaryRoot, outputRoot) || isWithin(resultsRoot, outputRoot) || outputRoot === resultsRoot) {
    fail(`output root must be a dedicated ${STAGING_PREFIX}* directory outside test results`);
  }

  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const matches = collectMatches(report, project);
  if (matches.length !== 1) fail(`expected one exact report match, found ${matches.length}`);
  const { test } = matches[0];
  if (test.status !== 'expected') fail(`matched test status must be expected, found ${test.status}`);
  if (!Array.isArray(test.results) || test.results.length !== 1) fail(`matched test must have one non-retried result, found ${test.results?.length ?? 0}`);
  const result = test.results[0];
  if (result.status !== 'passed' || Number(result.retry || 0) !== 0) fail(`matched result must be passed with retry 0, found ${result.status}/${result.retry ?? 0}`);
  const videoAttachments = (result.attachments || []).filter(attachment => attachment.contentType === 'video/webm' || attachment.path?.endsWith('.webm'));
  if (videoAttachments.length !== 1) fail(`expected one WebM attachment, found ${videoAttachments.length}`);

  const video = await resolveAttachment(videoAttachments[0].path, reportPath, resultsRoot);
  const sourceDirectory = path.dirname(video);
  const trace = await regularRealFile(path.join(sourceDirectory, `player-death-solo-${project}.trace.json`), resultsRoot);
  const screenshot = await regularRealFile(path.join(sourceDirectory, `player-death-solo-${project}.png`), resultsRoot);
  const traceJson = JSON.parse(await fs.readFile(trace, 'utf8'));
  validateTrace(traceJson, project);
  const png = await fs.readFile(screenshot);
  if (png.length < PNG_SIGNATURE.length || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) fail('screenshot is not a valid PNG');

  await fs.rm(outputRoot, { recursive: true, force: true });
  const videoDirectory = path.join(outputRoot, 'video');
  const evidenceDirectory = path.join(outputRoot, 'evidence');
  await fs.mkdir(videoDirectory, { recursive: true });
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const files = [
    await copyEvidence(video, path.join(videoDirectory, `player-death-solo-${project}.webm`), resultsRoot, 'video'),
    await copyEvidence(trace, path.join(evidenceDirectory, path.basename(trace)), resultsRoot, 'trace'),
    await copyEvidence(screenshot, path.join(evidenceDirectory, path.basename(screenshot)), resultsRoot, 'screenshot'),
  ];
  const manifest = {
    version: 1,
    headSha: options['head-sha'],
    checkoutSha: options['checkout-sha'],
    project,
    specFile: SPEC_FILE,
    testTitle: TEST_TITLE,
    runId: Number(options['run-id']),
    runAttempt: Number(options['run-attempt']),
    traceAcceptance: {
      deathSequenceObservedMs: traceJson.deathSequenceObservedMs,
      deathSequenceStates: traceJson.deathSequenceStates,
      terminalRenderMode: traceJson.terminalRenderMode,
      terminalRenderFrames: traceJson.terminalRenderFrames,
      postDeathAttackObservedMs: traceJson.postDeathAttackObservedMs,
      postDeathAttackBlocked: traceJson.postDeathAttackBlocked,
    },
    files,
  };
  await writeMetadata(videoDirectory, manifest, files.filter(file => file.category === 'video'));
  await writeMetadata(evidenceDirectory, manifest, files.filter(file => file.category !== 'video'));
  return { outputRoot, manifest };
}

async function selfTest() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `${STAGING_PREFIX}-self-test-`));
  try {
    const resultsRoot = path.join(root, 'test-results');
    const testOutput = path.join(resultsRoot, 'player-death-state-solo');
    await fs.mkdir(testOutput, { recursive: true });
    const project = 'android-tablet-chromium';
    const video = path.join(testOutput, 'video.webm');
    await fs.writeFile(video, Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    const trace = { project, deathSequence: 'settled', deathSequenceStates: ['settling', 'settled'], deathSequenceObservedMs: 1_100, deathSequenceCommittedAt: 2_200, rendererDeathState: 'active', terminalRenderMode: 'frozen-final-pose', terminalRenderFrames: 1, after: { status: 'gameover', hp: 0 }, postDeathAttackObservedMs: 750, postDeathAttackBlocked: true };
    await fs.writeFile(path.join(testOutput, `player-death-solo-${project}.trace.json`), JSON.stringify(trace));
    await fs.writeFile(path.join(testOutput, `player-death-solo-${project}.png`), Buffer.concat([PNG_SIGNATURE, Buffer.alloc(16)]));
    const reportPath = path.join(resultsRoot, 'full-game-results.json');
    const reportFor = (attachmentPath = video) => ({ suites: [{ file: `/repo/tests/${SPEC_FILE}`, specs: [{ title: TEST_TITLE, tests: [{ projectName: project, status: 'expected', results: [{ status: 'passed', retry: 0, attachments: [{ name: 'video', contentType: 'video/webm', path: attachmentPath }] }] }] }] }] });
    await fs.writeFile(reportPath, JSON.stringify(reportFor()));
    const options = { report: reportPath, 'results-root': resultsRoot, 'output-root': path.join(root, `${STAGING_PREFIX}-valid`), project, 'head-sha': 'a'.repeat(40), 'checkout-sha': 'b'.repeat(40), 'run-id': '123', 'run-attempt': '1' };
    const prepared = await prepareEvidence(options);
    if (prepared.manifest.files.length !== 3) fail('self-test did not stage exactly three primary files');
    const videoEntries = (await fs.readdir(path.join(prepared.outputRoot, 'video'))).sort();
    const proofEntries = (await fs.readdir(path.join(prepared.outputRoot, 'evidence'))).sort();
    if (videoEntries.join(',') !== `SHA256SUMS,manifest.json,player-death-solo-${project}.webm`) fail(`unexpected staged video entries: ${videoEntries.join(',')}`);
    if (proofEntries.join(',') !== `SHA256SUMS,manifest.json,player-death-solo-${project}.png,player-death-solo-${project}.trace.json`) fail(`unexpected staged proof entries: ${proofEntries.join(',')}`);

    const reject = async (label, mutate) => {
      await mutate();
      let rejected = false;
      try { await prepareEvidence({ ...options, 'output-root': path.join(root, `${STAGING_PREFIX}-${label}`) }); } catch { rejected = true; }
      if (!rejected) fail(`negative self-test was accepted: ${label}`);
    };
    await reject('timing', async () => fs.writeFile(path.join(testOutput, `player-death-solo-${project}.trace.json`), JSON.stringify({ ...trace, deathSequenceObservedMs: 2_001 })));
    await fs.writeFile(path.join(testOutput, `player-death-solo-${project}.trace.json`), JSON.stringify(trace));
    const outsideVideo = path.join(root, 'outside.webm');
    await fs.writeFile(outsideVideo, 'outside');
    await reject('outside-root', async () => fs.writeFile(reportPath, JSON.stringify(reportFor(outsideVideo))));
    await fs.writeFile(reportPath, JSON.stringify(reportFor()));
    await reject('ambiguous', async () => {
      const ambiguous = reportFor();
      ambiguous.suites[0].specs[0].tests.push(structuredClone(ambiguous.suites[0].specs[0].tests[0]));
      await fs.writeFile(reportPath, JSON.stringify(ambiguous));
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log('Player-death success evidence positive and negative self-tests passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  if (process.argv.includes('--self-test')) await selfTest();
  else {
    const result = await prepareEvidence(parseArgs(process.argv.slice(2)));
    console.log(`Prepared ${result.manifest.files.length} focused files in ${result.outputRoot}`);
  }
}
