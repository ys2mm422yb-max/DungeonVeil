import type { DuoRunContext } from './coopRunMode';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';
import {
  EQUIPMENT,
  type EquipmentDropSource,
  type EquipmentId,
  type EquipmentRarity,
  type PendingEquipmentDrop,
} from './metaProgression';

export type CoopLootChoice = 'claim' | 'pass';
export type CoopLootStatus = 'open' | 'resolved';
export type CoopLootResolution = 'single_claim' | 'contested' | 'all_pass' | 'timeout' | null;

export type CoopSharedLootSnapshot = {
  drop_id: string;
  lobby_id: string;
  run_seed: number;
  chapter: number;
  room: number;
  equipment_id: EquipmentId;
  source: EquipmentDropSource;
  rarity: EquipmentRarity;
  status: CoopLootStatus;
  resolution: CoopLootResolution;
  winner_user_id: string | null;
  compensation_dust: number;
  salvage_dust: number;
  deadline_at: string;
  my_choice: CoopLootChoice | null;
  partner_choice: CoopLootChoice | null;
  my_roll: number | null;
  partner_roll: number | null;
  server_now: string;
};

function requireOnline(): void {
  if (!currentOnlineSession()) throw new Error('Für gemeinsames Duo-Loot musst du angemeldet sein.');
}

function finiteInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function choice(value: unknown): CoopLootChoice | null {
  return value === 'claim' || value === 'pass' ? value : null;
}

function resolution(value: unknown): CoopLootResolution {
  return value === 'single_claim' || value === 'contested' || value === 'all_pass' || value === 'timeout' ? value : null;
}

function normalizeSnapshot(value: unknown, context: DuoRunContext): CoopSharedLootSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const equipmentId = String(raw.equipment_id ?? '') as EquipmentId;
  const item = EQUIPMENT[equipmentId];
  const lobbyId = String(raw.lobby_id ?? '');
  const runSeed = finiteInt(raw.run_seed, 0, Number.MAX_SAFE_INTEGER, -1);
  const status = raw.status === 'resolved' ? 'resolved' : raw.status === 'open' ? 'open' : null;
  if (!item || lobbyId !== context.lobbyId || runSeed !== context.runSeed || !status) return null;
  if (raw.source !== item.dropSource || raw.rarity !== item.rarity) return null;
  const winner = String(raw.winner_user_id ?? '').trim();
  return {
    drop_id: String(raw.drop_id ?? ''),
    lobby_id: lobbyId,
    run_seed: runSeed,
    chapter: finiteInt(raw.chapter, 1, 999, 1),
    room: finiteInt(raw.room, 1, 50, 1),
    equipment_id: equipmentId,
    source: item.dropSource,
    rarity: item.rarity,
    status,
    resolution: resolution(raw.resolution),
    winner_user_id: winner || null,
    compensation_dust: finiteInt(raw.compensation_dust, 0, 500, 0),
    salvage_dust: finiteInt(raw.salvage_dust, 0, 500, 0),
    deadline_at: String(raw.deadline_at ?? ''),
    my_choice: choice(raw.my_choice),
    partner_choice: choice(raw.partner_choice),
    my_roll: raw.my_roll == null ? null : finiteInt(raw.my_roll, 1, 100, 1),
    partner_roll: raw.partner_roll == null ? null : finiteInt(raw.partner_roll, 1, 100, 1),
    server_now: String(raw.server_now ?? new Date().toISOString()),
  };
}

async function rpcRows(name: string, body: Record<string, unknown>): Promise<unknown[]> {
  requireOnline();
  const rows = await authenticatedSupabaseRest<unknown>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}

export async function loadCoopSharedLoot(
  context: DuoRunContext,
  chapter: number,
  room: number,
): Promise<CoopSharedLootSnapshot | null> {
  if (!currentOnlineSession()) return null;
  const rows = await rpcRows('get_my_coop_loot_drop', {
    p_lobby_id: context.lobbyId,
    p_run_seed: context.runSeed,
    p_chapter: Math.max(1, Math.floor(chapter)),
    p_room: Math.max(1, Math.min(50, Math.floor(room))),
  });
  return normalizeSnapshot(rows[0], context);
}

export async function createOrLoadCoopSharedLoot(
  context: DuoRunContext,
  chapter: number,
  room: number,
  plannedDrop: PendingEquipmentDrop,
): Promise<CoopSharedLootSnapshot | null> {
  await rpcRows('create_or_get_coop_loot_drop', {
    p_lobby_id: context.lobbyId,
    p_run_seed: context.runSeed,
    p_chapter: Math.max(1, Math.floor(chapter)),
    p_room: Math.max(1, Math.min(50, Math.floor(room))),
    p_equipment_id: plannedDrop.item,
    p_source: plannedDrop.source,
    p_rarity: plannedDrop.rarity,
  });
  return loadCoopSharedLoot(context, chapter, room);
}

export async function submitCoopLootChoice(
  context: DuoRunContext,
  dropId: string,
  chapter: number,
  room: number,
  selected: CoopLootChoice,
): Promise<CoopSharedLootSnapshot | null> {
  requireOnline();
  await authenticatedSupabaseRest<boolean>('rpc/submit_coop_loot_choice', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: context.lobbyId,
      p_drop_id: dropId,
      p_choice: selected,
    }),
  });
  return loadCoopSharedLoot(context, chapter, room);
}
