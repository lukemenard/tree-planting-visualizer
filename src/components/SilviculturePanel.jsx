import { useState, useMemo } from 'react';
import { PRESCRIPTIONS } from '../data/silviculturalPrescriptions';
import { projectStand } from '../models/forestryModel';
import {
  enrichHarvestEvent,
  analyzeInvestment,
  treeHarvestValue,
} from '../models/forestFinance';
import { generateFvsKeywordFile, downloadFvsKeywordFile } from '../services/fvsExport';

function useHarvestData(trees, speciesMap, projectionYear, siteIndex, prescription) {
  const projection = useMemo(() => {
    if (!trees || trees.length === 0 || !prescription) return null;
    return projectStand(trees, speciesMap, projectionYear || 0, siteIndex || 1.0, null, prescription);
  }, [trees, speciesMap, projectionYear, siteIndex, prescription]);

  const harvestEvents = projection?.harvestEvents || [];
  const stand = projection?.stand;

  const enrichedEvents = useMemo(() => {
    return harvestEvents.map(ev => {
      if (!ev.treeDetails || ev.treeDetails.length === 0) return { ...ev, revenue: 0, productBreakdown: {}, productCounts: {} };
      return enrichHarvestEvent(ev, ev.treeDetails);
    });
  }, [harvestEvents]);

  const standingValue = useMemo(() => {
    if (!projection?.trees) return { revenue: 0, breakdown: {} };
    const aliveTrees = projection.trees.filter(t => t.alive && !t.harvested);
    let total = 0;
    const breakdown = { veneer: 0, sawtimber: 0, poletimber: 0, pulpwood: 0 };
    for (const t of aliveTrees) {
      const groupCode = getGroupCode(t, trees, speciesMap);
      const val = treeHarvestValue(t.dbhInches, t.heightFt, t.agBiomassLbs, groupCode, t.volumeBF);
      total += val.revenue;
      if (val.productClass in breakdown) breakdown[val.productClass] += val.revenue;
    }
    return { revenue: Math.round(total * 100) / 100, breakdown };
  }, [projection, trees, speciesMap]);

  return { projection, stand, enrichedEvents, standingValue };
}

const CATEGORIES = [
  { id: 'passive', label: 'Passive' },
  { id: 'even-aged', label: 'Even-aged' },
  { id: 'uneven-aged', label: 'Uneven-aged' },
  { id: 'special', label: 'Special Purpose' },
];

/**
 * Standalone content for the Management tab inside the unified dashboard.
 */
export function SilviculturePanelContent({
  trees, speciesMap, projectionYear, siteIndex, prescription,
  onChangePrescription, mapCenter, projectName,
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [discountRate, setDiscountRate] = useState(0.04);

  const { stand, enrichedEvents, standingValue } = useHarvestData(trees, speciesMap, projectionYear, siteIndex, prescription);

  const finance = useMemo(() => {
    if (!stand || enrichedEvents.length === 0) return null;
    const rotationLength = prescription?.actions?.length > 0
      ? Math.max(...prescription.actions.map(a => a.year), projectionYear || 0)
      : projectionYear || 60;
    return analyzeInvestment(enrichedEvents, stand.areaAcres, rotationLength, {}, discountRate);
  }, [enrichedEvents, stand, prescription, projectionYear, discountRate]);

  const totalHarvestRevenue = enrichedEvents.reduce((s, e) => s + (e.revenue || 0), 0);
  const currentYear = projectionYear || 0;

  if (trees.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Prescription Selector */}
      {CATEGORIES.map(cat => {
        const items = PRESCRIPTIONS.filter(p => p.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id}>
            <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1">{cat.label.toUpperCase()}</div>
            <div className="space-y-0.5">
              {items.map(rx => {
                const isActive = prescription?.id === rx.id;
                return (
                  <button key={rx.id} onClick={() => onChangePrescription(rx)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] transition-all duration-150
                      ${isActive ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{rx.icon}</span>
                      <span className="font-medium">{rx.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Description */}
      {prescription && (
        <div className="text-[9px] text-slate-500 leading-relaxed border-t border-white/[0.06] pt-2">
          {prescription.description}
        </div>
      )}

      {/* Management Schedule Timeline */}
      {prescription?.actions?.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <button onClick={() => setShowSchedule(v => !v)} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors mb-1">
            {showSchedule ? 'Hide' : 'Show'} Schedule ({prescription.actions.length} actions)
          </button>
          {showSchedule && (
            <div className="relative ml-2 mt-1">
              <div className="absolute left-[3px] top-1 bottom-1 w-px bg-white/[0.08]" />
              {prescription.actions.map((action, i) => {
                const isPast = action.year <= currentYear;
                const matchingHarvest = enrichedEvents.find(e => e.year === action.year);
                return (
                  <div key={i} className="flex items-start gap-2 mb-2 relative">
                    <div className={`w-[7px] h-[7px] rounded-full mt-0.5 shrink-0 z-10 ${isPast ? 'bg-emerald-400' : 'bg-white/10 ring-1 ring-white/20'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[10px] font-semibold tabular-nums ${isPast ? 'text-emerald-400' : 'text-slate-500'}`}>yr {action.year}</span>
                        <span className={`text-[9px] truncate ${isPast ? 'text-slate-300' : 'text-slate-600'}`}>{action.label}</span>
                      </div>
                      {isPast && matchingHarvest && matchingHarvest.treesRemoved > 0 && (
                        <div className="text-[8px] text-amber-400/70 mt-0.5 space-y-0.5">
                          <div>{matchingHarvest.treesRemoved} trees{matchingHarvest.volumeBF > 0 && ` · ${fmtVol(matchingHarvest.volumeBF)}`}</div>
                          {matchingHarvest.revenue > 0 && <div className="text-emerald-400/80 font-medium">{fmtDollar(matchingHarvest.revenue)} revenue</div>}
                          {matchingHarvest.productBreakdown && (
                            <div className="text-[7px] text-slate-600 leading-tight">
                              {Object.entries(matchingHarvest.productBreakdown).filter(([, v]) => v > 0).map(([product, revenue]) => (
                                <span key={product} className="mr-1.5">{product}: {fmtDollar(revenue)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Harvest & Financial Summary */}
      {(enrichedEvents.length > 0 || standingValue.revenue > 0) && (
        <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider">TIMBER REVENUE</div>
          {enrichedEvents.length > 0 && (
            <>
              <HarvestRow label="Trees Harvested" value={stand?.harvestedTrees || 0} />
              <HarvestRow label="Harvest Revenue" value={fmtDollar(totalHarvestRevenue)} />
            </>
          )}
          <HarvestRow label="Standing Value" value={fmtDollar(standingValue.revenue)} />
          <div className="h-px bg-white/[0.04]" />
          <HarvestRow label="Total Timber Value" value={fmtDollar(totalHarvestRevenue + standingValue.revenue)} highlight />
        </div>
      )}

      {/* Investment Analysis */}
      {finance && (
        <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
          <button onClick={() => setShowFinance(v => !v)} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
            {showFinance ? 'Hide' : 'Show'} Investment Analysis
          </button>
          {showFinance && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600">Discount rate:</span>
                <div className="flex gap-1">
                  {[0.02, 0.04, 0.06, 0.08].map(r => (
                    <button key={r} onClick={() => setDiscountRate(r)}
                      className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${discountRate === r ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
                      {(r * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[8px] text-slate-600 font-semibold tracking-wider mt-1">COSTS</div>
              <HarvestRow label="Establishment" value={fmtDollar(finance.establishmentCost)} negative />
              <HarvestRow label={`Annual (${finance.rotationLength} yr)`} value={fmtDollar(finance.annualCostPerAcre * finance.areaAcres * finance.rotationLength)} negative />
              <HarvestRow label="Total Costs" value={fmtDollar(finance.totalCosts)} negative />
              <div className="h-px bg-white/[0.04]" />
              <div className="text-[8px] text-slate-600 font-semibold tracking-wider">RETURNS</div>
              <HarvestRow label="Net Income" value={fmtDollar(finance.netIncome)} highlight={finance.netIncome > 0} negative={finance.netIncome < 0} />
              <HarvestRow label={`NPV (${(discountRate * 100).toFixed(0)}%)`} value={fmtDollar(finance.npv)} highlight={finance.npv > 0} negative={finance.npv < 0} />
              <HarvestRow label="NPV/acre" value={fmtDollar(finance.npvPerAcre)} highlight={finance.npvPerAcre > 0} negative={finance.npvPerAcre < 0} />
              <HarvestRow label="LEV/acre" value={fmtDollar(finance.levPerAcre)} highlight={finance.levPerAcre > 0} negative={finance.levPerAcre < 0} />
              {finance.irrPercent !== null && <HarvestRow label="IRR" value={`${finance.irrPercent.toFixed(1)}%`} highlight={finance.irrPercent > 0} />}
              <div className="text-[7px] text-slate-700 leading-tight mt-1 space-y-0.5">
                <div><strong className="text-slate-600">NPV</strong> = Net Present Value: today&apos;s dollar value of all future revenues minus costs</div>
                <div><strong className="text-slate-600">LEV</strong> = Land Expectation Value (Faustmann): value of the land for perpetual forestry rotations</div>
                <div><strong className="text-slate-600">IRR</strong> = Internal Rate of Return: the discount rate at which NPV = 0</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FVS Export */}
      <div className="border-t border-white/[0.06] pt-2">
        <button
          onClick={() => {
            const content = generateFvsKeywordFile({
              trees, speciesMap, prescription, siteIndex,
              projectName: projectName || 'Stand Export',
              lat: mapCenter?.[1] || 40, lng: mapCenter?.[0] || -75, projectionYears: 80,
            });
            downloadFvsKeywordFile(content, `${(projectName || 'stand').replace(/\s+/g, '_')}.key`);
          }}
          className="w-full text-[10px] text-center py-1.5 px-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all ring-1 ring-blue-500/20"
        >
          Export FVS Keyword File (.key)
        </button>
        <div className="text-[7px] text-slate-700 leading-tight mt-1">Run through USDA FVS Suppose for validated projections.</div>
      </div>

      {/* Methodology note */}
      <div className="text-[7px] text-slate-700 leading-tight border-t border-white/[0.06] pt-2">
        Revenue uses species-group stumpage prices (national avg). Investment analysis includes establishment, annual carrying costs, and cruising. All financial figures are planning-grade estimates.
      </div>

      {(!prescription || prescription.id === 'no-management') && (
        <div className="text-[9px] text-slate-600 italic border-t border-white/[0.06] pt-2">
          No active management — stand develops naturally with only background mortality.
        </div>
      )}
    </div>
  );
}

/**
 * Legacy standalone panel (kept for backwards compatibility).
 */
export default function SilviculturePanel({
  trees, speciesMap, projectionYear, siteIndex, prescription,
  onChangePrescription, expanded, onToggle, mapCenter, projectName,
}) {
  if (trees.length === 0) return null;

  return (
    <div>
      <div role="button" tabIndex={0} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="glass-panel rounded-xl overflow-hidden transition-all duration-300 text-left w-[220px] cursor-pointer">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold text-[13px]">Silviculture</span>
              {prescription && prescription.id !== 'no-management' && (
                <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-emerald-900/30 text-emerald-400 truncate max-w-[90px]">
                  {prescription.icon} {prescription.name}
                </span>
              )}
            </div>
            <svg className={`w-3 h-3 text-slate-600 transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {expanded && (
            <div className="mt-3" onClick={e => e.stopPropagation()}>
              <SilviculturePanelContent trees={trees} speciesMap={speciesMap} projectionYear={projectionYear} siteIndex={siteIndex} prescription={prescription} onChangePrescription={onChangePrescription} mapCenter={mapCenter} projectName={projectName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGroupCode(projectedTree, originalTrees, speciesMap) {
  const orig = originalTrees.find(t => t.id === projectedTree.id);
  const speciesId = orig?.speciesId || projectedTree.speciesId;
  const getSpecies = (id) => speciesMap instanceof Map ? speciesMap.get(id) : speciesMap?.[id];
  return getSpecies(speciesId)?.speciesGroup || 'default';
}

function fmtDollar(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtVol(bf) {
  return bf >= 1000 ? `${(bf / 1000).toFixed(1)} MBF` : `${bf} BF`;
}

function HarvestRow({ label, value, highlight = false, negative = false }) {
  let color = 'text-amber-400/90';
  if (highlight) color = 'text-emerald-400';
  if (negative) color = 'text-red-400/80';
  if (highlight && typeof value === 'string' && value.startsWith('-')) color = 'text-red-400/80';
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-[11px] font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
