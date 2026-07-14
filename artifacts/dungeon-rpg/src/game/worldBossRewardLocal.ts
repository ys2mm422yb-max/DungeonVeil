import { loadMetaProgression, saveMetaProgression, xpForNextRank } from './metaProgression';
import type { WorldBossRewardPayload } from './socialProgressOnline';
import { unlockVeilRelic } from './veilRelics';

export type AppliedWorldBossReward = {
  applied: boolean;
  rankBefore: number;
  rankAfter: number;
  xp: number;
  dust: number;
  gold: number;
  relicUnlocked: boolean;
};

export function applyWorldBossRewardLocally(eventId: string, reward: WorldBossRewardPayload): AppliedWorldBossReward {
  const meta = loadMetaProgression();
  const ledgerKey = `worldboss:${eventId}`;
  const rankBefore = meta.rank;

  if (meta.rewardLedger.includes(ledgerKey)) {
    return { applied: false, rankBefore, rankAfter: meta.rank, xp: 0, dust: 0, gold: 0, relicUnlocked: false };
  }

  const xp = Math.max(0, Math.floor(Number(reward.xp) || 0));
  const dust = Math.max(0, Math.floor(Number(reward.dust) || 0));
  const gold = Math.max(0, Math.floor(Number(reward.gold) || 0));

  meta.rewardLedger.push(ledgerKey);
  meta.xp += xp;
  while (meta.xp >= xpForNextRank(meta.rank)) {
    meta.xp -= xpForNextRank(meta.rank);
    meta.rank += 1;
  }
  meta.dust += dust;
  meta.gold += gold;
  saveMetaProgression(meta);
  const relic = unlockVeilRelic('world-core');

  return { applied: true, rankBefore, rankAfter: meta.rank, xp, dust, gold, relicUnlocked: relic.newUnlock };
}
