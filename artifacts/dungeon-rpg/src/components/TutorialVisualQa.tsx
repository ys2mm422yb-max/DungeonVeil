import React from 'react';
import type { GameEngine } from '../game/runEngine';
import { TutorialOverlay } from './TutorialOverlay';

const fakeEngine = {
  state: {
    player: {
      x: 180,
      y: 520,
      lastDodgeTime: 0,
      invincibleUntil: 0,
    },
  },
} as unknown as GameEngine;

export function TutorialVisualQa() {
  return <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#263128,#0b0d0e_55%,#050506)] text-white">
    <div className="absolute inset-x-3 top-[max(1rem,env(safe-area-inset-top))] rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.15em] text-white/55"><span>Kapitel 1 · Raum 1</span><span>0 / 4</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/70"><div className="h-full w-[84%] bg-gradient-to-r from-red-600 to-red-300" /></div>
    </div>
    <div className="absolute left-1/2 top-[47%] h-12 w-12 -translate-x-1/2 rounded-full border border-emerald-200/30 bg-emerald-400/15 shadow-[0_0_30px_rgba(80,210,150,.18)]" />
    <div className="absolute bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] left-6 h-24 w-24 rounded-full border border-white/15 bg-black/35"><div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/10" /></div>
    <div className="absolute bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-7 grid h-20 w-20 place-items-center rounded-full border border-cyan-300/24 bg-cyan-400/10 text-[9px] font-black uppercase tracking-[.12em] text-cyan-100">Dash</div>
    <TutorialOverlay getEngine={() => fakeEngine} language="de" />
  </div>;
}
