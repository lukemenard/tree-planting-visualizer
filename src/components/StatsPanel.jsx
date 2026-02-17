import { useMemo } from 'react';
import { getSpeciesById } from '../data/treeSpecies';
import {
  calculateCanopyArea,
  calculateCO2,
  calculateTempReduction,
  formatCO2,
  calculateCarbonOverTime,
  calculateEcosystemValue,
} from '../utils/calculations';
import InfoTooltip from './InfoTooltip';

function useStats(trees, speciesMap, projectionYear, siteIndex, prescription) {
  return useMemo(() => {
    if (!trees || trees.length === 0) return null;
    const canopyArea = calculateCanopyArea(trees, speciesMap, projectionYear, siteIndex);
    const co2 = calculateCO2(trees, speciesMap, projectionYear, siteIndex);
    const tempReduction = calculateTempReduction(trees, speciesMap, projectionYear, siteIndex);
    const carbonTimeline = calculateCarbonOverTime(trees, speciesMap, siteIndex, prescription);

    const speciesCount = {};
    trees.forEach((t) => {
      speciesCount[t.speciesId] = (speciesCount[t.speciesId] || 0) + 1;
    });
    const topSpecies = Object.entries(speciesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const sp = speciesMap?.[id] || getSpeciesById(id);
        return { name: sp?.name || id, count, emoji: sp?.emoji || '🌳' };
      });

    const ecoServices = calculateEcosystemValue(trees, speciesMap, projectionYear || 0, siteIndex);

    return {
      treeCount: trees.length,
      canopyArea: Math.round(canopyArea),
      co2,
      tempReduction,
      carbonTimeline,
      topSpecies,
      ecoServices,
    };
  }, [trees, speciesMap, projectionYear, siteIndex, prescription]);
}

/**
 * Standalone content for the Overview tab inside the unified dashboard.
 */
export function StatsPanelContent({ trees, speciesMap, projectionYear, siteIndex, prescription }) {
  const stats = useStats(trees, speciesMap, projectionYear, siteIndex, prescription);
  if (!stats || stats.treeCount === 0) return null;
  const eco = stats.ecoServices;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <StatRow label="CO2 absorbed/yr" value={formatCO2(stats.co2)} color="text-emerald-400" tooltip="co2Absorption" />
        <StatRow label="Canopy shade" value={`${stats.canopyArea.toLocaleString()} m\u00B2`} color="text-sky-400" tooltip="canopyCoverage" />
        <StatRow label="Cooling effect" value={`-${stats.tempReduction.toFixed(1)}\u00B0C`} color="text-violet-400" tooltip="cooling" />
      </div>

      {/* Carbon timeline */}
      {stats.carbonTimeline && (
        <div className="border-t border-white/[0.06] pt-2.5">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider mb-2">
            CO2 STORED
          </div>
          <div className="space-y-1.5">
            {stats.carbonTimeline.map((point) => (
              <div key={point.year} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 w-7 tabular-nums">{point.year}y</span>
                <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (point.cumulative / (stats.carbonTimeline[stats.carbonTimeline.length - 1]?.cumulative || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-emerald-400/80 font-medium tabular-nums w-11 text-right">
                  {point.cumulative >= 1000 ? `${(point.cumulative / 1000).toFixed(1)}t` : `${Math.round(point.cumulative)}kg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ecosystem Services Value */}
      {eco && eco.totalAnnualValue > 0 && (
        <div className="border-t border-white/[0.06] pt-2.5">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider mb-2">
            ECOSYSTEM VALUE (annual)
          </div>
          <div className="space-y-1.5">
            <EcoRow label="Stormwater" value={eco.stormwater.annualValue} detail={`${eco.stormwater.gallonsIntercepted.toLocaleString()} gal`} />
            <EcoRow label="Energy savings" value={eco.energy.annualValue} detail={`${eco.energy.coolingKwh.toFixed(0)} kWh`} />
            <EcoRow label="Air quality" value={eco.airQuality.annualValue} />
            <EcoRow label="Carbon value" value={eco.carbon.annualValue} detail={`${eco.carbon.annualCo2Lbs.toFixed(0)} lbs CO₂`} />
            <EcoRow label="Property uplift" value={eco.property.annualValue} />
            <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.04]">
              <span className="text-[10px] text-slate-400 font-medium">Total</span>
              <span className="text-[12px] text-emerald-400 font-bold tabular-nums">
                ${eco.totalAnnualValue >= 1000
                  ? `${(eco.totalAnnualValue / 1000).toFixed(1)}k`
                  : eco.totalAnnualValue.toFixed(0)}/yr
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top species */}
      {stats.topSpecies.length > 1 && (
        <div className="border-t border-white/[0.06] pt-2.5">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider mb-1.5">TOP SPECIES</div>
          {stats.topSpecies.map((sp) => (
            <div key={sp.name} className="flex items-center gap-1.5 py-0.5">
              <span className="text-[11px] leading-none">{sp.emoji}</span>
              <span className="text-[10px] text-slate-400 flex-1 truncate">{sp.name}</span>
              <span className="text-[10px] text-slate-600 tabular-nums">{sp.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Returns summary KPIs for the dashboard header.
 */
export function useStatsSummary(trees, speciesMap, projectionYear, siteIndex, prescription) {
  return useStats(trees, speciesMap, projectionYear, siteIndex, prescription);
}

/**
 * Legacy standalone panel (kept for backwards compatibility).
 */
export default function StatsPanel({ trees, expanded, onToggle, speciesMap, projectionYear, siteIndex, prescription }) {
  const stats = useStats(trees, speciesMap, projectionYear, siteIndex, prescription);
  if (!stats || stats.treeCount === 0) return null;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="glass-panel rounded-xl overflow-hidden transition-all duration-300 text-left w-[200px] cursor-pointer"
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold text-[13px] tabular-nums">
              {stats.treeCount} {stats.treeCount === 1 ? 'tree' : 'trees'}
            </span>
            <svg
              className={`w-3 h-3 text-slate-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {expanded && (
            <div className="mt-3">
              <StatsPanelContent trees={trees} speciesMap={speciesMap} projectionYear={projectionYear} siteIndex={siteIndex} prescription={prescription} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color, tooltip }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-500">{label}</span>
        {tooltip && <span onClick={(e) => e.stopPropagation()}><InfoTooltip topic={tooltip} /></span>}
      </div>
      <span className={`stat-value text-[12px] font-semibold ${color} tabular-nums`}>{value}</span>
    </div>
  );
}

function EcoRow({ label, value, detail }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-[9px] text-slate-500 truncate">{label}</span>
        {detail && <span className="text-[7px] text-slate-700 truncate">({detail})</span>}
      </div>
      <span className="text-[10px] text-emerald-400/80 font-medium tabular-nums whitespace-nowrap">
        ${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)}
      </span>
    </div>
  );
}
