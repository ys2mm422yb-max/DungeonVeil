import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';
import type { EquipmentDropSource, EquipmentId, EquipmentRarity, PendingEquipmentDrop } from './metaProgression';

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

type CoopLootDropRow = {
  id: string;
  lobby_id: string;
  run_seed: number;
  chapter: number;
  room: number;
  equipment_id: EquipmentId;
  source: EquipmentDropSource;
  rarity: EquipmentRarity;
};

function requireOnline(): void {
  if (!currentOnlineSession()) throw new Error('Für gemeinsames Duo-Loot musst du angemeldet sein.');
}

async function rpcRows<T>(name: string, body: Record<string, unknown>): Promise<T[]> {
  requireOnline();
  return authenticatedSupabaseRest<T[]>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loadCoopSharedLoot(runSeed: number, chapter: number, room: number): Promise<CoopSharedLootSnapshot | null> {
  if (!currentOnlineSession()) return null;
  const rows = await rpcRows<CoopSharedLootSnapshot>('get_my_coop_loot_drop', {
    p_run_seed: Math.max(0, Math.floor(runSeed)),
    p_chapter: Math.max(1, Math.floor(chapter)),
    p_room: Math.max(1, Math.floor(room)),
  });
  return rows[0] ?? null;
}

export async function createOrLoadCoopSharedLoot(
  runSeed: number,
  chapter: number,
  room: number,
  plannedDrop?: PendingEquipmentDrop | null,
): Promise<CoopSharedLootSnapshot | null> {
  const rows = await rpcRows<CoopLootDropRow>('create_or_get_coop_loot_drop', {
    p_run_seed: Math.max(0, Math.floor(runSeed)),
    p_chapter: Math.max(1, Math.floor(chapter)),
    p_room: Math.max(1, Math.floor(room)),
    p_equipment_id: plannedDrop?.item ?? null,
    p_source: plannedDrop?.source ?? null,
    p_rarity: plannedDrop?.rarity ?? null,
  });
  if (!rows[0]) return loadCoopSharedLoot(runSeed, chapter, room);
  return loadCoopSharedLoot(runSeed, chapter, room);
}

export async function submitCoopLootChoice(dropId: string, choice: CoopLootChoice): Promise<CoopSharedLootSnapshot | null> {
  requireOnline();
  await authenticatedSupabaseRest<boolean>('rpc/submit_coop_loot_choice', {
    method: 'POST',
    body: JSON.stringify({ p_drop_id: dropId, p_choice: choice }),
  });
  const row = await authenticatedSupabaseRest<CoopLootDropRow[]>(`coop_loot_drops?id=eq.${encodeURIComponent(dropId)}&select=run_seed,chapter,room`, {
    method: 'GET',
  });
  const drop = row[0];
  return drop ? loadCoopSharedLoot(drop.run_seed, drop.chapter, drop.room) : null;
}
