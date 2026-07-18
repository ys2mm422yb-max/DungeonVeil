import { currentDuoRunContext } from './coopRunMode';
import { planSharedBossEquipmentReward } from './equipmentDropContract';
import { EQUIPMENT, type PendingEquipmentDrop } from './metaProgression';
import { equipmentPresentation } from './equipmentPresentation';
import {
  createOrLoadCoopSharedLoot,
  loadCoopSharedLoot,
  submitCoopLootChoice,
  type CoopLootChoice,
  type CoopSharedLootSnapshot,
} from './coopSharedLootOnline';
import { collectBalancedEquipmentDropOnce, grantMetaDustOnce } from './coopSharedLootPayout';
import { grantEquipmentSourceMarkOnce } from './equipmentTargeting';
import { currentOnlineSession } from './supabaseOnline';
import { pushCloudSave } from './cloudSave';
import { recordPlayerProfileItemFound } from './playerProfile';

const POLL_MS = 700;
const RESULT_HOLD_MS = 3000;
const MAX_CONSECUTIVE_ERRORS = 4;

let activeKey = '';
let activeChapter = 0;
let activeRoom = 0;
let timer = 0;
let resultTimer = 0;
let overlay: HTMLDivElement | null = null;
let snapshot: CoopSharedLootSnapshot | null = null;
let plannedDrop: PendingEquipmentDrop | null | undefined;
let polling = false;
let busy = false;
let consecutiveErrors = 0;
const appliedDrops = new Set<string>();
const markedDrops = new Set<string>();

function de(): boolean {
  return !String(document.documentElement.lang || 'de').toLowerCase().startsWith('en');
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setExitBlocked(blocked: boolean): void {
  if (blocked) document.documentElement.dataset.dungeonVeilCoopLootPending = '1';
  else delete document.documentElement.dataset.dungeonVeilCoopLootPending;
}

function ensureOverlay(): HTMLDivElement {
  if (overlay?.isConnected) return overlay;
  overlay = document.createElement('div');
  overlay.dataset.testid = 'coop-shared-loot';
  overlay.className = 'fixed inset-0 z-[96] grid place-items-center bg-black/68 px-4 backdrop-blur-sm';
  document.body.appendChild(overlay);
  return overlay;
}

function stopRuntime(): void {
  window.clearInterval(timer);
  window.clearTimeout(resultTimer);
  timer = 0;
  resultTimer = 0;
  activeKey = '';
  activeChapter = 0;
  activeRoom = 0;
  snapshot = null;
  plannedDrop = undefined;
  polling = false;
  busy = false;
  consecutiveErrors = 0;
  setExitBlocked(false);
  overlay?.remove();
  overlay = null;
}

function secondsRemaining(value: CoopSharedLootSnapshot): number {
  const serverOffset = Date.parse(value.server_now) - Date.now();
  return Math.max(0, Math.ceil((Date.parse(value.deadline_at) - (Date.now() + serverOffset)) / 1000));
}

function choiceText(value: CoopLootChoice | null, german: boolean): string {
  if (value === 'claim') return german ? 'BEANSPRUCHT' : 'CLAIM';
  if (value === 'pass') return german ? 'GEPASST' : 'PASS';
  return '—';
}

function resultText(value: CoopSharedLootSnapshot, german: boolean): string {
  const userId = currentOnlineSession()?.user.id ?? '';
  if (value.winner_user_id === userId) return german ? 'DU HAST DIE BEUTE ERHALTEN' : 'YOU RECEIVED THE LOOT';
  if (value.resolution === 'contested') return german ? `+${value.compensation_dust} STAUB ENTSCHÄDIGUNG` : `+${value.compensation_dust} DUST COMPENSATION`;
  if (value.resolution === 'all_pass' || value.resolution === 'timeout') return german ? `+${value.salvage_dust} STAUB VERWERTUNG` : `+${value.salvage_dust} DUST SALVAGE`;
  return german ? 'DEIN MITSPIELER ERHÄLT DIE BEUTE' : 'YOUR TEAMMATE RECEIVES THE LOOT';
}

function renderError(message: string, terminal: boolean): void {
  const german = de();
  const root = ensureOverlay();
  root.innerHTML = `<section class="w-full max-w-sm rounded-3xl border border-red-300/25 bg-[#130d12]/[.985] p-5 text-center text-white shadow-[0_28px_90px_rgba(0,0,0,.75)]">
    <div class="text-[7px] font-black uppercase tracking-[.24em] text-red-200/55">${german ? 'DUO-BEUTE' : 'DUO LOOT'}</div>
    <h2 class="mt-2 font-serif text-2xl text-red-100">${german ? 'VERBINDUNG WIRD GEPRÜFT' : 'CHECKING CONNECTION'}</h2>
    <p class="mt-3 text-[9px] leading-relaxed text-white/55">${escapeHtml(message)}</p>
    ${terminal ? `<button data-testid="coop-loot-fallback-close" class="mt-5 w-full rounded-2xl border border-white/12 bg-white/[.05] px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-white/70">${german ? 'OHNE BEUTE FORTFAHREN' : 'CONTINUE WITHOUT LOOT'}</button>` : `<div class="mt-5 text-[8px] font-black uppercase tracking-[.14em] text-red-100/60">${german ? 'NEUER VERSUCH …' : 'RETRYING …'}</div>`}
  </section>`;
  root.querySelector<HTMLButtonElement>('[data-testid="coop-loot-fallback-close"]')?.addEventListener('click', stopRuntime, { once: true });
}

function renderSnapshot(value: CoopSharedLootSnapshot): void {
  const german = de();
  const item = EQUIPMENT[value.equipment_id];
  const presentation = equipmentPresentation(item);
  const title = german ? presentation.nameDe : presentation.nameEn;
  const description = german ? presentation.descriptionDe : presentation.descriptionEn;
  const resolved = value.status === 'resolved';
  const userId = currentOnlineSession()?.user.id ?? '';
  const won = resolved && value.winner_user_id === userId;
  const showPartner = Boolean(value.my_choice || resolved);
  const remaining = secondsRemaining(value);
  const root = ensureOverlay();
  root.dataset.status = value.status;
  root.innerHTML = `<section class="w-full max-w-sm rounded-3xl border border-amber-300/30 bg-[#100c08]/[.985] p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,.75)]">
    <div class="flex items-start justify-between gap-3">
      <div><div class="text-[7px] font-black uppercase tracking-[.25em] text-amber-200/55">${german ? 'GEMEINSAME DUO-BEUTE' : 'SHARED DUO LOOT'}</div><h2 class="mt-1 font-serif text-2xl text-amber-100">${escapeHtml(title)}</h2></div>
      <div class="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[7px] font-black uppercase text-white/45">${escapeHtml(value.rarity)}</div>
    </div>
    <p class="mt-3 text-[10px] leading-relaxed text-white/52">${escapeHtml(description)}</p>
    <div class="mt-3 rounded-2xl border border-white/8 bg-black/35 p-3 text-[8px] text-white/45">
      <div class="flex justify-between"><span>${german ? 'DEINE WAHL' : 'YOUR CHOICE'}</span><strong class="text-white/75">${choiceText(value.my_choice, german)}</strong></div>
      <div class="mt-2 flex justify-between"><span>${german ? 'MITSPIELER' : 'TEAMMATE'}</span><strong class="text-white/75">${showPartner ? choiceText(value.partner_choice, german) : (german ? 'ENTSCHEIDET …' : 'DECIDING …')}</strong></div>
      ${value.resolution === 'contested' ? `<div data-testid="coop-loot-rolls" class="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-center"><div><div class="text-white/35">${german ? 'DEIN WURF' : 'YOUR ROLL'}</div><div class="mt-1 text-xl font-black text-amber-100">${value.my_roll ?? '—'}</div></div><div><div class="text-white/35">${german ? 'ANDERER WURF' : 'OTHER ROLL'}</div><div class="mt-1 text-xl font-black text-white/70">${value.partner_roll ?? '—'}</div></div></div>` : ''}
    </div>
    ${resolved ? `<div data-testid="coop-loot-result" class="mt-4 rounded-2xl border px-3 py-4 text-center ${won ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100' : 'border-amber-300/20 bg-amber-500/[.08] text-amber-100'}"><div class="text-[11px] font-black uppercase tracking-[.12em]">${escapeHtml(resultText(value, german))}</div></div>` : `<div class="mt-3 text-center text-[8px] font-black uppercase tracking-[.15em] text-amber-100/60">${remaining > 0 ? `${remaining} ${german ? 'SEKUNDEN' : 'SECONDS'}` : (german ? 'WIRD AUFGELÖST …' : 'RESOLVING …')}</div><div class="mt-3 grid grid-cols-2 gap-3"><button data-testid="coop-loot-pass" class="rounded-2xl border border-white/12 bg-white/[.04] px-3 py-3 text-[9px] font-black uppercase text-white/55 disabled:opacity-35" ${busy || value.my_choice ? 'disabled' : ''}>${german ? 'PASSEN' : 'PASS'}</button><button data-testid="coop-loot-claim" class="rounded-2xl border border-amber-300/35 bg-amber-500/15 px-3 py-3 text-[9px] font-black uppercase text-amber-100 disabled:opacity-35" ${busy || value.my_choice ? 'disabled' : ''}>${german ? 'BEANSPRUCHEN' : 'CLAIM'}</button></div>`}
  </section>`;

  root.querySelector<HTMLButtonElement>('[data-testid="coop-loot-pass"]')?.addEventListener('click', () => void choose('pass'));
  root.querySelector<HTMLButtonElement>('[data-testid="coop-loot-claim"]')?.addEventListener('click', () => void choose('claim'));
}

async function applyResolvedReward(value: CoopSharedLootSnapshot): Promise<void> {
  if (appliedDrops.has(value.drop_id)) return;
  appliedDrops.add(value.drop_id);
  const userId = currentOnlineSession()?.user.id ?? '';
  const won = Boolean(userId && value.winner_user_id === userId);
  const contestedLoss = value.resolution === 'contested' && value.my_choice === 'claim' && !won;
  const sharedSalvage = value.resolution === 'all_pass' || value.resolution === 'timeout';

  if (won) {
    const reward = collectBalancedEquipmentDropOnce(value.equipment_id, `coop-loot:${value.drop_id}:item`);
    if (reward.applied) {
      recordPlayerProfileItemFound();
      window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
        detail: {
          item: value.equipment_id,
          duplicate: reward.duplicate,
          copies: reward.copies,
          level: reward.level,
          convertedDust: reward.convertedDust,
        },
      }));
    }
  } else if (contestedLoss) {
    grantMetaDustOnce(value.compensation_dust, `coop-loot:${value.drop_id}:compensation`);
  } else if (sharedSalvage) {
    grantMetaDustOnce(value.salvage_dust, `coop-loot:${value.drop_id}:salvage`);
  }
  await pushCloudSave().catch(() => false);
}

async function choose(selected: CoopLootChoice): Promise<void> {
  if (busy || !snapshot || snapshot.status === 'resolved' || snapshot.my_choice) return;
  const context = currentDuoRunContext();
  if (!context) return;
  busy = true;
  renderSnapshot(snapshot);
  try {
    const next = await submitCoopLootChoice(context, snapshot.drop_id, snapshot.chapter, snapshot.room, selected);
    if (next) {
      snapshot = next;
      renderSnapshot(next);
    }
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error), false);
  } finally {
    busy = false;
  }
}

async function poll(): Promise<void> {
  if (polling || !activeKey) return;
  const context = currentDuoRunContext();
  if (!context || activeKey !== `${context.lobbyId}:${context.runSeed}:${activeChapter}:${activeRoom}`) {
    stopRuntime();
    return;
  }

  polling = true;
  try {
    let next = await loadCoopSharedLoot(context, activeChapter, activeRoom);
    if (!next && context.role === 'host') {
      if (plannedDrop === undefined) plannedDrop = planSharedBossEquipmentReward(activeChapter, activeRoom);
      if (plannedDrop) next = await createOrLoadCoopSharedLoot(context, activeChapter, activeRoom, plannedDrop);
    }
    if (!next) return;

    consecutiveErrors = 0;
    snapshot = next;
    if (!markedDrops.has(next.drop_id)) {
      markedDrops.add(next.drop_id);
      grantEquipmentSourceMarkOnce(next.source, `coop-loot:${next.drop_id}`);
    }
    setExitBlocked(next.status === 'open');
    renderSnapshot(next);
    if (next.status === 'resolved') {
      await applyResolvedReward(next);
      setExitBlocked(false);
      if (!resultTimer) resultTimer = window.setTimeout(stopRuntime, RESULT_HOLD_MS);
    }
  } catch (error) {
    consecutiveErrors += 1;
    const terminal = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS;
    renderError(error instanceof Error ? error.message : String(error), terminal);
    if (terminal) setExitBlocked(false);
  } finally {
    polling = false;
  }
}

export function requestCoopSharedLoot(chapter: number, room: number): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const context = currentDuoRunContext();
  if (!context) return;
  const safeChapter = Math.max(1, Math.min(999, Math.floor(Number(chapter) || 1)));
  const safeRoom = Math.max(1, Math.min(50, Math.floor(Number(room) || 1)));
  const key = `${context.lobbyId}:${context.runSeed}:${safeChapter}:${safeRoom}`;
  if (activeKey === key) {
    void poll();
    return;
  }

  stopRuntime();
  activeKey = key;
  activeChapter = safeChapter;
  activeRoom = safeRoom;
  setExitBlocked(true);
  ensureOverlay();
  renderError(de() ? 'Gemeinsame Beute wird vorbereitet.' : 'Preparing shared loot.', false);
  void poll();
  timer = window.setInterval(() => void poll(), POLL_MS);
}
