import React, { useCallback, useEffect, useRef, useState } from 'react';
import { pullCloudSave, pushCloudSave } from '../game/cloudSave';
import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';

const CLOUD_POLL_MS = 15_000;
const DEPLOYMENT_POLL_MS = 30_000;
const UPDATE_DELAY_MS = 3_500;
const UPDATE_SKIP_PREFIX = 'dungeon-veil-update-dismissed-v1:';

type DeploymentMarker = { commit?: string; deployedAt?: string };

export function MainMenuUpdateGate({ language }: { language: 'de' | 'en' }) {
  const de = language === 'de';
  const reloadingRef = useRef(false);
  const [nextCommit, setNextCommit] = useState('');
  const currentCommit = String(import.meta.env.VITE_BUILD_SHA ?? '').trim();

  const safeReload = useCallback(async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    try { await pushCloudSave(); } catch {}
    window.location.reload();
  }, []);

  useEffect(() => {
    let stopped = false;
    let busy = false;
    const pull = async (pushFirst = false) => {
      if (stopped || busy || !currentOnlineSession()) return;
      busy = true;
      try {
        if (pushFirst) await pushCloudSave();
        const restored = await pullCloudSave();
        if (restored && !stopped) await safeReload();
      } catch {}
      finally { busy = false; }
    };
    const sessionEvent = onlineSessionEventName();
    const onSession = () => { void pull(true); };
    const onRestore = () => { if (!stopped) void safeReload(); };
    window.addEventListener(sessionEvent, onSession);
    window.addEventListener('dungeon-veil-cloud-save-restored', onRestore);
    void pull(true);
    const interval = window.setInterval(() => void pull(false), CLOUD_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener(sessionEvent, onSession);
      window.removeEventListener('dungeon-veil-cloud-save-restored', onRestore);
    };
  }, [safeReload]);

  useEffect(() => {
    if (!currentCommit || currentCommit === 'dev') return;
    let stopped = false;
    const check = async () => {
      try {
        const base = String(import.meta.env.BASE_URL ?? '/');
        const response = await fetch(`${base}deployment.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const marker = await response.json() as DeploymentMarker;
        const commit = String(marker.commit ?? '').trim();
        if (!commit || commit === currentCommit) return;
        if (sessionStorage.getItem(`${UPDATE_SKIP_PREFIX}${commit}`) === '1') return;
        if (!stopped) setNextCommit(commit);
      } catch {}
    };
    void check();
    const interval = window.setInterval(() => void check(), DEPLOYMENT_POLL_MS);
    return () => { stopped = true; window.clearInterval(interval); };
  }, [currentCommit]);

  useEffect(() => {
    if (!nextCommit) return;
    const timer = window.setTimeout(() => void safeReload(), UPDATE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [nextCommit, safeReload]);

  if (!nextCommit) return null;
  return <div data-testid="main-menu-update-gate" className="absolute inset-x-3 top-[max(4.1rem,calc(env(safe-area-inset-top)+3.3rem))] z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200/20 bg-[#07120e]/94 px-3 py-2.5 text-white shadow-2xl backdrop-blur-xl">
    <div className="min-w-0 flex-1">
      <div className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-100">{de ? 'NEUE VERSION BEREIT' : 'NEW VERSION READY'}</div>
      <div className="mt-1 text-[6px] uppercase tracking-[.1em] text-white/45">{de ? 'Cloud wird gesichert · Aktualisierung startet automatisch' : 'Cloud is saved · update starts automatically'}</div>
    </div>
    <button type="button" onPointerDown={event => { event.preventDefault(); void safeReload(); }} className="rounded-xl border border-emerald-200/20 bg-emerald-400/12 px-3 py-2 text-[7px] font-black uppercase tracking-[.1em] text-emerald-50">{de ? 'JETZT' : 'NOW'}</button>
    <button type="button" aria-label={de ? 'Später aktualisieren' : 'Update later'} onPointerDown={event => { event.preventDefault(); sessionStorage.setItem(`${UPDATE_SKIP_PREFIX}${nextCommit}`, '1'); setNextCommit(''); }} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-sm text-white/55">×</button>
  </div>;
}
