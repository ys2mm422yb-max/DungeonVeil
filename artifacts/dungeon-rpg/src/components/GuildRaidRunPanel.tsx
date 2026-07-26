import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGuildRaidRunSnapshot, rejoinGuildRaidRun, watchGuildRaidRun, type GuildRaidRunSnapshot } from '../game/guildRaidRunOnline';
import { GUILD_RAID_ROOM_DEFINITIONS, initialGuildRaidRoomState, normalizeGuildRaidRoomState, submitGuildRaidRoomAction, type GuildRaidRoomAction, type GuildRaidRoomId } from '../game/guildRaidRoomsOneToFive';
import { GUILD_RAID_ADVANCED_ROOM_DEFINITIONS, initialGuildRaidAdvancedRoomState, normalizeGuildRaidAdvancedRoomState, submitGuildRaidAdvancedRoomAction, type GuildRaidAdvancedRoomAction, type GuildRaidAdvancedRoomId } from '../game/guildRaidRoomsSixToTen';
import { bossReadyFromRoomTen, normalizeGuildRaidBossState, submitGuildRaidBossAction, type GuildRaidBossAction } from '../game/guildRaidBoss';

type Props = { raidRunId: string; language: 'de' | 'en'; onClose: () => void };
const slots = [1, 2, 3, 4] as const;

const participantLabels = {
  de: { active: 'Aktiv', disconnected: 'Getrennt', completed: 'Abgeschlossen', abandoned: 'Verlassen' },
  en: { active: 'Active', disconnected: 'Disconnected', completed: 'Completed', abandoned: 'Abandoned' },
} as const;
const realtimeLabels = {
  de: { connecting: 'Verbindung wird aufgebaut', connected: 'Verbunden', reconnecting: 'Wiederverbinden', degraded: 'Eingeschränkt', offline: 'Offline' },
  en: { connecting: 'Connecting', connected: 'Connected', reconnecting: 'Reconnecting', degraded: 'Degraded', offline: 'Offline' },
} as const;
const phaseLabels = {
  de: { pending: 'Ausstehend', active: 'Aktiv', cleared: 'Geschafft', failed: 'Gescheitert', 'veil-armor': 'Schleierpanzer', 'split-echoes': 'Geteilte Echos', collapse: 'Zusammenbruch', defeated: 'Besiegt' },
  en: { pending: 'Pending', active: 'Active', cleared: 'Cleared', failed: 'Failed', 'veil-armor': 'Veil armor', 'split-echoes': 'Split echoes', collapse: 'Collapse', defeated: 'Defeated' },
} as const;
const roleLabels = {
  de: { warden: 'Wächter', runner: 'Läufer', breaker: 'Brecher', binder: 'Binder' },
  en: { warden: 'Warden', runner: 'Runner', breaker: 'Breaker', binder: 'Binder' },
} as const;
const zoneLabels = {
  de: { north: 'Nord', south: 'Süd', east: 'Ost' },
  en: { north: 'North', south: 'South', east: 'East' },
} as const;

export function GuildRaidRunPanel({ raidRunId, language, onClose }: Props) {
  const de = language === 'de';
  const locale = de ? 'de' : 'en';
  const [snapshot, setSnapshot] = useState<GuildRaidRunSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [realtime, setRealtime] = useState('connecting');
  const versionRef = useRef(0);

  const refresh = useCallback(async () => {
    const next = await fetchGuildRaidRunSnapshot(raidRunId);
    versionRef.current = next.stateVersion;
    setSnapshot(next);
  }, [raidRunId]);

  useEffect(() => { void refresh().catch(reason => setError(String(reason))); }, [refresh]);
  useEffect(() => {
    if (!snapshot) return;
    return watchGuildRaidRun(snapshot.raidRunId, snapshot.stateVersion, (version, gap) => {
      if (version <= versionRef.current) return;
      versionRef.current = version;
      void (gap ? rejoinGuildRaidRun(snapshot.raidRunId, snapshot.stateVersion) : fetchGuildRaidRunSnapshot(snapshot.raidRunId))
        .then(setSnapshot)
        .catch(() => setRealtime('degraded'));
    }, setRealtime);
  }, [snapshot?.raidRunId]);

  const room = Math.min(10, Math.max(1, snapshot?.currentRoom ?? 1));
  const basicRoom = Math.min(5, room) as GuildRaidRoomId;
  const advancedRoom = Math.max(6, room) as GuildRaidAdvancedRoomId;
  const isAdvanced = room >= 6;
  const definition = isAdvanced ? GUILD_RAID_ADVANCED_ROOM_DEFINITIONS[advancedRoom - 6] : GUILD_RAID_ROOM_DEFINITIONS[basicRoom - 1];
  const basic = useMemo(() => snapshot ? normalizeGuildRaidRoomState(basicRoom, (snapshot.roomState?.mechanicState?.block12 as Record<string, unknown>) ?? initialGuildRaidRoomState(basicRoom)) : initialGuildRaidRoomState(basicRoom), [basicRoom, snapshot]);
  const advanced = useMemo(() => snapshot ? normalizeGuildRaidAdvancedRoomState(advancedRoom, (snapshot.roomState?.mechanicState?.block13 as Record<string, unknown>) ?? initialGuildRaidAdvancedRoomState(advancedRoom)) : initialGuildRaidAdvancedRoomState(advancedRoom), [advancedRoom, snapshot]);
  const boss = useMemo(() => normalizeGuildRaidBossState(snapshot?.roomState?.bossState), [snapshot?.roomState?.bossState]);
  const bossActive = Boolean(snapshot && (snapshot.roomState?.bossState || bossReadyFromRoomTen(snapshot)));
  const mechanic = isAdvanced ? advanced : basic;
  const mySlot = snapshot?.participants.find(player => player.userId === snapshot.viewerUserId)?.slot ?? 1;

  const act = async (action: GuildRaidRoomAction | GuildRaidAdvancedRoomAction | GuildRaidBossAction) => {
    if (!snapshot || busy) return;
    setBusy(true);
    setError('');
    try {
      const next = bossActive
        ? await submitGuildRaidBossAction(snapshot, action as GuildRaidBossAction)
        : isAdvanced
          ? await submitGuildRaidAdvancedRoomAction(snapshot, action as GuildRaidAdvancedRoomAction)
          : await submitGuildRaidRoomAction(snapshot, action as GuildRaidRoomAction);
      versionRef.current = next.stateVersion;
      setSnapshot(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const progress = mechanic.phase === 'cleared' ? 100 : isAdvanced
    ? advancedRoom === 6 ? (advanced.mirrorRounds ?? 0) * 34
      : advancedRoom === 7 ? (advanced.relayStep ?? 0) * 12.5
        : advancedRoom === 8 ? ((advanced.shadowTargetRevision ?? 1) - 1) * 25
          : advancedRoom === 9 ? advanced.sharedStability ?? 0
            : ((advanced.gateRuneStep ?? 0) * 12.5) + (Object.values(advanced.gateChannels ?? {}).filter(Boolean).length * 12.5)
    : basic.anchorProgress ?? ((basic.sealStep ?? 0) * 25);
  const bossProgress = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
  const mechanicPhaseLabel = phaseLabels[locale][mechanic.phase as keyof typeof phaseLabels.de] ?? mechanic.phase;
  const bossPhaseLabel = phaseLabels[locale][boss.phase];
  const realtimeLabel = realtimeLabels[locale][realtime as keyof typeof realtimeLabels.de] ?? realtime;

  const roomControls = (
    <>
      <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="flex justify-between text-[8px] uppercase text-white/40"><span>{de ? 'Stand' : 'Revision'} {mechanic.revision}</span><span>{mechanicPhaseLabel}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-violet-300/70" style={{ width: `${Math.min(100, progress)}%` }} /></div>
      </div>
      {!isAdvanced && basicRoom === 1 && <div className="grid grid-cols-2 gap-2">{slots.map(slot => <button key={slot} disabled={busy || slot !== mySlot} onClick={() => void act({ type: 'anchor', slot, active: !basic.anchors?.[String(slot)] })} className="min-h-14 rounded-xl border border-violet-200/20 bg-violet-500/10 text-sm font-black disabled:opacity-35">{de ? 'Anker' : 'Anchor'} {slot} · {basic.anchors?.[String(slot)] ? (de ? 'AKTIV' : 'ACTIVE') : (de ? 'OFFEN' : 'OPEN')}</button>)}</div>}
      {!isAdvanced && basicRoom === 2 && <div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => void act({ type: 'line', slot: mySlot, line: 'left' })} className="min-h-14 rounded-xl border border-sky-200/20 bg-sky-500/10">{de ? 'Linke Linie halten' : 'Hold left line'}</button><button disabled={busy} onClick={() => void act({ type: 'line', slot: mySlot, line: 'right' })} className="min-h-14 rounded-xl border border-sky-200/20 bg-sky-500/10">{de ? 'Rechte Linie halten' : 'Hold right line'}</button><button disabled={busy} onClick={() => void act({ type: 'interrupt', slot: mySlot, channelId: `channel-${(basic.interruptedChannels?.length ?? 0) + 1}` })} className="col-span-2 min-h-14 rounded-xl border border-amber-200/20 bg-amber-500/10">{de ? 'Elitekanal unterbrechen' : 'Interrupt elite channel'}</button></div>}
      {!isAdvanced && basicRoom === 3 && <div className="space-y-2"><div className="rounded-xl border border-amber-200/20 bg-amber-500/8 p-4 text-center text-lg font-black">{de ? 'Träger' : 'Carrier'}: P{basic.burdenCarrier}</div><div className="grid grid-cols-3 gap-2">{slots.filter(slot => slot !== mySlot).map(slot => <button key={slot} disabled={busy || basic.burdenCarrier !== mySlot} onClick={() => void act({ type: 'burden-pass', fromSlot: mySlot, toSlot: slot })} className="min-h-12 rounded-xl border border-white/10 bg-white/5">→ P{slot}</button>)}</div></div>}
      {!isAdvanced && basicRoom === 4 && <div className="grid grid-cols-3 gap-2">{(['north', 'south', 'east'] as const).map(zone => <button key={zone} disabled={busy} onClick={() => void act({ type: 'cleanse', slot: mySlot, zoneId: zone, active: true })} className="min-h-16 rounded-xl border border-emerald-200/20 bg-emerald-500/10 uppercase">{zoneLabels[locale][zone]}</button>)}</div>}
      {!isAdvanced && basicRoom === 5 && <div className="grid grid-cols-2 gap-2">{slots.map(seal => <button key={seal} disabled={busy} onClick={() => void act({ type: 'seal', slot: mySlot, seal })} className="min-h-16 rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/10 text-lg font-black">{de ? 'Siegel' : 'Seal'} {seal}</button>)}</div>}
      {isAdvanced && advancedRoom === 6 && <div className="space-y-2"><div className="text-center text-xs text-white/55">{de ? 'Bestätigte Runden' : 'Confirmed rounds'}: {advanced.mirrorRounds ?? 0}/3</div><div className="grid grid-cols-2 gap-2"><button data-testid="guild-raid-mirror-sun" disabled={busy} onClick={() => void act({ type: 'mirror', slot: mySlot, stance: 'sun' })} className="min-h-16 rounded-xl border border-amber-200/25 bg-amber-400/10 font-black">☀ {de ? 'Sonne' : 'Sun'}</button><button data-testid="guild-raid-mirror-moon" disabled={busy} onClick={() => void act({ type: 'mirror', slot: mySlot, stance: 'moon' })} className="min-h-16 rounded-xl border border-sky-200/25 bg-sky-400/10 font-black">☾ {de ? 'Mond' : 'Moon'}</button></div></div>}
      {isAdvanced && advancedRoom === 7 && <div className="space-y-2"><div className="rounded-xl border border-violet-200/20 bg-violet-500/10 p-4 text-center text-lg font-black">{de ? 'Runenträger' : 'Rune carrier'}: P{advanced.relayCarrier}</div><button data-testid="guild-raid-relay" disabled={busy || advanced.relayCarrier !== mySlot} onClick={() => void act({ type: 'relay', fromSlot: mySlot, toSlot: (mySlot % 4) + 1 })} className="min-h-16 w-full rounded-xl border border-violet-200/25 bg-violet-500/10 font-black disabled:opacity-35">{de ? 'Rune weitergeben' : 'Pass rune'} → P{(mySlot % 4) + 1}</button></div>}
      {isAdvanced && advancedRoom === 8 && <div className="grid grid-cols-2 gap-2"><button data-testid="guild-raid-shadow-mark" disabled={busy} onClick={() => void act({ type: 'mark', slot: mySlot, targetRevision: advanced.shadowTargetRevision ?? 1 })} className="min-h-16 rounded-xl border border-cyan-200/25 bg-cyan-500/10 font-black">{de ? 'Schatten markieren' : 'Mark shadow'}</button><button data-testid="guild-raid-shadow-strike" disabled={busy || (advanced.shadowMarks?.length ?? 0) < 2} onClick={() => void act({ type: 'strike', slot: mySlot, targetRevision: advanced.shadowTargetRevision ?? 1 })} className="min-h-16 rounded-xl border border-red-200/25 bg-red-500/10 font-black disabled:opacity-35">{de ? 'Synchron schlagen' : 'Synchronized strike'}</button></div>}
      {isAdvanced && advancedRoom === 9 && <div className="space-y-2"><div className="text-center text-xl font-black">{advanced.sharedStability ?? 0}%</div><button data-testid="guild-raid-stabilize" disabled={busy} onClick={() => void act({ type: 'stabilize', slot: mySlot, pulse: advanced.lastPulse ?? 1 })} className="min-h-16 w-full rounded-xl border border-emerald-200/25 bg-emerald-500/10 font-black">{de ? 'Gemeinsam stabilisieren' : 'Stabilize together'}</button></div>}
      {isAdvanced && advancedRoom === 10 && <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{(['warden', 'runner', 'breaker', 'binder'] as const).map(role => <button key={role} disabled={busy} onClick={() => void act({ type: 'gate-role', slot: mySlot, role })} className="min-h-12 rounded-xl border border-white/10 bg-white/5 uppercase">{roleLabels[locale][role]}</button>)}</div><div className="grid grid-cols-4 gap-2">{slots.map(rune => <button key={rune} disabled={busy} onClick={() => void act({ type: 'gate-rune', slot: mySlot, rune })} className="min-h-14 rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/10 font-black">{de ? 'Rune' : 'Rune'} {rune}</button>)}</div><button data-testid="guild-raid-gate-channel" disabled={busy || (advanced.gateRuneStep ?? 0) < 4} onClick={() => void act({ type: 'gate-channel', slot: mySlot, active: !advanced.gateChannels?.[String(mySlot)] })} className="min-h-16 w-full rounded-xl border border-amber-200/25 bg-amber-500/10 font-black disabled:opacity-35">{advanced.bossHandoffReady ? (de ? 'Bosszugang bereit' : 'Boss handoff ready') : (de ? 'Eigenen Kanal halten' : 'Hold own channel')}</button></div>}
    </>
  );

  const bossControls = (
    <div className="space-y-3" data-testid="guild-raid-boss-panel">
      <div className="rounded-2xl border border-red-200/20 bg-red-500/8 p-3"><div className="flex justify-between text-[8px] uppercase text-white/50"><span>{bossPhaseLabel}</span><span>{Math.ceil(boss.health).toLocaleString(de ? 'de-DE' : 'en-US')} / {boss.maxHealth.toLocaleString(de ? 'de-DE' : 'en-US')}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-black/35"><div className="h-full bg-red-300/75" style={{ width: `${bossProgress}%` }} /></div></div>
      {boss.phase === 'veil-armor' && <div className="space-y-2"><div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => void act({ type: 'attune', slot: mySlot, sigil: 'sun' })} className="min-h-16 rounded-xl border border-amber-200/25 bg-amber-400/10 font-black">☀ {de ? 'Sonne' : 'Sun'}</button><button disabled={busy} onClick={() => void act({ type: 'attune', slot: mySlot, sigil: 'moon' })} className="min-h-16 rounded-xl border border-sky-200/25 bg-sky-400/10 font-black">☾ {de ? 'Mond' : 'Moon'}</button></div><button data-testid="guild-raid-boss-break" disabled={busy || !boss.damageWindowOpen} onClick={() => void act({ type: 'break-armor', slot: mySlot })} className="min-h-16 w-full rounded-xl border border-fuchsia-200/25 bg-fuchsia-500/10 font-black disabled:opacity-35">{de ? 'Schleierpanzer brechen' : 'Break veil armor'}</button></div>}
      {boss.phase === 'split-echoes' && <div className="grid grid-cols-4 gap-2">{slots.map(echo => <button key={echo} disabled={busy} onClick={() => void act({ type: 'bind-echo', slot: mySlot, echo })} className="min-h-16 rounded-xl border border-cyan-200/25 bg-cyan-500/10 text-lg font-black">{de ? 'Echo' : 'Echo'} {echo}</button>)}</div>}
      {boss.phase === 'collapse' && <button data-testid="guild-raid-boss-stabilize" disabled={busy} onClick={() => void act({ type: 'stabilize-collapse', slot: mySlot, pulse: boss.collapsePulse + 1 })} className="min-h-16 w-full rounded-xl border border-emerald-200/25 bg-emerald-500/10 font-black">{de ? 'Zusammenbruch stabilisieren' : 'Stabilize collapse'}</button>}
      {boss.phase !== 'defeated' && <button data-testid="guild-raid-boss-strike" disabled={busy || !boss.damageWindowOpen} onClick={() => void act({ type: 'strike', slot: mySlot, amount: 60000, windowRevision: boss.damageWindowRevision })} className="min-h-16 w-full rounded-xl border border-red-200/25 bg-red-500/10 font-black disabled:opacity-35">{de ? 'Koordinierter Angriff' : 'Coordinated strike'}</button>}
      {boss.phase === 'defeated' && <div className="rounded-2xl border border-amber-200/25 bg-amber-400/10 p-5 text-center"><div className="text-xl font-black">{de ? 'RAID ABGESCHLOSSEN' : 'RAID COMPLETED'}</div><div className="mt-2 text-[9px] text-white/55">{de ? 'Belohnungsanspruch wird serverseitig geprüft.' : 'Reward eligibility is verified server-side.'}</div></div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" data-testid="guild-raid-run-overlay">
      <section className="flex h-[min(94dvh,850px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-violet-200/25 bg-[radial-gradient(circle_at_top,rgba(125,72,190,.25),transparent_35%),linear-gradient(160deg,#171020,#09070d)] p-3 text-white" data-testid="guild-raid-run-panel">
        <header className="relative border-b border-white/10 pb-3 pr-14"><button aria-label={de ? 'Raid schließen' : 'Close raid'} onClick={onClose} className="absolute right-0 top-0 h-11 w-11 rounded-xl border border-white/10 bg-black/30 text-xl">×</button><div className="text-[7px] font-black uppercase tracking-[.2em] text-violet-100/55">{bossActive ? (de ? 'Gildenraid · Boss' : 'Guild raid · Boss') : `${de ? 'Gildenraid · Raum' : 'Guild raid · Room'} ${room}/10`} · {realtimeLabel}</div><h2 className="mt-1 text-xl font-black">{bossActive ? (de ? 'Der Verschleierte Archon' : 'The Veiled Archon') : (de ? definition.titleDe : definition.titleEn)}</h2><p className="mt-1 text-[9px] text-white/45">{bossActive ? (de ? 'Breche den Panzer, binde die Echos und überlebt den Zusammenbruch gemeinsam.' : 'Break the armor, bind the echoes and survive the collapse together.') : (de ? definition.objectiveDe : definition.objectiveEn)}</p></header>
        {error && <div className="mt-2 rounded-xl border border-red-300/25 bg-red-500/10 p-2 text-[9px] text-red-100">{error}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          {!snapshot ? <div className="grid min-h-48 place-items-center text-sm text-white/40">{de ? 'Serverstand wird geladen…' : 'Loading server state…'}</div> : <div className="space-y-3"><div className="grid grid-cols-4 gap-2">{snapshot.participants.map(player => <div key={player.slot} className={`rounded-xl border p-2 text-center ${player.status === 'active' ? 'border-emerald-300/20 bg-emerald-400/8' : 'border-amber-300/20 bg-amber-400/8'}`}><div className="text-xs font-black">P{player.slot}</div><div className="text-[6px] uppercase text-white/40">{participantLabels[locale][player.status]}</div></div>)}</div>{bossActive ? bossControls : roomControls}</div>}
        </div>
      </section>
    </div>
  );
}
