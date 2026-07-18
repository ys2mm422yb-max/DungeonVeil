import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';
import type { EquipmentDropSource, EquipmentId, EquipmentRarity, PendingEquipmentDrop } from './metaProgression';

export const COOP_BOSS_LOOT_OPEN_EVENT = 'dungeon-veil-coop-boss-loot-open';
export const COOP_BOSS_LOOT_PENDING_DATASET = 'dungeonVeilCoopLootPending';
export const COOP_BOSS_LOOT_CONSOLATION_DUST = 60;

export type CoopBossLootChoice = 'claim' | 'pass';

export type CoopBossLootSnapshot = {
  roll_id: string;
  lobby_id: string;
  run_seed: number;
  chapter: number;
  room: number;
  item_id: EquipmentId;
  rarity: EquipmentRarity;
  source: EquipmentDropSource;
  status: 'open' | 'resolved';
  expires_at: string;
  resolved_at: string | null;
  member_count: number;
  choice_count: number;
  my_choice: CoopBossLootChoice | null;
  winner_user_id: string | null;
  contested: boolean;
  my_item_won: boolean;
  my_consolation_dust: number;
  server_now: string;
};

export type CoopBossLootOpenDetail = {
  chapter: number;
  room: number;
};

function requireOnline(): void {
  if (!currentOnlineSession()) throw new Error('Für die Duo-Beute musst du angemeldet sein.');
}

async function rpcRows<T>(name: string, body: Record<string, unknown>): Promise<T[]> {
  requireOnline();
  return authenticatedSupabaseRest<T[]>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function firstRow<T>(rows: T[], fallback: string): T {
  if (!rows[0]) throw new Error(fallback);
  return rows[0];
}

export async function openCoopBossLoot(
  lobbyId: string,
  runSeed: number,
  chapter: number,
  room: number,
  drop: PendingEquipmentDrop,
): Promise<CoopBossLootSnapshot> {
  return firstRow(await rpcRows<CoopBossLootSnapshot>('open_coop_boss_loot', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
    p_chapter: chapter,
    p_room: room,
    p_item_id: drop.item,
    p_rarity: drop.rarity,
    p_source: drop.source,
  }), 'Gemeinsame Bossbeute konnte nicht geöffnet werden.');
}

export async function getCoopBossLoot(
  lobbyId: string,
  runSeed: number,
  chapter: number,
  room: number,
): Promise<CoopBossLootSnapshot | null> {
  const rows = await rpcRows<CoopBossLootSnapshot>('get_coop_boss_loot', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
    p_chapter: chapter,
    p_room: room,
  });
  return rows[0] ?? null;
}

export async function chooseCoopBossLoot(
  rollId: string,
  choice: CoopBossLootChoice,
): Promise<CoopBossLootSnapshot> {
  return firstRow(await rpcRows<CoopBossLootSnapshot>('choose_coop_boss_loot', {
    p_roll_id: rollId,
    p_choice: choice,
  }), 'Beuteauswahl konnte nicht gespeichert werden.');
}

export function dispatchCoopBossLootOpen(chapter: number, room: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CoopBossLootOpenDetail>(COOP_BOSS_LOOT_OPEN_EVENT, {
    detail: {
      chapter: Math.max(1, Math.floor(Number(chapter) || 1)),
      room: Math.max(1, Math.floor(Number(room) || 1)),
    },
  }));
}
