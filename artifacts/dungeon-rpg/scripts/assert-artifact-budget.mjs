import { readdir, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = [...argv];
  let maxMb = null;
  let label = 'artifact';
  const paths = [];

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--max-mb') {
      maxMb = Number(args.shift());
      continue;
    }
    if (arg === '--label') {
      label = String(args.shift() ?? label);
      continue;
    }
    paths.push(arg);
  }

  if (!Number.isFinite(maxMb) || maxMb <= 0) {
    throw new Error('Usage: node assert-artifact-budget.mjs --max-mb <positive number> [--label <name>] <path...>');
  }
  if (paths.length === 0) {
    throw new Error('At least one file or directory path is required.');
  }

  return { maxBytes: Math.floor(maxMb * 1024 * 1024), maxMb, label, paths };
}

async function collectFiles(inputPath, files, missing) {
  const absolute = resolve(inputPath);
  let metadata;
  try {
    metadata = await stat(absolute);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      missing.push(inputPath);
      return;
    }
    throw error;
  }

  if (metadata.isDirectory()) {
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      await collectFiles(`${absolute}/${entry.name}`, files, missing);
    }
    return;
  }

  if (metadata.isFile()) {
    files.push({ path: await realpath(absolute), bytes: metadata.size });
  }
}

const { maxBytes, maxMb, label, paths } = parseArgs(process.argv.slice(2));
const files = [];
const missing = [];
for (const inputPath of paths) {
  await collectFiles(inputPath, files, missing);
}

if (files.length === 0) {
  throw new Error(`${label}: no files found in ${paths.join(', ')}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
}

const uniqueFiles = [...new Map(files.map(file => [file.path, file])).values()];
const totalBytes = uniqueFiles.reduce((sum, file) => sum + file.bytes, 0);
const totalMiB = totalBytes / 1024 / 1024;
const result = {
  label,
  fileCount: uniqueFiles.length,
  totalBytes,
  totalMiB: Number(totalMiB.toFixed(2)),
  maxBytes,
  maxMiB: maxMb,
  missingPaths: missing,
};

console.log(JSON.stringify(result, null, 2));
if (totalBytes > maxBytes) {
  throw new Error(`${label} exceeds its budget: ${totalMiB.toFixed(2)} MiB > ${maxMb} MiB.`);
}
