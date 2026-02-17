import { useState, useMemo } from 'react';
import { analyzeCarbonCredits } from '../models/carbonCredits';

/**
 * Standalone content for the Carbon tab inside the unified dashboard.
 */
export function CarbonCreditContent({
  trees, speciesMap, prescription, siteIndex, mapCenter,
}) {
  const [projectType, setProjectType] = useState('afforestation');
  const [creditPrice, setCreditPrice] = useState(15);
  const [creditingPeriod, setCreditingPeriod] = useState(40);
  const [showDetails, setShowDetails] = useState(false);
  const [fireRisk, setFireRisk] = useState('moderate');

  const analysis = useMemo(() => {
    if (!trees || trees.length === 0) return null;
    return analyzeCarbonCredits({
      trees, speciesMap, prescription, siteIndex, creditingPeriod, projectType, creditPrice,
      riskFactors: { fireRisk, latitude: mapCenter?.[1] || 40 },
    });
  }, [trees, speciesMap, prescription, siteIndex, creditingPeriod, projectType, creditPrice, fireRisk, mapCenter]);

  if (!trees || trees.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {/* Project Type Selector */}
      <div className="flex gap-1">
        {[
          { id: 'afforestation', label: 'A/R', tip: 'Afforestation / Reforestation' },
          { id: 'ifm', label: 'IFM', tip: 'Improved Forest Management' },
        ].map(pt => (
          <button key={pt.id} onClick={() => setProjectType(pt.id)} title={pt.tip}
            className={`flex-1 text-[9px] py-1 rounded-lg transition-all ${
              projectType === pt.id
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'}`}>
            {pt.label}
          </button>
        ))}
      </div>

      {analysis && (
        <>
          {/* Key Metrics */}
          <div className="space-y-1">
            <MetricRow label="Net Credits" value={`${analysis.netCredits.toFixed(1)} tCO2e`} highlight />
            <MetricRow label="Est. Revenue" value={`$${fmtNum(analysis.totalRevenue)}`} highlight />
            <MetricRow label="Revenue/acre" value={`$${fmtNum(analysis.revenuePerAcre)}`} />
            <MetricRow label="Annual avg" value={`$${fmtNum(analysis.annualRevenue)}/yr`} />
          </div>

          {/* Credit Price Selector */}
          <div className="border-t border-white/[0.06] pt-2">
            <div className="text-[8px] text-slate-600 font-semibold tracking-wider">CREDIT PRICE ($/tCO2e)</div>
            <div className="flex gap-1 mt-1">
              {[5, 15, 35, 50].map(p => (
                <button key={p} onClick={() => setCreditPrice(p)}
                  className={`flex-1 text-[8px] py-0.5 rounded transition-all ${
                    creditPrice === p ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
                  ${p}
                </button>
              ))}
            </div>
          </div>

          {/* Deductions Summary */}
          <div className="border-t border-white/[0.06] pt-2 space-y-1">
            <div className="text-[8px] text-slate-600 font-semibold tracking-wider">DEDUCTIONS</div>
            <MetricRow label="Gross Credits" value={`${analysis.grossCredits.toFixed(1)} tCO2e`} />
            <MetricRow label={`Buffer Pool (${analysis.bufferPercentage}%)`} value={`-${analysis.bufferDeduction.toFixed(1)}`} negative />
            <MetricRow label={`Leakage (${analysis.leakagePercentage}%)`} value={`-${analysis.leakageDeduction.toFixed(1)}`} negative />
            <div className="h-px bg-white/[0.04]" />
            <MetricRow label="Net Issuable" value={`${analysis.netCredits.toFixed(1)} tCO2e`} highlight />
          </div>

          {/* Details Toggle */}
          <div className="border-t border-white/[0.06] pt-2">
            <button onClick={() => setShowDetails(v => !v)} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
            {showDetails && (
              <div className="mt-2 space-y-2">
                {/* Fire Risk */}
                <div>
                  <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1">FIRE RISK</div>
                  <div className="flex gap-1">
                    {['low', 'moderate', 'high'].map(r => (
                      <button key={r} onClick={() => setFireRisk(r)}
                        className={`flex-1 text-[8px] py-0.5 rounded transition-all capitalize ${
                          fireRisk === r ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crediting Period */}
                <div>
                  <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1">CREDITING PERIOD</div>
                  <div className="flex gap-1">
                    {[20, 30, 40, 60].map(p => (
                      <button key={p} onClick={() => setCreditingPeriod(p)}
                        className={`flex-1 text-[8px] py-0.5 rounded transition-all ${
                          creditingPeriod === p ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'text-slate-600 hover:text-slate-400'}`}>
                        {p}yr
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Breakdown */}
                <div>
                  <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1">RISK BREAKDOWN</div>
                  <MetricRow label="Internal (mgmt/financial)" value={`${analysis.riskBreakdown.internal}%`} />
                  <MetricRow label="External (fire/pest)" value={`${analysis.riskBreakdown.external}%`} />
                  <MetricRow label="Natural disturbance" value={`${analysis.riskBreakdown.disturbance}%`} />
                </div>

                {/* Carbon Trajectory */}
                <div>
                  <div className="text-[8px] text-slate-600 font-semibold tracking-wider mb-1">CARBON TRAJECTORY (tCO2e)</div>
                  <div className="flex items-end gap-px h-[32px]">
                    {analysis.projectTimeline.filter((_, i) => i % 5 === 0).map((pt, i, arr) => {
                      const max = Math.max(...arr.map(a => a.carbonTonnesCO2e), 0.01);
                      const h = (pt.carbonTonnesCO2e / max) * 100;
                      return (
                        <div key={i} className="flex-1 bg-emerald-500/40 rounded-sm min-h-[2px]"
                          style={{ height: `${Math.max(4, h)}%` }} title={`Year ${pt.year}: ${pt.carbonTonnesCO2e.toFixed(1)} tCO2e`} />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[7px] text-slate-700 mt-0.5">
                    <span>Yr 0</span><span>Yr {creditingPeriod}</span>
                  </div>
                </div>

                <div className="text-[8px] text-slate-600">
                  <span className="font-semibold tracking-wider">METHODOLOGY: </span>
                  <span className="text-slate-500">{analysis.methodology}</span>
                </div>
              </div>
            )}
          </div>

          {/* Disclaimers */}
          <div className="text-[7px] text-slate-700 leading-tight border-t border-white/[0.06] pt-2">
            Estimates only. Actual carbon credit issuance requires third-party verification, registered project documentation, and field measurements. Buffer pool deductions based on VCS AFOLU Non-Permanence Risk Tool.
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Legacy standalone panel (kept for backwards compatibility).
 */
export default function CarbonCreditPanel({
  trees, speciesMap, prescription, siteIndex, expanded, onToggle, mapCenter,
}) {
  if (!trees || trees.length === 0) return null;

  return (
    <div className="pointer-events-auto">
      <div className="w-[240px] bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">🌍</span>
            <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide">CARBON CREDITS</span>
          </div>
          <span className={`text-[10px] text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {expanded && (
          <div className="px-3 pb-3">
            <CarbonCreditContent trees={trees} speciesMap={speciesMap} prescription={prescription} siteIndex={siteIndex} mapCenter={mapCenter} />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({ label, value, highlight = false, negative = false }) {
  let color = 'text-amber-400/90';
  if (highlight) color = 'text-emerald-400';
  if (negative) color = 'text-red-400/80';
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-[11px] font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}
