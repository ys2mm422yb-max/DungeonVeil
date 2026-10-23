import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SPEC = 'guild-raid-language-portals.spec.mjs';
const DIRECTIONS = ['de-to-en', 'en-to-de'];

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function directionForTitle(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.startsWith('de cold load,')) return 'de-to-en';
  if (normalized.startsWith('en cold load,')) return 'en-to-de';
  return null;
}

function visitSpecs(suites, callback) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) callback(spec, suite);
    visitSpecs(suite.suites, callback);
  }
}

async function resolveAttachment(resultsRoot, attachmentPath) {
  const rootReal = await fs.realpath(resultsRoot);
  const candidates = path.isAbsolute(attachmentPath)
    ? [attachmentPath]
    : [
        path.resolve(attachmentPath),
        path.resolve('artifacts/dungeon-rpg', attachmentPath),
        path.resolve(resultsRoot, attachmentPath.replace(/^test-results[\\/]/, '')),
      ];
  const matches = [];
  for (const candidate of new Set(candidates)) {
    try {
      const real = await fs.realpath(candidate);
      const relative = path.relative(rootReal, real);
      if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) matches.push(real);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const unique = [...new Set(matches)];
  if (unique.length !== 1) throw new Error(`Guild Raid language video attachment must resolve exactly once inside results root, found ${unique.length}`);
  return unique[0];
}

async function moveUnique(source, target) {
  try {
    await fs.access(target);
    throw new Error(`Refusing to overwrite deterministic evidence target: ${target}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await fs.rename(source, target);
  const stat = await fs.stat(target);
  if (!stat.isFile() || stat.size === 0) throw new Error(`Prepared evidence is empty or not a file: ${target}`);
}

export async function prepareGuildRaidLanguageEvidence({ resultsRoot, project }) {
  if (!project || !/^[a-z0-9-]+$/.test(project)) throw new Error(`Invalid Product project: ${project || '<empty>'}`);
  const root = path.resolve(resultsRoot);
  const report = JSON.parse(await fs.readFile(path.join(root, 'full-game-results.json'), 'utf8'));
  const videos = new Map();

  visitSpecs(report.suites, (spec, suite) => {
    if (!String(spec.file || suite.file || '').endsWith(SPEC)) return;
    const direction = directionForTitle(spec.title);
    if (!direction) return;
    const attachments = [];
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        for (const attachment of result.attachments ?? []) {
          if (attachment.name === 'video' && attachment.contentType === 'video/webm' && attachment.path) attachments.push(attachment.path);
        }
      }
    }
    if (attachments.length !== 1) throw new Error(`${direction} must have exactly one video attachment, found ${attachments.length}`);
    if (videos.has(direction)) throw new Error(`Duplicate Guild Raid language result for ${direction}`);
    videos.set(direction, attachments[0]);
  });

  for (const direction of DIRECTIONS) {
    const attachment = videos.get(direction);
    if (!attachment) throw new Error(`Missing Guild Raid language result for ${direction}`);
    const screenshot = path.join(root, `guild-raid-language-portals-${direction}-${project}.png`);
    const video = await resolveAttachment(root, attachment);
    await moveUnique(screenshot, path.join(root, `autopilot-guild-raid-language-portals-${direction}-${project}.png`));
    await moveUnique(video, path.join(root, `autopilot-guild-raid-language-portals-${direction}-${project}.webm`));
  }

  const prepared = (await fs.readdir(root)).filter(name =>
    name.startsWith('autopilot-guild-raid-language-portals-')
      && (name.endsWith(`-${project}.png`) || name.endsWith(`-${project}.webm`)),
  );
  if (prepared.length !== 4) throw new Error(`Expected exactly two Guild Raid language screenshots and two videos, found ${prepared.length}`);
  console.log(`Prepared exactly two Guild Raid language screenshots and two videos for ${project}.`);
}

async function selfTest() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'guild-raid-language-evidence-'));
  try {
    const project = 'android-chromium';
    const suites = [];
    for (const direction of DIRECTIONS) {
      const initial = direction.startsWith('de-') ? 'DE' : 'EN';
      const folder = path.join(root, direction);
      await fs.mkdir(folder, { recursive: true });
      await fs.writeFile(path.join(folder, 'video.webm'), Buffer.from(`video-${direction}`));
      await fs.writeFile(path.join(root, `guild-raid-language-portals-${direction}-${project}.png`), Buffer.from(`png-${direction}`));
      suites.push({
        file: `/repo/tests/${SPEC}`,
        specs: [{
          title: `${initial} cold load, mounted switch and persisted reopen keep both Guild Raid portals synchronized`,
          file: `/repo/tests/${SPEC}`,
          tests: [{ results: [{ attachments: [{ name: 'video', contentType: 'video/webm', path: path.join(folder, 'video.webm') }] }] }],
        }],
      });
    }
    await fs.writeFile(path.join(root, 'full-game-results.json'), JSON.stringify({ suites }));
    await prepareGuildRaidLanguageEvidence({ resultsRoot: root, project });
    const names = (await fs.readdir(root)).filter(name => name.startsWith('autopilot-guild-raid-language-portals-')).sort();
    const expected = DIRECTIONS.flatMap(direction => ['png', 'webm'].map(extension => `autopilot-guild-raid-language-portals-${direction}-${project}.${extension}`)).sort();
    if (names.join(',') !== expected.join(',')) throw new Error(`Unexpected prepared evidence: ${names.join(',')}`);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log('Guild Raid language evidence packager self-test passed.');
}

if (process.argv.includes('--self-test')) {
  await selfTest();
} else {
  const project = arg('--project') ?? process.env.BROWSER_PROJECT;
  const resultsRoot = arg('--results-root') ?? 'artifacts/dungeon-rpg/test-results';
  await prepareGuildRaidLanguageEvidence({ resultsRoot, project });
}
