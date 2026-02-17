import { useState } from 'react';
import { StatsPanelContent, useStatsSummary } from './StatsPanel';
import { ForestryPanelContent } from './ForestryPanel';
import { SilviculturePanelContent } from './SilviculturePanel';
import { CarbonCreditContent } from './CarbonCreditPanel';
import { formatCO2 } from '../utils/calculations';

const TABS = [
  { id: 'tools',    label: 'Tools',    icon: '🛠',  needsTrees: false },
  { id: 'overview', label: 'Overview', icon: '📊', needsTrees: true },
  { id: 'stand',    label: 'Stand',    icon: '🌲', needsTrees: true },
  { id: 'mgmt',     label: 'Mgmt',     icon: '🪓', needsTrees: true },
  { id: 'carbon',   label: 'Carbon',   icon: '🌍', needsTrees: true },
];

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

const SEASONS = [
  { id: 'spring', icon: '🌸', label: 'Spr' },
  { id: 'summer', icon: '☀️', label: 'Sum' },
  { id: 'fall', icon: '🍂', label: 'Fall' },
  { id: 'winter', icon: '❄️', label: 'Win' },
];

export default function AnalyticsDashboard({
  trees,
  speciesMap,
  projectionYear,
  siteIndex,
  prescription,
  onSiteIndexChange,
  onChangePrescription,
  mapCenter,
  projectName,
  activeTool,
  onToolChange,
  showSpacingRings,
  onToggleSpacingRings,
  conflicts,
  rulerLabel,
  boundaryArea,
  areaFillAcres,
  onFinishPolygon,
  polygonPoints,
  lightPreset,
  onLightPresetChange,
  season,
  onSeasonChange,
}) {
  const [activeTab, setActiveTab] = useState('tools');
  const [collapsed, setCollapsed] = useState(false);

  const stats = useStatsSummary(trees, speciesMap, projectionYear, siteIndex, prescription);
  const hasTrees = trees && trees.length > 0;

  const handleTabClick = (tab) => {
    if (tab.needsTrees && !hasTrees) return;
    setActiveTab(tab.id);
  };

  return (
    <div className="
      pointer-events-auto
      sm:absolute sm:left-2.5 sm:top-[60px] sm:z-10
      max-sm:fixed max-sm:inset-x-0 max-sm:bottom-[52px] max-sm:z-20
    ">
      <div className="
        sm:w-[300px]
        max-sm:mx-2 max-sm:mb-2
        bg-[rgba(8,8,8,0.88)] backdrop-blur-2xl
        rounded-2xl border border-white/[0.07]
        shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,0,0,0.3)]
        overflow-hidden
        flex flex-col
        max-sm:max-h-[55vh] sm:max-h-[calc(100dvh-130px)]
        transition-all duration-300
      ">
        {/* ── Drag Handle (mobile) ── */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0" onClick={() => setCollapsed(c => !c)}>
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── Summary Header ── */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-between px-3.5 py-2 sm:py-2.5 hover:bg-white/[0.02] transition-colors shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasTrees ? (
              <>
                <span className="text-emerald-400 font-bold text-[14px] tabular-nums">
                  {trees.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {trees.length === 1 ? 'tree' : 'trees'}
                </span>
                {projectionYear != null && projectionYear > 0 && (
                  <span className="text-[9px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded-md font-medium tabular-nums">
                    yr {projectionYear}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[12px] text-slate-400 font-medium">Dashboard</span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 shrink-0 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* ── Summary KPIs ── */}
        {!collapsed && hasTrees && stats && (
          <div className="grid grid-cols-3 gap-px bg-white/[0.04] border-t border-b border-white/[0.06] shrink-0">
            <KPICell label="CO2/yr" value={formatCO2(stats.co2)} color="text-emerald-400" />
            <KPICell label="Canopy" value={`${stats.canopyArea.toLocaleString()}m²`} color="text-sky-400" />
            <KPICell
              label="Eco value"
              value={stats.ecoServices?.totalAnnualValue > 0
                ? `$${stats.ecoServices.totalAnnualValue >= 1000 ? `${(stats.ecoServices.totalAnnualValue / 1000).toFixed(1)}k` : Math.round(stats.ecoServices.totalAnnualValue)}/yr`
                : '—'}
              color="text-amber-400"
            />
          </div>
        )}

        {/* ── Tab Bar ── */}
        {!collapsed && (
          <div className="flex px-2 pt-2 pb-1 gap-1 shrink-0">
            {TABS.map(tab => {
              const disabled = tab.needsTrees && !hasTrees;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  disabled={disabled}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 max-sm:py-2.5 rounded-lg text-[9px] max-sm:text-[10px] font-medium transition-all
                    ${active
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'
                      : disabled
                        ? 'text-slate-700 cursor-not-allowed opacity-40'
                        : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.03]'
                    }`}
                >
                  <span className={`text-[11px] leading-none ${disabled ? 'grayscale' : ''}`}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Disabled hint ── */}
        {!collapsed && !hasTrees && activeTab === 'tools' && (
          <div className="px-3.5 pb-1 shrink-0">
            <div className="text-[9px] text-slate-600 text-center py-1 px-2 rounded-md bg-white/[0.02]">
              Plant trees to unlock analytics tabs
            </div>
          </div>
        )}

        {/* ── Tab Content ── */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3.5 pb-3 pt-1 min-h-0">
            {activeTab === 'tools' && (
              <ToolsTabContent
                activeTool={activeTool}
                onToolChange={onToolChange}
                showSpacingRings={showSpacingRings}
                onToggleSpacingRings={onToggleSpacingRings}
                conflicts={conflicts}
                rulerLabel={rulerLabel}
                boundaryArea={boundaryArea}
                areaFillAcres={areaFillAcres}
                onFinishPolygon={onFinishPolygon}
                polygonPoints={polygonPoints}
                lightPreset={lightPreset}
                onLightPresetChange={onLightPresetChange}
                season={season}
                onSeasonChange={onSeasonChange}
              />
            )}
            {activeTab === 'overview' && hasTrees && (
              <StatsPanelContent
                trees={trees}
                speciesMap={speciesMap}
                projectionYear={projectionYear}
                siteIndex={siteIndex}
                prescription={prescription}
              />
            )}
            {activeTab === 'stand' && hasTrees && (
              <ForestryPanelContent
                trees={trees}
                speciesMap={speciesMap}
                projectionYear={projectionYear}
                siteIndex={siteIndex}
                prescription={prescription}
                onSiteIndexChange={onSiteIndexChange}
              />
            )}
            {activeTab === 'mgmt' && hasTrees && (
              <SilviculturePanelContent
                trees={trees}
                speciesMap={speciesMap}
                projectionYear={projectionYear}
                siteIndex={siteIndex}
                prescription={prescription}
                onChangePrescription={onChangePrescription}
                mapCenter={mapCenter}
                projectName={projectName}
              />
            )}
            {activeTab === 'carbon' && hasTrees && (
              <CarbonCreditContent
                trees={trees}
                speciesMap={speciesMap}
                prescription={prescription}
                siteIndex={siteIndex}
                mapCenter={mapCenter}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolsTabContent({
  activeTool, onToolChange, showSpacingRings, onToggleSpacingRings,
  conflicts, rulerLabel, boundaryArea, areaFillAcres, onFinishPolygon, polygonPoints,
  lightPreset, onLightPresetChange, season, onSeasonChange,
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1.5">PLANTING MODE</div>
        <div className="grid grid-cols-3 gap-1">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] transition-all
                ${activeTool === tool.id
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'}`}
              title={tool.tip}
            >
              <span className="text-sm leading-none">{tool.icon}</span>
              <span className="font-medium">{tool.label}</span>
            </button>
          ))}
          <button
            onClick={onToggleSpacingRings}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] transition-all
              ${showSpacingRings
                ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20'
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'}`}
          >
            <span className="text-sm leading-none">◎</span>
            <span className="font-medium">Spacing</span>
          </button>
        </div>
      </div>

      {conflicts > 0 && (
        <div className="px-2 py-1.5 text-[10px] text-red-400 bg-red-900/20 rounded-lg">
          ⚠ {conflicts} spacing {conflicts === 1 ? 'conflict' : 'conflicts'}
        </div>
      )}
      {rulerLabel && (
        <div className="px-2 py-1.5 text-[10px] text-sky-300 bg-sky-900/20 rounded-lg font-medium text-center">
          {rulerLabel}
        </div>
      )}
      {boundaryArea && (
        <div className="px-2 py-1.5 text-[10px] text-violet-300 bg-violet-900/20 rounded-lg text-center">
          {boundaryArea}
        </div>
      )}

      {areaFillAcres != null && (
        <div className="px-2 py-1.5 text-[10px] text-emerald-300 bg-emerald-900/20 rounded-lg font-medium text-center">
          {areaFillAcres.toFixed(2)} acres
        </div>
      )}

      {(activeTool === 'area' || activeTool === 'boundary') && polygonPoints > 2 && (
        <button
          onClick={onFinishPolygon}
          className="w-full flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-emerald-950/50 text-emerald-300 text-[11px] font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-900/40 transition-colors"
        >
          ✓ Finish ({polygonPoints} pts)
        </button>
      )}

      {onLightPresetChange && (
        <div className="border-t border-white/[0.06] pt-2.5">
          <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1.5">LIGHTING</div>
          <div className="flex gap-1">
            {LIGHT_PRESETS.map(lp => (
              <button
                key={lp.id}
                onClick={() => onLightPresetChange(lp.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] transition-all
                  ${lightPreset === lp.id
                    ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-400'}`}
              >
                <span className="text-xs leading-none">{lp.icon}</span>
                <span className="font-medium">{lp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {onSeasonChange && (
        <div className="border-t border-white/[0.06] pt-2.5">
          <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1.5">SEASON</div>
          <div className="flex gap-1">
            {SEASONS.map(s => (
              <button
                key={s.id}
                onClick={() => onSeasonChange(s.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] transition-all
                  ${season === s.id
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-400'}`}
              >
                <span className="text-xs leading-none">{s.icon}</span>
                <span className="font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICell({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center py-1.5 px-1 bg-black/20">
      <span className={`text-[11px] font-semibold tabular-nums leading-tight ${color}`}>{value}</span>
      <span className="text-[7px] text-slate-600 font-medium tracking-wider mt-0.5">{label}</span>
    </div>
  );
}
