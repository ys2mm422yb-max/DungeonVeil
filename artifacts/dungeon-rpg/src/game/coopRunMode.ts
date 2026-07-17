export type RunMode = 'solo' | 'duo';
export type CoopRole = 'host' | 'guest';
export type CoopLobbyStatus = 'waiting' | 'ready' | 'in_run' | 'closed';

export const SOLO_RUN_MODE = 'solo' as const;
export const DUO_RUN_MODE = 'duo' as const;
export const SOLO_BALANCE_POLICY = 'immutable' as const;
export const COOP_PLAYER_LIMIT = 2 as const;

export type SoloRunContext = {
  mode: typeof SOLO_RUN_MODE;
  balancePolicy: typeof SOLO_BALANCE_POLICY;
};

export type DuoRunContext = {
  mode: typeof DUO_RUN_MODE;
  lobbyId: string;
  runSeed: number;
  role: CoopRole;
  playerLimit: typeof COOP_PLAYER_LIMIT;
};

export type RunContext = SoloRunContext | DuoRunContext;

export function createSoloRunContext(): SoloRunContext {
  return { mode: SOLO_RUN_MODE, balancePolicy: SOLO_BALANCE_POLICY };
}

export function createDuoRunContext(lobbyId: string, runSeed: number, role: CoopRole): DuoRunContext {
  if (!lobbyId.trim()) throw new Error('Co-op-Lobby fehlt');
  if (!Number.isSafeInteger(runSeed) || runSeed < 0) throw new Error('Ungültiger Co-op-Seed');
  return { mode: DUO_RUN_MODE, lobbyId, runSeed, role, playerLimit: COOP_PLAYER_LIMIT };
}

export function isDuoRun(context: RunContext): context is DuoRunContext {
  return context.mode === DUO_RUN_MODE;
}
