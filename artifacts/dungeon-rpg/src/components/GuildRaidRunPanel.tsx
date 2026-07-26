import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGuildRaidRunSnapshot, rejoinGuildRaidRun, watchGuildRaidRun, type GuildRaidRunSnapshot } from '../game/guildRaidRunOnline';
import { GUILD_RAID_ROOM_DEFINITIONS, initialGuildRaidRoomState, normalizeGuildRaidRoomState, submitGuildRaidRoomAction, type GuildRaidRoomAction, type GuildRaidRoomId } from '../game/guildRaidRoomsOneToFive';

type Props = { raidRunId: string; language: 'de' | 'en'; onClose: () => void };

export function GuildRaidRunPanel({ raidRunId, language, onClose }: Props) {
  const de = language === 'de';
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
      void (gap ? rejoinGuildRaidRun(snapshot.raidRunId, snapshot.stateVersion) : fetchGuildRaidRunSnapshot(snapshot.raidRunId)).then(setSnapshot).catch(() => setRealtime('degraded'));
    }, setRealtime);
  }, [snapshot?.raidRunId]);

  const room = Math.min(5, Math.max(1, snapshot?.currentRoom ?? 1)) as GuildRaidRoomId;
  const definition = GUILD_RAID_ROOM_DEFINITIONS[room - 1];
  const mechanic = useMemo(() => snapshot ? normalizeGuildRaidRoomState(room, (snapshot.roomState?.mechanicState?.block12 as Record<string, unknown>) ?? initialGuildRaidRoomState(room)) : initialGuildRaidRoomState(room), [room, snapshot]);
  const mySlot = snapshot?.participants.find(player => player.userId === snapshot.viewerUserId)?.slot ?? 1;

  const act = async (action: GuildRaidRoomAction) => {
    if (!snapshot || busy) return;
    setBusy(true); setError('');
    try { setSnapshot(await submitGuildRaidRoomAction(snapshot, action)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); await refresh().catch(() => undefined); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" data-testid="guild-raid-run-overlay">
    <section className="flex h-[min(94dvh,850px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-violet-200/25 bg-[radial-gradient(circle_at_top,rgba(125,72,190,.25),transparent_35%),linear-gradient(160deg,#171020,#09070d)] p-3 text-white" data-testid="guild-raid-run-panel">
      <header className="relative border-b border-white/10 pb-3 pr-14"><button aria-label={de ? 'Raid schließen' : 'Close raid'} onClick={onClose} className="absolute right-0 top-0 h-11 w-11 rounded-xl border border-white/10 bg-black/30 text-xl">×</button><div className="text-[7px] font-black uppercase tracking-[.2em] text-violet-100/55">{de ? 'Gildenraid · Raum' : 'Guild raid · Room'} {room}/10 · {realtime}</div><h2 className="mt-1 text-xl font-black">{de ? definition.titleDe : definition.titleEn}</h2><p className="mt-1 text-[9px] text-white/45">{de ? definition.objectiveDe : definition.objectiveEn}</p></header>
      {error && <div className="mt-2 rounded-xl border border-red-300/25 bg-red-500/10 p-2 text-[9px] text-red-100">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {!snapshot ? <div className="grid min-h-48 place-items-center text-sm text-white/40">{de ? 'Serverstand wird geladen…' : 'Loading server state…'}</div> : <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">{snapshot.participants.map(player => <div key={player.slot} className={`rounded-xl border p-2 text-center ${player.status === 'active' ? 'border-emerald-300/20 bg-emerald-400/8' : 'border-amber-300/20 bg-amber-400/8'}`}><div className="text-xs font-black">P{player.slot}</div><div className="text-[6px] uppercase text-white/40">{player.status}</div></div>)}</div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3"><div className="flex justify-between text-[8px] uppercase text-white/40"><span>Revision {mechanic.revision}</span><span>{mechanic.phase}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-violet-300/70" style={{ width: `${mechanic.phase === 'cleared' ? 100 : mechanic.anchorProgress ?? ((mechanic.sealStep ?? 0) * 25)}%` }} /></div></div>
          {room === 1 && <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(slot => <button key={slot} disabled={busy || slot !== mySlot} onClick={() => void act({ type:'anchor', slot, active: !mechanic.anchors?.[String(slot)] })} className="min-h-14 rounded-xl border border-violet-200/20 bg-violet-500/10 text-sm font-black disabled:opacity-35">Anker {slot} · {mechanic.anchors?.[String(slot)] ? 'AKTIV' : 'OFFEN'}</button>)}</div>}
          {room === 2 && <div className="grid grid-cols-2 gap-2"><button disabled={busy} onClick={() => void act({ type:'line', slot:mySlot, line:'left' })} className="min-h-14 rounded-xl border border-sky-200/20 bg-sky-500/10">{de?'Linke Linie halten':'Hold left line'}</button><button disabled={busy} onClick={() => void act({ type:'line', slot:mySlot, line:'right' })} className="min-h-14 rounded-xl border border-sky-200/20 bg-sky-500/10">{de?'Rechte Linie halten':'Hold right line'}</button><button disabled={busy} onClick={() => void act({ type:'interrupt', slot:mySlot, channelId:`channel-${(mechanic.interruptedChannels?.length ?? 0)+1}` })} className="col-span-2 min-h-14 rounded-xl border border-amber-200/20 bg-amber-500/10">{de?'Elitekanal unterbrechen':'Interrupt elite channel'}</button></div>}
          {room === 3 && <div className="space-y-2"><div className="rounded-xl border border-amber-200/20 bg-amber-500/8 p-4 text-center text-lg font-black">{de?'Träger':'Carrier'}: P{mechanic.burdenCarrier}</div><div className="grid grid-cols-3 gap-2">{[1,2,3,4].filter(slot=>slot!==mySlot).map(slot=><button key={slot} disabled={busy || mechanic.burdenCarrier!==mySlot} onClick={()=>void act({type:'burden-pass',fromSlot:mySlot,toSlot:slot})} className="min-h-12 rounded-xl border border-white/10 bg-white/5">→ P{slot}</button>)}</div></div>}
          {room === 4 && <div className="grid grid-cols-3 gap-2">{['north','south','east'].map(zone=><button key={zone} disabled={busy} onClick={()=>void act({type:'cleanse',slot:mySlot,zoneId:zone,active:true})} className="min-h-16 rounded-xl border border-emerald-200/20 bg-emerald-500/10 uppercase">{zone}</button>)}</div>}
          {room === 5 && <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(seal=><button key={seal} disabled={busy} onClick={()=>void act({type:'seal',slot:mySlot,seal})} className="min-h-16 rounded-xl border border-fuchsia-200/20 bg-fuchsia-500/10 text-lg font-black">{de?'Siegel':'Seal'} {seal}</button>)}</div>}
        </div>}
      </div>
    </section>
  </div>;
}
