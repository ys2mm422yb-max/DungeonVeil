import type { DuoRunContext } from './coopRunMode';
import { collectBalancedEquipmentDrop } from './equipmentCollection';
import {
  EQUIPMENT,
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  type EquipmentRarity,
  type PendingEquipmentDrop,
} from './metaProgression';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export type CoopLootChoice = 'claim' | 'pass';
export type CoopLootStatus = 'open' | 'resolved';

export type CoopSharedLootState = {
  lobby_id: string;
  run_seed: number;
  chapter: number;
  room: number;
  item_id: EquipmentId;
  source: EquipmentDropSource;
  rarity: EquipmentRarity;
  status: CoopLootStatus;
  choices: Record<string, CoopLootChoice>;
  winner_user_id: string | null;
  loser_user_id: string | null;
  compensation_dust: number;
  created_at: string;
  resolve_after: string;
  resolved_at: string | null;
  server_now: string;
};

const RPC_FIELDS = 'lobby_id,run_seed,chapter,room,item_id,source,rarity,status,choices,winner_user_id,loser_user_id,compensation_dust,created_at,resolve_after,resolved_at,server_now';

function firstRow(value: unknown): CoopSharedLootState | null {
  const rows = Array.isArray(value) ? value : [];
  const raw = rows[0];
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const item = String(row.item_id ?? '') as EquipmentId;
  if (!EQUIPMENT[item]) return null;
  const status = row.status === 'resolved' ? 'resolved' : 'open';
  const rawChoices = row.choices && typeof row.choices === 'object' && !Array.isArray(row.choices)
    ? row.choices as Record<string, unknown>
    : {};
  const choices: Record<string, CoopLootChoice> = {};
  for (const [userId, choice] of Object.entries(rawChoices)) {
    if (choice === 'claim' || choice === 'pass') choices[userId] = choice;
  }
  return {
    lobby_id: String(row.lobby_id ?? ''),
    run_seed: Math.max(0, Math.floor(Number(row.run_seed) || 0)),
    chapter: Math.max(1, Math.floor(Number(row.chapter) || 1)),
    room: Math.max(1, Math.min(50, Math.floor(Number(row.room) || 1))),
    item_id: item,
    source: String(row.source ?? EQUIPMENT[item].dropSource) as EquipmentDropSource,
    rarity: String(row.rarity ?? EQUIPMENT[item].rarity) as EquipmentRarity,
    status,
    choices,
    winner_user_id: row.winner_user_id ? String(row.winner_user_id) : null,
    loser_user_id: row.loser_user_id ? String(row.loser_user_id) : null,
    compensation_dust: Math.max(0, Math.min(500, Math.floor(Number(row.compensation_dust) || 0))),
    created_at: String(row.created_at ?? ''),
    resolve_after: String(row.resolve_after ?? ''),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
    server_now: String(row.server_now ?? new Date().toISOString()),
  };
}

function requireSessionUser(): string {
  const userId = currentOnlineSession()?.user?.id;
  if (!userId) throw new Error('Für gemeinsame Beute musst du angemeldet sein.');
  return userId;
}

export async function openCoopSharedLoot(
  context: DuoRunContext,
  chapter: number,
  room: number,
  drop: PendingEquipmentDrop,
): Promise<CoopSharedLootState> {
  requireSessionUser();
  if (context.role !== 'host') throw new Error('Nur der Host darf gemeinsame Beute eröffnen.');
  const rows = await authenticatedSupabaseRest<unknown>('rpc/open_coop_shared_loot', {
    method: 'POST',
    headers: { Prefer: `params=single-object,return=representation;fields=${RPC_FIELDS}` },
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_run_seed: context.runSeed,
      p_chapter: chapter,
      p_room: room,
      p_item_id: drop.item,
      p_source: drop.source,
      p_rarity: drop.rarity,
    }),
  });
  const state = firstRow(rows);
  if (!state) throw new Error('Die gemeinsame Beute konnte nicht eröffnet werden.');
  return state;
}

export async function loadCoopSharedLoot(
  context: DuoRunContext,
  chapter: number,
  room: number,
): Promise<CoopSharedLootState | null> {
  requireSessionUser();
  const rows = await authenticatedSupabaseRest<unknown>('rpc/get_coop_shared_loot', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_run_seed: context.runSeed,
      p_chapter: chapter,
      p_room: room,
    }),
  });
  return firstRow(rows);
}

export async function chooseCoopSharedLoot(
  context: DuoRunContext,
  chapter: number,
  room: number,
  choice: CoopLootChoice,
): Promise<CoopSharedLootState> {
  requireSessionUser();
  const rows = await authenticatedSupabaseRest<unknown>('rpc/choose_coop_shared_loot', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_run_seed: context.runSeed,
      p_chapter: chapter,
      p_room: room,
      p_choice: choice,
    }),
  });
  const state = firstRow(rows);
  if (!state) throw new Error('Die Beuteentscheidung konnte nicht gespeichert werden.');
  return state;
}

export function localCoopLootChoice(state: CoopSharedLootState): CoopLootChoice | null {
  const userId = currentOnlineSession()?.user?.id;
  return userId ? state.choices[userId] ?? null : null;
}

export function applyCoopSharedLootResolution(state: CoopSharedLootState): boolean {
  if (state.status !== 'resolved') return false;
  const userId = currentOnlineSession()?.user?.id;
  if (!userId) return false;
  const ledgerKey = `coop-loot:${state.lobby_id}:${state.run_seed}:${state.chapter}:${state.room}`;
  const before = loadMetaProgression();
  if (before.rewardLedger.includes(ledgerKey)) return false;

  if (state.winner_user_id === userId) {
    const result = collectBalancedEquipmentDrop(state.item_id);
    window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
      detail: {
        item: state.item_id,
        duplicate: result.duplicate,
        copies: result.progress.copies,
        level: result.progress.level,
        convertedDust: result.convertedDust,
      },
    }));
  } else if (state.loser_user_id === userId && state.compensation_dust > 0) {
    const meta = loadMetaProgression();
    meta.dust += state.compensation_dust;
    saveMetaProgression(meta);
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
      detail: {
        title: 'WÜRFELRUNDE VERLOREN',
        text: `+${state.compensation_dust} Schleierstaub als Ausgleich`,
        tone: 'relic',
      },
    }));
  }

  const after = loadMetaProgression();
  if (!after.rewardLedger.includes(ledgerKey)) after.rewardLedger.push(ledgerKey);
  saveMetaProgression(after);
  return true;
}
