import { useState, useEffect } from 'react';

export default function WelcomeHint({ treeCount }) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (treeCount > 0) setDismissed(true);
  }, [treeCount]);

  useEffect(() => {
    if (dismissed) {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-400
        ${dismissed ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        className="glass-panel rounded-2xl px-7 py-6 text-center max-w-[280px] pointer-events-auto"
        onClick={() => setDismissed(true)}
      >
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 pulse-ring" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            🌳
          </div>
        </div>

        <h2 className="text-slate-200 font-semibold text-[15px] mb-1">
          CanopyViz
        </h2>
        <p className="text-slate-500 text-[12px] leading-relaxed mb-3">
          Search for an address, then tap the map to plant trees and see the environmental impact.
        </p>
        <p className="text-slate-700 text-[10px]">
          Tap anywhere to begin
        </p>
      </div>
    </div>
  );
}
