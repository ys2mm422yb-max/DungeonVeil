import { createGuildRaidMutationKey, mutateGuildRaidRunState, type GuildRaidRunSnapshot } from './guildRaidRunOnline';

export type GuildRaidBossPhase = 'veil-armor' | 'split-echoes' | 'collapse' | 'defeated';
export type GuildRaidBossAction =
  | { type: 'attune'; slot: number; sigil: 'sun' | 'moon' }
  | { type: 'break-armor'; slot: number }
  | { type: 'bind-echo'; slot: number; echo: 1 | 2 | 3 | 4 }
  | { type: 'stabilize-collapse'; slot: number; pulse: number }
  | { type: 'strike'; slot: number; amount: number; windowRevision: number };

export type GuildRaidBossState = {
  phase: GuildRaidBossPhase;
  revision: number;
  maxHealth: number;
  health: number;
  phaseStartedRevision: number;
  attunements: Record<string, 'sun' | 'moon' | null>;
  armorBreakers: number[];
  boundEchoes: Record<string, number>;
  collapsePulse: number;
  collapseContributors: number[];
  damageWindowRevision: number;
  damageWindowOpen: boolean;
  defeatedAtRevision: number | null;
};

const slots = [1, 2, 3, 4] as const;
const validSlot = (slot: number) => Number.isInteger(slot) && slot >= 1 && slot <= 4;
const unique = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);

export function initialGuildRaidBossState(): GuildRaidBossState {
  return {
    phase: 'veil-armor', revision: 0, maxHealth: 1_200_000, health: 1_200_000,
    phaseStartedRevision: 0, attunements: { '1': null, '2': null, '3': null, '4': null },
    armorBreakers: [], boundEchoes: {}, collapsePulse: 0, collapseContributors: [],
    damageWindowRevision: 0, damageWindowOpen: false, defeatedAtRevision: null,
  };
}

export function normalizeGuildRaidBossState(raw: Record<string, unknown> | null | undefined): GuildRaidBossState {
  const base = initialGuildRaidBossState();
  if (!raw) return base;
  const phase = raw.phase === 'split-echoes' || raw.phase === 'collapse' || raw.phase === 'defeated' ? raw.phase : 'veil-armor';
  const maxHealth = Math.max(1, Number(raw.maxHealth ?? base.maxHealth) || base.maxHealth);
  return {
    ...base, ...raw, phase, maxHealth,
    health: Math.max(0, Math.min(maxHealth, Number(raw.health ?? maxHealth) || 0)),
    revision: Math.max(0, Number(raw.revision ?? 0) || 0),
    phaseStartedRevision: Math.max(0, Number(raw.phaseStartedRevision ?? 0) || 0),
    collapsePulse: Math.max(0, Number(raw.collapsePulse ?? 0) || 0),
    damageWindowRevision: Math.max(0, Number(raw.damageWindowRevision ?? 0) || 0),
    defeatedAtRevision: raw.defeatedAtRevision == null ? null : Math.max(0, Number(raw.defeatedAtRevision) || 0),
    attunements: { ...base.attunements, ...(raw.attunements as Record<string, 'sun' | 'moon' | null> | undefined) },
    armorBreakers: unique(Array.isArray(raw.armorBreakers) ? raw.armorBreakers.map(Number).filter(validSlot) : []),
    boundEchoes: raw.boundEchoes && typeof raw.boundEchoes === 'object' ? raw.boundEchoes as Record<string, number> : {},
    collapseContributors: unique(Array.isArray(raw.collapseContributors) ? raw.collapseContributors.map(Number).filter(validSlot) : []),
    damageWindowOpen: raw.damageWindowOpen === true,
  };
}

function openWindow(state: GuildRaidBossState): GuildRaidBossState {
  return { ...state, damageWindowOpen: true, damageWindowRevision: state.damageWindowRevision + 1 };
}

function advancePhase(state: GuildRaidBossState, phase: GuildRaidBossPhase): GuildRaidBossState {
  return {
    ...state, phase, phaseStartedRevision: state.revision,
    damageWindowOpen: false, attunements: { '1': null, '2': null, '3': null, '4': null },
    armorBreakers: [], boundEchoes: {}, collapseContributors: [],
  };
}

export function reduceGuildRaidBossAction(current: GuildRaidBossState, action: GuildRaidBossAction): GuildRaidBossState {
  if (!validSlot(action.slot)) throw new Error('Ungültiger Raid-Slot.');
  if (current.phase === 'defeated') return current;
  let next: GuildRaidBossState = { ...current, revision: current.revision + 1 };

  if (action.type === 'attune' && current.phase === 'veil-armor') {
    const attunements = { ...current.attunements, [String(action.slot)]: action.sigil };
    const suns = Object.values(attunements).filter(value => value === 'sun').length;
    const moons = Object.values(attunements).filter(value => value === 'moon').length;
    next = { ...next, attunements };
    if (suns === 2 && moons === 2) next = openWindow(next);
  } else if (action.type === 'break-armor' && current.phase === 'veil-armor') {
    if (!current.damageWindowOpen) throw new Error('Der Schleierpanzer ist noch geschlossen.');
    const armorBreakers = unique([...current.armorBreakers, action.slot]);
    next = { ...next, armorBreakers };
    if (armorBreakers.length === 4) next = advancePhase(next, 'split-echoes');
  } else if (action.type === 'bind-echo' && current.phase === 'split-echoes') {
    const boundEchoes = { ...current.boundEchoes, [String(action.slot)]: action.echo };
    const assigned = Object.values(boundEchoes);
    next = { ...next, boundEchoes };
    if (assigned.length === 4 && new Set(assigned).size === 4) next = openWindow(next);
  } else if (action.type === 'stabilize-collapse' && current.phase === 'collapse') {
    if (action.pulse < current.collapsePulse) return current;
    const contributors = action.pulse === current.collapsePulse
      ? unique([...current.collapseContributors, action.slot])
      : [action.slot];
    next = { ...next, collapsePulse: action.pulse, collapseContributors: contributors };
    if (contributors.length === 4) next = openWindow(next);
  } else if (action.type === 'strike') {
    if (!current.damageWindowOpen || action.windowRevision !== current.damageWindowRevision) throw new Error('Kein gültiges Boss-Schadensfenster.');
    const cappedDamage = Math.max(0, Math.min(90_000, Math.trunc(action.amount)));
    const health = Math.max(0, current.health - cappedDamage);
    next = { ...next, health };
    if (health <= 0) next = { ...advancePhase(next, 'defeated'), health: 0, defeatedAtRevision: next.revision };
    else if (current.phase === 'veil-armor' && health <= current.maxHealth * 0.66) next = advancePhase(next, 'split-echoes');
    else if (current.phase === 'split-echoes' && health <= current.maxHealth * 0.33) next = advancePhase(next, 'collapse');
  } else {
    throw new Error('Aktion passt nicht zur aktiven Bossphase.');
  }

  return next;
}

export function bossReadyFromRoomTen(snapshot: GuildRaidRunSnapshot): boolean {
  const block13 = snapshot.roomState?.mechanicState?.block13 as Record<string, unknown> | undefined;
  return snapshot.currentRoom === 10 && block13?.bossHandoffReady === true && block13?.phase === 'cleared';
}

export async function submitGuildRaidBossAction(
  snapshot: GuildRaidRunSnapshot,
  action: GuildRaidBossAction,
  idempotencyKey = createGuildRaidMutationKey(),
): Promise<GuildRaidRunSnapshot> {
  if (!bossReadyFromRoomTen(snapshot) && !snapshot.roomState?.bossState) throw new Error('Der Raid-Boss wurde noch nicht freigeschaltet.');
  const current = normalizeGuildRaidBossState(snapshot.roomState?.bossState);
  const next = reduceGuildRaidBossAction(current, action);
  return mutateGuildRaidRunState(snapshot.raidRunId, snapshot.stateVersion, {
    bossState: next,
    playerState: { mechanicState: { lastBossAction: action.type, bossRevision: next.revision } },
  }, idempotencyKey);
}

export const GUILD_RAID_BOSS_SLOTS = slots;
