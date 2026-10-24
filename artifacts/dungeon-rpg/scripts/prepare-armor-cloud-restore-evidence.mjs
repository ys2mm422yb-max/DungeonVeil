import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ARMOR_SPEC = 'armor-cloud-restore-render.spec.mjs';
const ARMOR_TITLE = 'cloud-restored armour keeps a visibly painted run frame';

function insideRoot(rootReal, candidateReal) {
  const relative = path.relative(rootReal, candidateReal);
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function resolveAttachment(attachmentPath, resultsRoot) {
  const rootReal = fs.realpathSync(resultsRoot);
  const candidates = path.isAbsolute(attachmentPath)
    ? [attachmentPath]
    : [
        path.resolve(attachmentPath),
        path.resolve('artifacts/dungeon-rpg', attachmentPath),
        path.resolve(resultsRoot, attachmentPath.replace(/^test-results[\\/]/, '')),
      ];
  const matches = [...new Set(candidates
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => fs.realpathSync(candidate))
    .filter((candidate) => insideRoot(rootReal, candidate)))];
  if (matches.length !== 1) {
    throw new Error(`armor restore video attachment must resolve exactly once inside results root, found ${matches.length}`);
  }
  return matches[0];
}

function collectArmorSpecs(suites = [], found = []) {
  for (const suite of suites) {
    for (const spec of suite.specs || []) {
      const file = String(spec.file || suite.file || '');
      if (file.endsWith(ARMOR_SPEC) && spec.title === ARMOR_TITLE) found.push(spec);
    }
    collectArmorSpecs(suite.suites, found);
  }
  return found;
}

export function prepareArmorCloudRestoreEvidence({ reportPath, resultsRoot, project }) {
  if (!/^[a-z0-9-]+$/.test(project)) throw new Error(`invalid browser project: ${project}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const specs = collectArmorSpecs(report.suites);
  if (specs.length !== 1) throw new Error(`expected exactly one armor restore spec, found ${specs.length}`);

  const tests = specs[0].tests || [];
  if (tests.length !== 1) throw new Error(`expected exactly one armor restore test, found ${tests.length}`);
  const results = tests[0].results || [];
  if (results.length !== 1) throw new Error(`expected exactly one armor restore result, found ${results.length}`);
  const result = results[0];
  if (result.status !== 'passed' || result.retry !== 0) {
    throw new Error(`armor restore result must be passed with retry 0, got status=${result.status} retry=${result.retry}`);
  }

  const videos = (result.attachments || []).filter((attachment) => (
    attachment.name === 'video'
    && attachment.contentType === 'video/webm'
    && attachment.path
  ));
  if (videos.length !== 1) throw new Error(`armor restore result must have exactly one video attachment, found ${videos.length}`);

  const source = resolveAttachment(videos[0].path, resultsRoot);
  const target = path.join(resultsRoot, `armor-cloud-restore-painted-${project}.webm`);
  if (fs.existsSync(target) && fs.realpathSync(target) !== source) {
    throw new Error(`armor restore evidence target already exists: ${target}`);
  }
  if (source !== target) fs.renameSync(source, target);
  if (!fs.statSync(target).isFile() || fs.statSync(target).size === 0) {
    throw new Error('armor restore temporal evidence is empty');
  }
  return target;
}

function fixtureReport(videoPath, overrides = {}) {
  return {
    suites: [{
      file: ARMOR_SPEC,
      specs: [{
        file: ARMOR_SPEC,
        title: ARMOR_TITLE,
        tests: [{
          results: [{
            status: 'passed',
            retry: 0,
            attachments: [{
              name: 'video',
              contentType: 'video/webm',
              path: videoPath,
            }],
            ...overrides,
          }],
        }],
      }],
    }],
  };
}

async function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'armor-restore-evidence-'));
  try {
    const resultsRoot = path.join(root, 'test-results');
    const nested = path.join(resultsRoot, 'armor-result');
    fs.mkdirSync(nested, { recursive: true });
    const video = path.join(nested, 'video.webm');
    fs.writeFileSync(video, 'full-armor-restore-timeline');
    const reportPath = path.join(resultsRoot, 'full-game-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(fixtureReport(video)));

    const target = prepareArmorCloudRestoreEvidence({
      reportPath,
      resultsRoot,
      project: 'iphone-webkit',
    });
    if (path.basename(target) !== 'armor-cloud-restore-painted-iphone-webkit.webm') {
      throw new Error(`unexpected armor evidence target: ${target}`);
    }
    if (fs.readFileSync(target, 'utf8') !== 'full-armor-restore-timeline' || fs.existsSync(video)) {
      throw new Error('armor restore video was not moved intact');
    }

    fs.writeFileSync(reportPath, JSON.stringify(fixtureReport(target, { retry: 1 })));
    let retryRejected = false;
    try {
      prepareArmorCloudRestoreEvidence({ reportPath, resultsRoot, project: 'iphone-webkit' });
    } catch (error) {
      retryRejected = String(error).includes('retry 0');
    }
    if (!retryRejected) throw new Error('retried armor evidence was not rejected');

    const outside = path.join(root, 'outside.webm');
    fs.writeFileSync(outside, 'outside-root');
    fs.writeFileSync(reportPath, JSON.stringify(fixtureReport(outside)));
    let escapeRejected = false;
    try {
      prepareArmorCloudRestoreEvidence({ reportPath, resultsRoot, project: 'iphone-webkit' });
    } catch (error) {
      escapeRejected = String(error).includes('inside results root');
    }
    if (!escapeRejected) throw new Error('out-of-root armor evidence was not rejected');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log('Armor cloud restore evidence packaging self-test passed.');
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  await selfTest();
} else {
  const value = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  const project = value('--project');
  const resultsRoot = value('--results-root');
  if (!project || !resultsRoot) {
    throw new Error('Usage: prepare-armor-cloud-restore-evidence.mjs --project <project> --results-root <path>');
  }
  const reportPath = path.join(resultsRoot, 'full-game-results.json');
  const target = prepareArmorCloudRestoreEvidence({ reportPath, resultsRoot, project });
  console.log(`Prepared armor restore temporal evidence: ${target}`);
}
