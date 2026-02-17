import { useState } from 'react';

/**
 * Tool modes:
 *  'place'    – Default single-tree placement
 *  'row'      – Click start + end, auto-fill line
 *  'area'     – Draw polygon, fill with trees
 *  'ruler'    – Measure distance between two points
 *  'boundary' – Draw property boundary polygon
 */

const TOOLS = [
  { id: 'place', icon: '🌳', label: 'Plant', tip: 'Tap to place a tree' },
  { id: 'row', icon: '⟟', label: 'Row', tip: 'Tap start and end to plant a row' },
  { id: 'area', icon: '⬡', label: 'Fill', tip: 'Draw a polygon to fill with trees' },
  { id: 'ruler', icon: '📏', label: 'Ruler', tip: 'Tap two points to measure distance' },
  { id: 'boundary', icon: '⬜', label: 'Area', tip: 'Draw property boundary' },
];

const LIGHT_PRESETS = [
  { id: 'day', icon: '☀️', label: 'Day' },
  { id: 'dawn', icon: '🌅', label: 'Dawn' },
  { id: 'dusk', icon: '🌇', label: 'Dusk' },
  { id: 'night', icon: '🌙', label: 'Night' },
];

export default function PlanningTools({
  activeTool,
  onToolChange,
  showSpacingRings,
  onToggleSpacingRings,
  conflicts,
  rulerLabel,
  boundaryArea,
  onFinishPolygon,
  polygonPoints,
  lightPreset,
  onLightPresetChange,
  season,
  onSeasonChange,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute left-2.5 top-[180px] sm:top-[220px] z-10 safe-top flex flex-col items-start gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="glass-panel rounded-xl p-2.5 sm:p-2 flex items-center gap-1.5 transition-all hover:bg-white/[0.08]"
        title="Planning tools"
      >
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
        </svg>
        {!expanded && <span className="text-[10px] text-slate-400 font-medium">Tools</span>}
        <svg
          className={`w-2.5 h-2.5 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="glass-panel rounded-xl p-2 space-y-1 animate-fade-in w-[140px]">
          {/* Tool buttons */}
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-[11px]
                ${activeTool === tool.id
                  ? 'bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'}`}
              title={tool.tip}
            >
              <span className="text-sm w-5 text-center leading-none">{tool.icon}</span>
              <span className="font-medium">{tool.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="h-px bg-white/[0.06] my-1.5" />

          {/* Spacing rings toggle */}
          <button
            onClick={onToggleSpacingRings}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-[11px]
              ${showSpacingRings
                ? 'bg-sky-950/40 text-sky-300 ring-1 ring-sky-500/20'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'}`}
          >
            <span className="text-sm w-5 text-center leading-none">◎</span>
            <span className="font-medium">Spacing</span>
          </button>

          {/* Light preset cycle */}
          {onLightPresetChange && (
            <>
              <div className="h-px bg-white/[0.06] my-1.5" />
              <div className="px-1">
                <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1 px-1">LIGHTING</div>
                <div className="flex gap-0.5">
                  {LIGHT_PRESETS.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => onLightPresetChange(lp.id)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-md text-[9px] transition-all
                        ${lightPreset === lp.id
                          ? 'bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/20'
                          : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-400'}`}
                      title={lp.label}
                    >
                      <span className="text-xs leading-none">{lp.icon}</span>
                      <span className="font-medium leading-none">{lp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Season toggle */}
          {onSeasonChange && (
            <>
              <div className="h-px bg-white/[0.06] my-1.5" />
              <div className="px-1">
                <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1 px-1">SEASON</div>
                <div className="flex gap-0.5">
                  {[
                    { id: 'spring', icon: '🌸', label: 'Spr' },
                    { id: 'summer', icon: '☀️', label: 'Sum' },
                    { id: 'fall', icon: '🍂', label: 'Fall' },
                    { id: 'winter', icon: '❄️', label: 'Win' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSeasonChange(s.id)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-md text-[9px] transition-all
                        ${season === s.id
                          ? 'bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500/20'
                          : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-400'}`}
                      title={s.label}
                    >
                      <span className="text-xs leading-none">{s.icon}</span>
                      <span className="font-medium leading-none">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Context info */}
          {conflicts > 0 && (
            <div className="px-2 py-1 text-[9px] text-red-400 bg-red-900/20 rounded-lg">
              ⚠ {conflicts} spacing {conflicts === 1 ? 'conflict' : 'conflicts'}
            </div>
          )}

          {rulerLabel && (
            <div className="px-2 py-1 text-[10px] text-sky-300 bg-sky-900/20 rounded-lg font-medium text-center">
              {rulerLabel}
            </div>
          )}

          {boundaryArea && (
            <div className="px-2 py-1 text-[9px] text-violet-300 bg-violet-900/20 rounded-lg text-center">
              {boundaryArea}
            </div>
          )}

          {/* Finish polygon button */}
          {(activeTool === 'area' || activeTool === 'boundary') && polygonPoints > 2 && (
            <button
              onClick={onFinishPolygon}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-300 text-[10px] font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-900/40 transition-colors"
            >
              ✓ Finish ({polygonPoints} pts)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
