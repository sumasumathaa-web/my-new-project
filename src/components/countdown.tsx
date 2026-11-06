"use client";

import React from "react";

export function CountdownTimer({ targetIso, accent = "#B08D57" }: { targetIso: string; accent?: string }) {
  const [left, setLeft] = React.useState<{ d: number; h: number; m: number; s: number } | null>(null);

  React.useEffect(() => {
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) return;
    function tick() {
      const diff = Math.max(0, target - Date.now());
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (!left) return null;
  const cells = [
    { v: left.d, l: "days" },
    { v: left.h, l: "hrs" },
    { v: left.m, l: "min" },
    { v: left.s, l: "sec" },
  ];
  return (
    <div className="flex items-center justify-center gap-3" role="timer" aria-label="Countdown to the wedding">
      {cells.map((c) => (
        <div key={c.l} className="flex w-16 flex-col items-center rounded-xl border py-2" style={{ borderColor: accent }}>
          <span className="font-serif text-2xl" style={{ color: accent }}>
            {String(c.v).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-widest opacity-70">{c.l}</span>
        </div>
      ))}
    </div>
  );
}
