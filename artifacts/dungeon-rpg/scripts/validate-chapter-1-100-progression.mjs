import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = await readFile(resolve(root, 'src/game/chapterProgression.ts'), 'utf8');

const required = (condition, message) => {
  if (!condition) throw new Error(message);
};

required(/export\s+const\s+MAX_CHAPTER\s*=\s*100\s*;/.test(source), 'Chapter progression must stop at chapter 100.');
required(/export\s+const\s+ROOMS_PER_CHAPTER\s*=\s*100\s*;/.test(source), 'Every chapter must contain 100 rooms.');
required(/safeRoom\s*<\s*ROOMS_PER_CHAPTER/.test(source), 'Normal rooms must advance within the current chapter.');
required(/safeChapter\s*>=\s*MAX_CHAPTER/.test(source), 'Chapter 100 room 100 must enter a terminal state.');
required(/chapter:\s*safeChapter\s*\+\s*1,\s*room:\s*1/.test(source), 'Room 100 must advance to room 1 of the next chapter.');
required(/completedChapter:\s*safeChapter/.test(source), 'Chapter completion must identify the completed chapter.');
required(/claimChapterReward/.test(source), 'Chapter rewards must use an explicit claim function.');
required(/current\.includes\(safeChapter\)/.test(source), 'Duplicate chapter reward claims must be rejected.');
required(/granted:\s*false/.test(source) && /granted:\s*true/.test(source), 'Reward claims must report whether a grant occurred.');
required(/normalizeClaimedChapterRewards/.test(source), 'Persisted reward claims must be normalized safely.');

console.log('Chapter 1-100 progression contract validated.');
