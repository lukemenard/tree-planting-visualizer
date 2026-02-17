import { useMemo, useState } from 'react';
import { projectStand } from '../models/forestryModel';
import { treeHarvestValue } from '../models/forestFinance';
import ValidationPanel from './ValidationPanel';

function useProjection(trees, speciesMap, projectionYear, siteIndex, prescription) {
  return useMemo(() => {
    if (!trees || trees.length === 0) return null;
    return projectStand(trees, speciesMap, projectionYear || 0, siteIndex || 1.0, null, prescription);
  }, [trees, speciesMap, projectionYear, siteIndex, prescription]);
}

/**
 * Standalone content for the Stand tab inside the unified dashboard.
 */
export function ForestryPanelContent({
  trees, speciesMap, projectionYear, siteIndex, prescription, onSiteIndexChange,
}) {
  const [showTable, setShowTable] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [sortCol, setSortCol] = useState('dbhInches');
  const [sortDir, setSortDir] = useState('desc');

  const projection = useProjection(trees, speciesMap, projectionYear, siteIndex, prescription);
  if (!projection || trees.length === 0) return null;

  const { stand, mortalityEvents } = projection;
  const aliveTrees = projection.trees.filter(t => t.alive && !t.harvested);
  const deadTrees = projection.trees.filter(t => !t.alive && !t.harvested);

  const stockingPct = Math.min(1, stand.relDensity);
  const stockingColor = stockingPct < 0.25 ? '#94a3b8'
    : stockingPct < 0.35 ? '#38bdf8'
    : stockingPct < 0.55 ? '#34d399'
    : stockingPct < 0.80 ? '#fbbf24'
    : '#f87171';

  const standingTimberValue = useMemo(() => {
    if (!projection?.trees) return 0;
    const getSpecies = (id) => speciesMap instanceof Map ? speciesMap.get(id) : speciesMap?.[id];
    let total = 0;
    for (const t of aliveTrees) {
      const orig = trees.find(o => o.id === t.id);
      const sp = getSpecies(orig?.speciesId || t.speciesId);
      const groupCode = sp?.speciesGroup || 'default';
      const val = treeHarvestValue(t.dbhInches, t.heightFt, t.agBiomassLbs, groupCode, t.volumeBF);
      total += val.revenue;
    }
    return Math.round(total);
  }, [projection, aliveTrees, trees, speciesMap]);
  const totalMBF = stand.totalVolumeBF / 1000;

  const sortedTrees = useMemo(() => {
    return [...aliveTrees].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [aliveTrees, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="text-[8px] ml-0.5 opacity-50">
      {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </span>
  );

  return (
    <div className="space-y-2.5">
      {/* Context badge */}
      {stand.contextLabel && (
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded
            ${stand.contextLabel === 'urban' ? 'bg-blue-900/30 text-blue-400'
              : stand.contextLabel === 'suburban' ? 'bg-slate-800/40 text-slate-400'
              : 'bg-emerald-900/30 text-emerald-400'}`}>
            {stand.contextLabel}
          </span>
          <span className="text-[9px] text-slate-600">
            {stand.aliveTrees} alive{stand.deadTrees > 0 ? `, ${stand.deadTrees} dead` : ''}{stand.harvestedTrees > 0 ? `, ${stand.harvestedTrees} harvested` : ''}
          </span>
        </div>
      )}

      {/* Site Index Control */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-slate-500 whitespace-nowrap">Site Index</span>
        <input
          type="range" min="0.5" max="1.5" step="0.05"
          value={siteIndex || 1.0}
          onChange={(e) => onSiteIndexChange?.(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-amber-400 cursor-pointer"
        />
        <span className="text-[10px] text-amber-400 font-medium tabular-nums w-7 text-right">
          {(siteIndex || 1.0).toFixed(2)}
        </span>
      </div>

      {/* Stocking Guide */}
      <div>
        <div className="text-[9px] text-slate-600 font-semibold tracking-wider mb-1.5">
          STOCKING ({stand.stockingLevel.toUpperCase()})
        </div>
        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-[25%] border-r border-white/[0.08]" title="Understocked" />
            <div className="w-[10%] border-r border-white/[0.08]" title="Low" />
            <div className="w-[20%] border-r border-white/[0.08]" title="Full" />
            <div className="w-[25%] border-r border-white/[0.08]" title="Overstocked" />
            <div className="w-[20%]" title="Self-thinning" />
          </div>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, stockingPct * 100)}%`, backgroundColor: stockingColor }}
          />
        </div>
        <div className="flex justify-between mt-0.5 text-[7px] text-slate-700">
          <span>0%</span><span>35%</span><span>55%</span><span>80%</span><span>100%</span>
        </div>
      </div>

      {/* Stand Metrics */}
      <div className="space-y-1.5">
        <MetricRow label="Basal Area" value={`${stand.basalAreaSqFt} ft²/ac`} />
        <MetricRow label="SDI" value={`${stand.sdi} / ${stand.maxSdi}`} />
        <MetricRow label="Rel. Density" value={`${(stand.relDensity * 100).toFixed(0)}%`} />
        <MetricRow label="QMD" value={`${stand.qmd}"`} />
        <MetricRow label="TPA" value={`${stand.treesPerAcre}`} />
      </div>

      {/* Biomass & Carbon */}
      <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
        <div className="text-[9px] text-slate-600 font-semibold tracking-wider">BIOMASS & CARBON</div>
        <MetricRow label="Total Biomass" value={stand.totalBiomassLbs >= 2000
          ? `${(stand.totalBiomassLbs / 2000).toFixed(1)} tons` : `${Math.round(stand.totalBiomassLbs)} lbs`} />
        <MetricRow label="Carbon Stored" value={stand.totalCarbonLbs >= 2000
          ? `${(stand.totalCarbonLbs / 2000).toFixed(1)} tons` : `${Math.round(stand.totalCarbonLbs)} lbs`} />
        <MetricRow label="CO₂ Sequestered" value={stand.totalCo2Lbs >= 2000
          ? `${(stand.totalCo2Lbs / 2000).toFixed(1)} tons` : `${Math.round(stand.totalCo2Lbs)} lbs`} />
      </div>

      {/* Timber */}
      {(stand.totalVolumeBF > 0 || stand.harvestedVolumeBF > 0) && (
        <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider">TIMBER YIELD</div>
          <MetricRow label="Standing Vol." value={totalMBF >= 1 ? `${totalMBF.toFixed(1)} MBF` : `${Math.round(stand.totalVolumeBF)} BF`} />
          {stand.harvestedVolumeBF > 0 && (
            <>
              <MetricRow label="Harvested Vol." value={stand.harvestedVolumeBF >= 1000 ? `${(stand.harvestedVolumeBF / 1000).toFixed(1)} MBF` : `${stand.harvestedVolumeBF} BF`} />
              <MetricRow label="Total Yield" value={(() => { const c = stand.totalVolumeBF + stand.harvestedVolumeBF; return c >= 1000 ? `${(c / 1000).toFixed(1)} MBF` : `${c} BF`; })()} />
            </>
          )}
          <MetricRow label="Est. Stumpage" value={`$${standingTimberValue >= 1000 ? `${(standingTimberValue / 1000).toFixed(1)}k` : standingTimberValue}`} />
        </div>
      )}

      {/* Mortality */}
      {deadTrees.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <div className="text-[9px] text-slate-600 font-semibold tracking-wider mb-1">MORTALITY ({deadTrees.length} trees)</div>
          <div className="space-y-0.5 max-h-16 overflow-y-auto">
            {mortalityEvents.slice(-5).map((ev, i) => (
              <div key={i} className="text-[9px] text-red-400/70">yr {ev.year}: {ev.speciesName}</div>
            ))}
            {mortalityEvents.length > 5 && <div className="text-[8px] text-slate-600">+{mortalityEvents.length - 5} more</div>}
          </div>
        </div>
      )}

      {/* Per-Tree Table Toggle */}
      <div className="border-t border-white/[0.06] pt-2">
        <button onClick={() => setShowTable(v => !v)} className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
          {showTable ? 'Hide' : 'Show'} Per-Tree Data ({aliveTrees.length})
        </button>
        {showTable && (
          <div className="mt-1.5 max-h-40 overflow-y-auto">
            <table className="w-full text-[8px]">
              <thead>
                <tr className="text-slate-600 text-left">
                  <th className="pb-1 cursor-pointer" onClick={() => handleSort('speciesName')}>Species<SortIcon col="speciesName" /></th>
                  <th className="pb-1 cursor-pointer text-right" onClick={() => handleSort('dbhInches')}>DBH<SortIcon col="dbhInches" /></th>
                  <th className="pb-1 cursor-pointer text-right" onClick={() => handleSort('heightFt')}>Ht<SortIcon col="heightFt" /></th>
                  <th className="pb-1 cursor-pointer text-right" onClick={() => handleSort('volumeBF')}>BF<SortIcon col="volumeBF" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedTrees.map((t) => (
                  <tr key={t.id} className="text-slate-400 border-t border-white/[0.03]">
                    <td className="py-0.5 truncate max-w-[80px]">{t.speciesName}</td>
                    <td className="py-0.5 text-right tabular-nums">{t.dbhInches}"</td>
                    <td className="py-0.5 text-right tabular-nums">{t.heightFt}'</td>
                    <td className="py-0.5 text-right tabular-nums">{t.volumeBF || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Methodology */}
      <div className="border-t border-white/[0.06] pt-2">
        <button onClick={() => setShowMethodology(v => !v)} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
          {showMethodology ? 'Hide' : 'Show'} Methodology Notes
        </button>
        {showMethodology && (
          <div className="mt-1.5 text-[7px] text-slate-700 leading-relaxed space-y-1.5">
            <div><strong className="text-slate-600">Published equations used:</strong> Jenkins et al. (2003) biomass, Reineke (1933) SDI, Chapman-Richards height-diameter curves, i-Tree Eco ecosystem services rates.</div>
            <div><strong className="text-slate-600">Approximate components:</strong> Growth curve shape (custom beta-distribution, not empirically fitted per region), competition modifier (piecewise linear vs. crown competition factor), site index (soil-texture multiplier, not base-age height curves).</div>
            <div><strong className="text-slate-600">Financial estimates:</strong> Stumpage prices are national averages by species group and product class (veneer, sawtimber, pulpwood). Actual prices vary significantly by region, log quality, market conditions, and access.</div>
            <div><strong className="text-slate-600">Not modeled:</strong> Shade tolerance effects, drought/climate stress, regeneration after harvest, regional volume tables, log grade differentiation, wood-products carbon storage.</div>
            <div className="text-amber-400/60 font-medium">This is a planning-grade educational tool. It should not replace professional timber cruises or financial appraisals.</div>
          </div>
        )}
      </div>

      {/* FVS Benchmark Validation */}
      <div className="border-t border-white/[0.06] pt-2">
        <ValidationPanel />
      </div>
    </div>
  );
}

/**
 * Legacy standalone panel (kept for backwards compatibility).
 */
export default function ForestryPanel({
  trees, speciesMap, projectionYear, siteIndex, prescription, onSiteIndexChange, expanded, onToggle,
}) {
  const projection = useProjection(trees, speciesMap, projectionYear, siteIndex, prescription);
  if (!projection || trees.length === 0) return null;

  const { stand } = projection;

  return (
    <div>
      <div
        role="button" tabIndex={0} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="glass-panel rounded-xl overflow-hidden transition-all duration-300 text-left w-[220px] cursor-pointer"
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold text-[13px]">Forestry</span>
              <span className="text-[9px] text-slate-600 font-medium">{stand.aliveTrees} alive</span>
            </div>
            <svg className={`w-3 h-3 text-slate-600 transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {expanded && (
            <div className="mt-3" onClick={e => e.stopPropagation()}>
              <ForestryPanelContent trees={trees} speciesMap={speciesMap} projectionYear={projectionYear} siteIndex={siteIndex} prescription={prescription} onSiteIndexChange={onSiteIndexChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[11px] text-amber-400/90 font-medium tabular-nums">{value}</span>
    </div>
  );
}
