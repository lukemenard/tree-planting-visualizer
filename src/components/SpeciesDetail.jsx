import { useState, useEffect } from 'react';
import { getSpeciesById, getSpeciesStatus, ECOREGIONS } from '../data/treeSpecies';
import InfoTooltip from './InfoTooltip';
import { getSoilCompatibility, SOIL_COLORS } from '../services/soilApi';
import { fetchSpeciesImage } from '../services/speciesImages';

export default function SpeciesDetail({ speciesId, userEcoregion, onClose, speciesMap, detectedSoil, nearPowerLine }) {
  const species = speciesMap?.[speciesId] || getSpeciesById(speciesId);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoSource, setPhotoSource] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    if (!species) return;
    setPhotoUrl(null);
    setPhotoSource(null);

    // If the species already has an image (API-imported), use it
    if (species.imageUrl) {
      setPhotoUrl(species.imageUrl);
      setPhotoSource('Perenual');
      return;
    }

    // Otherwise fetch from Wikipedia
    if (species.scientificName) {
      setPhotoLoading(true);
      fetchSpeciesImage(species.scientificName).then((result) => {
        if (result?.url) {
          setPhotoUrl(result.url);
          setPhotoSource(result.source);
        }
        setPhotoLoading(false);
      });
    }
  }, [species?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!species) return null;

  const status = getSpeciesStatus(species, userEcoregion);
  const regionName = userEcoregion ? ECOREGIONS[userEcoregion]?.name : null;

  // Carbon by decade
  const carbonByDecade = species.co2Curve.map((mult, i) => ({
    decade: (i + 1) * 10,
    annual: Math.round(species.co2PerYear * mult),
    cumulative: Math.round(
      species.co2Curve
        .slice(0, i + 1)
        .reduce((sum, m) => sum + species.co2PerYear * m * 10, 0)
    ),
  }));

  // Soil compatibility from detected map layer data
  const soilType = detectedSoil?.soilType || null;
  const soilCompat = getSoilCompatibility(species, soilType);

  // Power line warning from map layer proximity check
  const utilityWarning = nearPowerLine && species.matureHeightFt > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-panel rounded-2xl max-h-[85vh] overflow-y-auto scrollbar-thin animate-drawer-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="px-5 pb-6">
          {/* Species photo */}
          {(photoUrl || photoLoading) && (
            <div className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden bg-black/30 rounded-t-2xl">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={species.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              )}
              {photoUrl && (
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0d1117] to-transparent" />
              )}
              {photoSource && (
                <span className="absolute top-2 right-2 text-[8px] text-white/40 bg-black/40 rounded px-1.5 py-0.5 backdrop-blur-sm">
                  {photoSource}
                </span>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">{species.emoji}</span>
            <div className="flex-1">
              <h2 className="text-slate-200 font-semibold text-lg leading-tight">{species.name}</h2>
              <p className="text-slate-500 text-xs italic">{species.scientificName}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {status === 'native' && regionName && (
                  <span className="inline-flex items-center gap-1 bg-emerald-950/50 text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-500/10">
                    Native to {regionName}
                  </span>
                )}
                {status === 'invasive' && (
                  <span className="inline-flex items-center gap-1 bg-red-900/60 text-red-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Invasive{regionName ? ` in ${regionName}` : ''}
                  </span>
                )}
                {status === 'non-native' && regionName && (
                  <span className="inline-flex items-center gap-1 bg-yellow-900/40 text-yellow-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Non-native
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Utility line warning banner */}
          {utilityWarning && (
            <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <span className="text-amber-400 text-base leading-none mt-0.5">&#9889;</span>
              <div>
                <p className="text-amber-200 text-[11px] font-semibold">Power Line Nearby</p>
                <p className="text-amber-300/70 text-[10px] leading-relaxed">
                  This species grows to {species.matureHeightFt} ft. The selected planting location is near a power line.
                  ISA recommends planting only trees under 25 ft tall within 20 ft of power lines.
                </p>
              </div>
              <InfoTooltip topic="utilityConflicts" />
            </div>
          )}

          {/* Garden notes */}
          <p className="text-slate-400 text-[12px] leading-relaxed mb-4 bg-white/[0.03] border border-white/[0.04] rounded-lg p-3">
            {species.gardenNotes}
          </p>

          {/* Quick stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <QuickStat label="Mature Height" value={`${species.matureHeightFt} ft`} />
            <QuickStat label="Canopy Spread" value={`${species.matureSpreadFt} ft`} />
            <QuickStat label="Spacing" value={`${species.spacingFt} ft`} />
            <QuickStat label="Growth Rate" value={capitalize(species.growthRate)} />
            <QuickStat label="Lifespan" value={`${species.lifespan} yrs`} />
            <QuickStat label="Shape" value={capitalize(species.canopyShape)} />
          </div>

          {/* Requirements */}
          <div className="flex gap-3 mb-4">
            <RequirementBadge icon="☀️" label="Sun" value={species.sunNeeds} />
            <RequirementBadge icon="💧" label="Water" value={species.waterNeeds} />
          </div>

          {/* ── Soil Compatibility ── */}
          {(species.soilPreference || species.soilTolerance) && (
            <div className="mb-4">
              <h3 className="text-slate-400 text-[10px] font-semibold mb-2 flex items-center gap-1">
                SOIL COMPATIBILITY
                <InfoTooltip topic="soilType" />
              </h3>
              <div className="bg-white/5 rounded-lg p-3">
                {soilType ? (
                  <div className={`flex items-center gap-2 mb-2.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold ${
                    soilCompat === 'ideal' ? 'bg-green-900/40 text-green-300' :
                    soilCompat === 'tolerant' ? 'bg-yellow-900/30 text-yellow-300' :
                    'bg-red-900/30 text-red-300'
                  }`}>
                    <span>{soilCompat === 'ideal' ? '✓' : soilCompat === 'tolerant' ? '~' : '✗'}</span>
                    <span>
                      {soilCompat === 'ideal' ? `${capitalize(soilType)} soil is ideal for this species` :
                       soilCompat === 'tolerant' ? `Tolerates ${soilType} soil (not ideal)` :
                       `${capitalize(soilType)} soil is not recommended`}
                    </span>
                    {detectedSoil?.textureClass && (
                      <span className="text-[9px] font-normal opacity-70 ml-1">
                        ({detectedSoil.textureClass})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2.5 px-2 py-1.5 rounded-lg text-[10px] text-slate-600 bg-white/[0.03]">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Enable the Soil layer and click the map to detect soil type
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {species.soilPreference && (
                    <div>
                      <span className="text-slate-500 block mb-1">Preferred</span>
                      <div className="flex flex-wrap gap-1">
                        {species.soilPreference.map((s) => (
                          <span key={s} className={`px-1.5 py-0.5 rounded ${
                            s === soilType ? 'bg-green-900/60 text-green-300' : 'bg-white/5 text-slate-400'
                          }`}>{capitalize(s)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {species.soilTolerance && (
                    <div>
                      <span className="text-slate-500 block mb-1">Tolerated</span>
                      <div className="flex flex-wrap gap-1">
                        {species.soilTolerance.map((s) => (
                          <span key={s} className={`px-1.5 py-0.5 rounded ${
                            s === soilType ? 'bg-yellow-900/40 text-yellow-300' : 'bg-white/5 text-slate-400'
                          }`}>{capitalize(s)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {species.phRange && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    Soil pH: <span className="text-slate-300">{species.phRange[0]}–{species.phRange[1]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Root System ── */}
          {species.rootSystem && (
            <div className="mb-4">
              <h3 className="text-slate-400 text-[10px] font-semibold mb-2 flex items-center gap-1">
                ROOT SYSTEM
                <InfoTooltip topic="rootSystems" />
              </h3>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <RootDepthIcon type={species.rootSystem} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{capitalize(species.rootSystem)}</div>
                    {species.rootSpreadFt && (
                      <div className="text-[10px] text-slate-500">
                        Root spread: ~{species.rootSpreadFt} ft
                      </div>
                    )}
                  </div>
                </div>

                {species.rootNotes && (
                  <p className="text-[10px] text-slate-400 leading-relaxed">{species.rootNotes}</p>
                )}

                {species.rootSystem === 'shallow' && species.rootSpreadFt > 30 && (
                  <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-300/80 bg-amber-900/20 rounded px-2 py-1.5">
                    <span>⚠️</span>
                    <span>Wide shallow roots may damage sidewalks and foundations. Plant at least 10+ ft from hardscape.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Carbon storage over time */}
          <h3 className="text-slate-400 text-[10px] font-semibold tracking-wider mb-2 flex items-center gap-1">
            CARBON STORAGE
            <InfoTooltip topic="carbonSequestration" />
          </h3>
          <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-3 mb-3">
            <div className="flex items-end gap-1 h-20 mb-2">
              {carbonByDecade.map((d) => {
                const maxCumulative = carbonByDecade[carbonByDecade.length - 1].cumulative;
                const height = maxCumulative > 0 ? (d.cumulative / maxCumulative) * 100 : 0;
                return (
                  <div key={d.decade} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-emerald-400 font-semibold tabular-nums">
                      {d.cumulative >= 1000 ? `${(d.cumulative / 1000).toFixed(1)}t` : `${d.cumulative}kg`}
                    </span>
                    <div
                      className="w-full rounded-t bg-emerald-600/40 transition-all duration-500"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-[9px] text-slate-600">{d.decade}yr</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 text-center">
              CO2 at maturity: <span className="text-emerald-400 font-medium">{species.co2PerYear} kg/year</span>
            </p>
          </div>

          {/* Native range info */}
          {species.nativeRegions.length > 0 && (
            <div className="mb-3">
              <h3 className="text-slate-500 text-[10px] font-semibold mb-1">Native Regions</h3>
              <div className="flex flex-wrap gap-1">
                {species.nativeRegions.map((r) => (
                  <span key={r} className="text-[9px] bg-emerald-950/40 text-emerald-400/80 px-1.5 py-0.5 rounded border border-emerald-500/10">
                    {ECOREGIONS[r]?.name || r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {species.invasiveRegions.length > 0 && (
            <div className="mb-3">
              <h3 className="text-red-400 text-[10px] font-semibold mb-1">Invasive In</h3>
              <div className="flex flex-wrap gap-1">
                {species.invasiveRegions.map((r) => (
                  <span key={r} className="text-[9px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">
                    {ECOREGIONS[r]?.name || r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function RootDepthIcon({ type }) {
  const depths = { shallow: 1, moderate: 2, deep: 3, taproot: 3 };
  const level = depths[type] || 2;
  return (
    <div className="flex flex-col items-center gap-0.5 w-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-full h-1 rounded-full transition-colors ${
            i <= level ? 'bg-amber-500/60' : 'bg-white/5'
          }`}
        />
      ))}
      <span className="text-[7px] text-slate-600 mt-0.5">depth</span>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg px-2 py-1.5 text-center">
      <div className="text-[12px] font-semibold text-slate-200">{value}</div>
      <div className="text-[9px] text-slate-600">{label}</div>
    </div>
  );
}

function RequirementBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.04] rounded-lg px-2.5 py-1.5">
      <span className="text-sm">{icon}</span>
      <div>
        <div className="text-[10px] text-slate-600">{label}</div>
        <div className="text-[12px] font-semibold text-slate-200 capitalize">{value}</div>
      </div>
    </div>
  );
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
