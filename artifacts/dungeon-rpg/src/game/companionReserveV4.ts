import { COMPANION_RESERVE_V4 } from './buildBalanceV4';

export type CompanionRoleV4 = 'single-target' | 'critical-support' | 'shield' | 'loot-comfort' | 'distraction';

export type CompanionReservationV4 = Readonly<{
  id: string;
  ownerPlayerId: string;
  ownerUserId: string | null;
  role: CompanionRoleV4;
  effectivePower: number;
  projectileBudget: number;
  particleBudget: number;
  aiUpdatesPerSecond: number;
  blocksPlayers: false;
  blocksEnemies: false;
  reviveTarget: false;
}>;

export type CompanionDamageAttributionV4 = Readonly<{
  ownerPlayerId: string;
  ownerUserId: string | null;
  companionId: string;
  damage: number;
  source: 'companion-v4';
}>;

export const COMPANION_ROLE_RESERVE_V4: Readonly<Record<CompanionRoleV4, number>> = Object.freeze({
  'single-target': 0.12,
  'critical-support': 0.10,
  shield: 0.10,
  'loot-comfort': 0.08,
  distraction: 0.08,
});

export function createCompanionReservationV4(input: {
  id: string;
  ownerPlayerId: string;
  ownerUserId?: string | null;
  role: CompanionRoleV4;
  requestedEffectivePower?: number;
}): CompanionReservationV4 {
  const roleReserve = COMPANION_ROLE_RESERVE_V4[input.role];
  const requested = Number(input.requestedEffectivePower ?? roleReserve);
  const effectivePower = Math.max(
    COMPANION_RESERVE_V4.minimumEffectivePower,
    Math.min(COMPANION_RESERVE_V4.maximumEffectivePower, Number.isFinite(requested) ? requested : roleReserve),
  );
  return Object.freeze({
    id: String(input.id),
    ownerPlayerId: String(input.ownerPlayerId),
    ownerUserId: input.ownerUserId ? String(input.ownerUserId) : null,
    role: input.role,
    effectivePower,
    projectileBudget: COMPANION_RESERVE_V4.projectileBudgetPerCompanion,
    particleBudget: COMPANION_RESERVE_V4.particleBudgetPerCompanion,
    aiUpdatesPerSecond: COMPANION_RESERVE_V4.aiUpdatesPerSecond,
    blocksPlayers: false,
    blocksEnemies: false,
    reviveTarget: false,
  });
}

export function normalizeCompanionRosterV4(
  companions: readonly CompanionReservationV4[],
  mode: 'solo' | 'duo',
): CompanionReservationV4[] {
  const perOwner = new Set<string>();
  const cap = mode === 'duo' ? COMPANION_RESERVE_V4.duoVisibleCap : COMPANION_RESERVE_V4.maxVisiblePerPlayer;
  const normalized: CompanionReservationV4[] = [];
  for (const companion of companions) {
    if (perOwner.has(companion.ownerPlayerId)) continue;
    perOwner.add(companion.ownerPlayerId);
    normalized.push(companion);
    if (normalized.length >= cap) break;
  }
  return normalized;
}

export function companionDamageAttributionV4(
  companion: CompanionReservationV4,
  rawDamage: number,
): CompanionDamageAttributionV4 {
  return Object.freeze({
    ownerPlayerId: companion.ownerPlayerId,
    ownerUserId: companion.ownerUserId,
    companionId: companion.id,
    damage: Math.max(0, Math.round(Number(rawDamage) || 0)),
    source: 'companion-v4',
  });
}

export function companionWorldBossDamageV4(
  companion: CompanionReservationV4,
  rawDamage: number,
): CompanionDamageAttributionV4 {
  return companionDamageAttributionV4(companion, rawDamage);
}
