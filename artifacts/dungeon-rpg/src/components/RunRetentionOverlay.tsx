import React, { useEffect, useState } from 'react';

type ToastDetail = {
  title: string;
  text: string;
  tone: 'hunt' | 'daily' | 'relic';
};

export function RunRetentionOverlay() {
  const [toast, setToast] = useState<ToastDetail | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer = 0;
    const showToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail) return;
      window.clearTimeout(hideTimer);
      setToast(detail);
      setVisible(true);
      hideTimer = window.setTimeout(() => setVisible(false), 3200);
    };
    window.addEventListener('dungeon-veil-retention-toast', showToast as EventListener);
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener('dungeon-veil-retention-toast', showToast as EventListener);
    };
  }, []);

  const toastClass = toast?.tone === 'hunt'
    ? 'border-amber-300/35 bg-[linear-gradient(120deg,rgba(79,49,15,.96),rgba(14,10,7,.97))] text-amber-100'
    : toast?.tone === 'relic'
      ? 'border-violet-300/35 bg-[linear-gradient(120deg,rgba(54,28,86,.96),rgba(10,7,15,.97))] text-violet-100'
      : 'border-cyan-300/25 bg-[linear-gradient(120deg,rgba(18,53,65,.96),rgba(8,10,13,.97))] text-cyan-100';

  if (!toast) return null;

  return (
    <div className={`pointer-events-none fixed left-1/2 top-[max(10.5rem,calc(env(safe-area-inset-top)+9.4rem))] z-[72] w-[min(88vw,370px)] -translate-x-1/2 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
      <div className={`overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,.58)] backdrop-blur-xl ${toastClass}`}>
        <div className="text-[8px] font-black uppercase tracking-[.26em] opacity-55">{toast.title}</div>
        <div className="mt-1.5 text-[13px] font-black leading-snug text-white/90">{toast.text}</div>
      </div>
    </div>
  );
}
