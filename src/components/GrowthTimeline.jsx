import { useMemo } from 'react';
import { calculateCarbonOverTime } from '../utils/calculations';
import { projectStand } from '../models/forestryModel';
import InfoTooltip from './InfoTooltip';

const YEAR_MARKS = [0, 10, 20, 30, 40, 50, 60, 70, 80];

export default function GrowthTimeline({ projectionYear, onChangeYear, trees, speciesMap, siteIndex, prescription }) {
  // Build carbon timeline once (expensive: 8 projectStand calls). Only recompute
  // when the tree set or site conditions change, NOT on every slider tick.
  const carbonTimeline = useMemo(() => {
    if (trees.length === 0) return null;
    return calculateCarbonOverTime(trees, speciesMap, siteIndex, prescription);
  }, [trees, speciesMap, siteIndex, prescription]);

  // Cheap interpolation against the cached timeline on every slider tick.
  const carbonAtYear = useMemo(() => {
    if (!carbonTimeline) return null;
    if (projectionYear <= 0) return { annual: 0, cumulative: 0 };
    for (let i = 0; i < carbonTimeline.length; i++) {
      if (projectionYear <= carbonTimeline[i].year) {
        if (i === 0) {
          const frac = projectionYear / carbonTimeline[0].year;
          return {
            annual: Math.round(carbonTimeline[0].annual * frac),
            cumulative: Math.round(carbonTimeline[0].cumulative * frac),
          };
        }
        const prev = carbonTimeline[i - 1];
        const curr = carbonTimeline[i];
        const frac = (projectionYear - prev.year) / (curr.year - prev.year);
        return {
          annual: Math.round(prev.annual + (curr.annual - prev.annual) * frac),
          cumulative: Math.round(prev.cumulative + (curr.cumulative - prev.cumulative) * frac),
        };
      }
    }
    return carbonTimeline[carbonTimeline.length - 1];
  }, [carbonTimeline, projectionYear]);

  // Forestry model metrics at current year
  const standInfo = useMemo(() => {
    if (trees.length === 0 || projectionYear <= 0) return null;
    try {
      const result = projectStand(trees, speciesMap, projectionYear, siteIndex || 1.0, null, prescription);
      const aliveTrees = result.trees.filter(t => t.alive && !t.harvested);
      const avgDbh = aliveTrees.length > 0
        ? aliveTrees.reduce((s, t) => s + t.dbhInches, 0) / aliveTrees.length
        : 0;
      return {
        avgDbh: Math.round(avgDbh * 10) / 10,
        relDensity: result.stand.relDensity,
        aliveTrees: result.stand.aliveTrees,
        deadTrees: result.stand.deadTrees,
        harvestedTrees: result.stand.harvestedTrees || 0,
        mortalityEvents: result.mortalityEvents,
        harvestEvents: result.harvestEvents,
      };
    } catch {
      return null;
    }
  }, [trees, speciesMap, projectionYear, siteIndex, prescription]);

  if (trees.length === 0) return null;

  // Density indicator dot color
  const densityColor = !standInfo ? 'bg-slate-600'
    : standInfo.relDensity < 0.35 ? 'bg-emerald-400'
    : standInfo.relDensity < 0.55 ? 'bg-emerald-400'
    : standInfo.relDensity < 0.80 ? 'bg-yellow-400'
    : 'bg-red-400';

  // Events at this year
  const mortalityAtYear = standInfo?.mortalityEvents?.filter(e => e.year === projectionYear) || [];
  const harvestAtYear = standInfo?.harvestEvents?.filter(e => e.year === projectionYear) || [];

  return (
    <div className="absolute left-2 right-2 sm:left-4 sm:right-4 bottom-[120px] sm:bottom-[145px] z-10">
      <div className="glass-panel rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-slate-300 flex items-center gap-1">
              Growth
              <InfoTooltip topic="growthRate" />
            </span>
            {standInfo && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${densityColor}`}
                title={`Rel. density: ${(standInfo.relDensity * 100).toFixed(0)}%`}
              />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">Year {projectionYear}</span>
            {standInfo && standInfo.avgDbh > 0 && (
              <span className="text-[9px] text-slate-600 tabular-nums">{standInfo.avgDbh}" avg DBH</span>
            )}
          </div>
        </div>

        <div className="relative mb-2">
          {/* Harvest action markers on the slider track */}
          {prescription?.actions?.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none z-10">
              {prescription.actions.map((action, i) => (
                <div
                  key={i}
                  className="absolute top-[-2px] w-[3px] h-[10px] rounded-sm"
                  style={{
                    left: `${(action.year / 80) * 100}%`,
                    backgroundColor: action.type === 'clearcut' || action.type === 'shelterwood-removal'
                      ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.6)',
                  }}
                  title={`yr ${action.year}: ${action.label}`}
                />
              ))}
            </div>
          )}
          <input
            type="range"
            min={0}
            max={80}
            step={1}
            value={projectionYear}
            onChange={(e) => onChangeYear(Number(e.target.value))}
            className="w-full h-2 appearance-none cursor-pointer rounded-full bg-white/[0.06] relative z-20 touch-none
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-400/20
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-300
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-emerald-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-300
              sm:[&::-webkit-slider-thumb]:w-4 sm:[&::-webkit-slider-thumb]:h-4
              sm:[&::-moz-range-thumb]:w-4 sm:[&::-moz-range-thumb]:h-4"
            style={{
              background: `linear-gradient(to right, rgba(52,211,153,0.4) 0%, rgba(52,211,153,0.4) ${(projectionYear / 80) * 100}%, rgba(255,255,255,0.06) ${(projectionYear / 80) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1 px-0.5">
            {YEAR_MARKS.map((yr) => (
              <button
                key={yr}
                onClick={() => onChangeYear(yr)}
                className={`text-[8px] tabular-nums transition-colors
                  ${projectionYear === yr ? 'text-emerald-400 font-semibold' : 'text-slate-700 hover:text-slate-500'}`}
              >
                {yr === 0 ? 'Now' : `${yr}y`}
              </button>
            ))}
          </div>
        </div>

        {carbonAtYear && projectionYear > 0 && (
          <div className="flex gap-4 justify-center text-center pt-2 border-t border-white/[0.06]">
            <div>
              <div className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                {carbonAtYear.cumulative >= 1000 ? `${(carbonAtYear.cumulative / 1000).toFixed(1)}t` : `${carbonAtYear.cumulative}kg`}
              </div>
              <div className="text-[9px] text-slate-600">CO2 stored</div>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-300 tabular-nums">
                {carbonAtYear.annual} kg/yr
              </div>
              <div className="text-[9px] text-slate-600">absorbing</div>
            </div>
            {standInfo && standInfo.avgDbh > 0 && (
              <div>
                <div className="text-[12px] font-semibold text-amber-400 tabular-nums">{standInfo.avgDbh}"</div>
                <div className="text-[9px] text-slate-600">avg DBH</div>
              </div>
            )}
            {standInfo && standInfo.deadTrees > 0 && (
              <div>
                <div className="text-[12px] font-semibold text-red-400 tabular-nums">{standInfo.deadTrees}</div>
                <div className="text-[9px] text-slate-600">died</div>
              </div>
            )}
            {standInfo && standInfo.harvestedTrees > 0 && (
              <div>
                <div className="text-[12px] font-semibold text-amber-400 tabular-nums">{standInfo.harvestedTrees}</div>
                <div className="text-[9px] text-slate-600">harvested</div>
              </div>
            )}
          </div>
        )}

        {/* Harvest event notification */}
        {harvestAtYear.length > 0 && (
          <div className="text-center text-[9px] text-emerald-400/80 mt-1">
            {harvestAtYear.map((h, i) => (
              <span key={i}>
                {h.label}: {h.treesRemoved} trees removed
                {h.volumeBF > 0 && ` (${h.volumeBF >= 1000 ? `${(h.volumeBF / 1000).toFixed(1)} MBF` : `${h.volumeBF} BF`})`}
              </span>
            ))}
          </div>
        )}

        {/* Mortality event notification */}
        {mortalityAtYear.length > 0 && (
          <div className="text-center text-[9px] text-red-400/80 mt-1">
            {mortalityAtYear.length} tree{mortalityAtYear.length > 1 ? 's' : ''} lost to competition this year
          </div>
        )}

        {projectionYear === 0 && (
          <div className="text-center text-[10px] text-slate-600 pt-2 border-t border-white/[0.06]">
            Newly planted saplings. Drag to project growth.
          </div>
        )}
      </div>
    </div>
  );
}
