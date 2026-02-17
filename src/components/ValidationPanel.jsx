import { useState, useCallback } from 'react';
import { runValidation, overallAccuracyScore, accuracyGrade, deviationColor } from '../models/validation';
import { BENCHMARK_METRICS } from '../data/fvsBenchmarks';

/**
 * FVS Benchmark Validation display.
 * Runs canonical stands through our model and compares to published FVS outputs.
 * Rendered as an expandable section inside the Stand tab.
 */
export default function ValidationPanel() {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [expandedBenchmark, setExpandedBenchmark] = useState(null);

  const handleRun = useCallback(() => {
    setRunning(true);
    // Use requestAnimationFrame to let the UI paint "Running..." before blocking
    requestAnimationFrame(() => {
      setTimeout(() => {
        const r = runValidation();
        setResults(r);
        setRunning(false);
      }, 50);
    });
  }, []);

  if (!results) {
    return (
      <div className="space-y-2">
        <div className="text-[9px] text-slate-600 font-semibold tracking-wider">FVS BENCHMARK VALIDATION</div>
        <p className="text-[9px] text-slate-600 leading-relaxed">
          Compare our growth model against published USDA Forest Vegetation Simulator outputs
          for 4 canonical stands (loblolly pine, Douglas-fir, oak-hickory, ponderosa pine).
        </p>
        <button
          onClick={handleRun}
          disabled={running}
          className="w-full py-2 rounded-lg text-[10px] font-semibold transition-all
            bg-violet-950/50 text-violet-300 ring-1 ring-violet-500/20 hover:bg-violet-900/40
            disabled:opacity-50 disabled:cursor-wait"
        >
          {running ? 'Running benchmarks...' : 'Run Validation'}
        </button>
      </div>
    );
  }

  const overallScore = overallAccuracyScore(results);
  const grade = accuracyGrade(overallScore);

  return (
    <div className="space-y-2.5">
      <div className="text-[9px] text-slate-600 font-semibold tracking-wider">FVS BENCHMARK VALIDATION</div>

      {/* Overall Score */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center text-lg font-black shrink-0"
          style={{ backgroundColor: `${grade.color}20`, color: grade.color }}
        >
          {grade.letter}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white tabular-nums">{overallScore}%</div>
          <div className="text-[9px] text-slate-500">{grade.label} match vs FVS</div>
          <div className="text-[8px] text-slate-700 mt-0.5">
            Avg |deviation| across {results.length} stands, 5 metrics, 6 decades
          </div>
        </div>
      </div>

      {/* Per-Benchmark Cards */}
      {results.map(bench => {
        const isExpanded = expandedBenchmark === bench.id;
        const bGrade = accuracyGrade(bench.summary.overallScore);
        return (
          <div key={bench.id} className="rounded-xl bg-white/[0.02] ring-1 ring-white/[0.05] overflow-hidden">
            {/* Benchmark Header */}
            <button
              onClick={() => setExpandedBenchmark(isExpanded ? null : bench.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ backgroundColor: `${bGrade.color}18`, color: bGrade.color }}
              >
                {bGrade.letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white font-medium truncate">{bench.name}</div>
                <div className="text-[8px] text-slate-600">FVS-{bench.variant} &middot; {bench.summary.overallScore}% match</div>
              </div>
              <svg
                className={`w-3 h-3 text-slate-600 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-2.5 pb-2.5 space-y-2">
                {/* Description */}
                <div className="text-[8px] text-slate-600 leading-relaxed">{bench.description}</div>

                {/* Summary deviation per metric */}
                <div className="flex gap-1">
                  {BENCHMARK_METRICS.map(m => {
                    const dev = bench.summary.byMetric[m.key];
                    return (
                      <div key={m.key} className="flex-1 text-center py-1 rounded-md bg-white/[0.03]">
                        <div className="text-[8px] text-slate-600 font-medium">{m.label}</div>
                        <div
                          className="text-[10px] font-semibold tabular-nums"
                          style={{ color: deviationColor(dev) }}
                        >
                          {dev !== null ? `±${dev}%` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Decade-by-decade table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[7px]">
                    <thead>
                      <tr className="text-slate-600">
                        <th className="text-left pb-1 pr-1">Year</th>
                        {BENCHMARK_METRICS.map(m => (
                          <th key={m.key} className="text-right pb-1 px-0.5">{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bench.decades.map(d => (
                        <DecadeRow key={d.year} decade={d} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Re-run button */}
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="text-[8px] text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
                >
                  {running ? 'Running...' : 'Re-run all benchmarks'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Methodology note */}
      <div className="text-[7px] text-slate-700 leading-relaxed pt-1">
        Benchmarks derived from USDA FVS variant documentation and published yield tables
        (Burkhart & Tome 2012, Curtis et al. 1981, Schnur 1937, Meyer 1961).
        Deviations &le;15% are typical for planning-grade tools.
      </div>
    </div>
  );
}

function DecadeRow({ decade }) {
  const { year, fvs, model, deviation } = decade;
  return (
    <>
      {/* FVS row */}
      <tr className="border-t border-white/[0.04]">
        <td className="py-0.5 pr-1 text-slate-500 font-medium" rowSpan={2}>
          <div className="text-[8px]">Yr {year}</div>
        </td>
        {BENCHMARK_METRICS.map(m => (
          <td key={m.key} className="py-0.5 px-0.5 text-right text-slate-500 tabular-nums">
            {fvs[m.key] != null ? fvs[m.key].toLocaleString() : '—'}
          </td>
        ))}
      </tr>
      {/* Model row + deviation */}
      <tr>
        {BENCHMARK_METRICS.map(m => (
          <td key={m.key} className="py-0.5 px-0.5 text-right tabular-nums">
            <span className="text-white/80">{model[m.key] != null ? model[m.key].toLocaleString() : '—'}</span>
            {deviation[m.key] !== null && (
              <span
                className="ml-0.5 text-[6px]"
                style={{ color: deviationColor(deviation[m.key]) }}
              >
                {deviation[m.key] > 0 ? '+' : ''}{deviation[m.key]}%
              </span>
            )}
          </td>
        ))}
      </tr>
    </>
  );
}
