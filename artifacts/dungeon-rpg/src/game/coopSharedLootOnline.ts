import type { DuoRunContext } from './coopRunMode';
import { MAX_LEVEL_DUPLICATE_DUST } from './equipmentCollection';
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
  drop_key: string;
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

function cleanDropKey(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 96);
}

function firstRow(value: unknown): CoopSharedLootState | null {
  const rows = Array.isArray(value) ? value : [];
  const raw = rows[0];
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const item = String(row.item_id ?? '') as EquipmentId;
  const dropKey = cleanDropKey(row.drop_key);
  if (!dropKey || !EQUIPMENT[item]) return null;
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
    drop_key: dropKey,
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
  dropKey: string,
  drop: PendingEquipmentDrop,
): Promise<CoopSharedLootState> {
  requireSessionUser();
  if (context.role !== 'host') throw new Error('Nur der Host darf gemeinsame Beute eröffnen.');
  const safeDropKey = cleanDropKey(dropKey);
  if (!safeDropKey) throw new Error('Ungültige Beute-ID.');
  const rows = await authenticatedSupabaseRest<unknown>('rpc/open_coop_shared_loot', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_run_seed: context.runSeed,
      p_chapter: chapter,
      p_room: room,
      p_drop_key: safeDropKey,
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
  state: Pick<CoopSharedLootState, 'chapter' | 'room' | 'drop_key'>,
  choice: CoopLootChoice,
): Promise<CoopSharedLootState> {
  requireSessionUser();
  const rows = await authenticatedSupabaseRest<unknown>('rpc/choose_coop_shared_loot', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_run_seed: context.runSeed,
      p_chapter: state.chapter,
      p_room: state.room,
      p_drop_key: state.drop_key,
      p_choice: choice,
    }),
  });
  const next = firstRow(rows);
  if (!next) throw new Error('Die Beuteentscheidung konnte nicht gespeichert werden.');
  return next;
}

export function localCoopLootChoice(state: CoopSharedLootState): CoopLootChoice | null {
  const userId = currentOnlineSession()?.user?.id;
  return userId ? state.choices[userId] ?? null : null;
}

export function applyCoopSharedLootResolution(state: CoopSharedLootState): boolean {
  if (state.status !== 'resolved') return false;
  const userId = currentOnlineSession()?.user?.id;
  if (!userId) return false;
  const ledgerKey = `coop-loot:${state.lobby_id}:${state.run_seed}:${state.chapter}:${state.room}:${state.drop_key}`;
  const meta = loadMetaProgression();
  if (meta.rewardLedger.includes(ledgerKey)) return false;

  let pickup: { duplicate: boolean; convertedDust: number; copies: number; level: number } | null = null;
  if (state.winner_user_id === userId) {
    const existing = meta.owned[state.item_id];
    const duplicate = Boolean(existing);
    let convertedDust = 0;
    if (existing?.level >= 5) {
      convertedDust = MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[state.item_id].rarity];
      meta.dust += convertedDust;
    } else if (existing) {
      existing.copies += 1;
    } else {
      meta.owned[state.item_id] = { level: 1, copies: 0 };
    }
    const progress = meta.owned[state.item_id]!;
    pickup = { duplicate, convertedDust, copies: progress.copies, level: progress.level };
  } else if (state.loser_user_id === userId && state.compensation_dust > 0) {
    meta.dust += state.compensation_dust;
  }

  meta.rewardLedger.push(ledgerKey);
  saveMetaProgression(meta);

  if (pickup) {
    window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
      detail: { item: state.item_id, ...pickup },
    }));
  } else if (state.loser_user_id === userId && state.compensation_dust > 0) {
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
      detail: {
        title: 'WÜRFELRUNDE VERLOREN',
        text: `+${state.compensation_dust} Schleierstaub als Ausgleich`,
        tone: 'relic',
      },
    }));
  }
  return true;
}
