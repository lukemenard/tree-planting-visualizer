import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { TREE_SPECIES, getSpeciesStatus } from '../data/treeSpecies';
import { getCommunitiesForEcoregion } from '../data/speciesCommunities';
import InfoTooltip from './InfoTooltip';
import { getSoilCompatibility, SOIL_COLORS } from '../services/soilApi';

const TYPE_FILTERS = [
  { id: 'deciduous', name: 'Deciduous' },
  { id: 'evergreen', name: 'Evergreen' },
  { id: 'tropical', name: 'Tropical' },
  { id: 'fruit', name: 'Fruit/Nut' },
];
const ATTR_FILTERS = [
  { id: 'native', name: 'Native' },
  { id: 'soilMatch', name: 'Soil match' },
  { id: 'fast', name: 'Fast' },
  { id: 'moderate', name: 'Moderate' },
  { id: 'slow', name: 'Slow' },
];

const GENUS_LABELS = {
  quercus: 'Oaks', acer: 'Maples', pinus: 'Pines', betula: 'Birches',
  ulmus: 'Elms', salix: 'Willows', picea: 'Spruces', abies: 'Firs',
  fraxinus: 'Ashes', fagus: 'Beeches', platanus: 'Sycamores',
  tilia: 'Lindens', magnolia: 'Magnolias', cornus: 'Dogwoods',
  prunus: 'Cherries & Plums', malus: 'Apples', pyrus: 'Pears',
  lagerstroemia: 'Crape Myrtles', ginkgo: 'Ginkgos', sequoia: 'Redwoods',
  cedrus: 'Cedars', thuja: 'Arborvitaes', juniperus: 'Junipers',
  taxodium: 'Bald Cypresses', cupressus: 'Cypresses',
  cupressocyparis: 'Leyland Cypresses', chamaecyparis: 'False Cypresses',
  populus: 'Poplars & Aspens', carya: 'Hickories', juglans: 'Walnuts',
  liquidambar: 'Sweetgums', liriodendron: 'Tulip Trees',
  cercis: 'Redbuds', gleditsia: 'Honey Locusts', nyssa: 'Tupelos',
  tsuga: 'Hemlocks', larix: 'Larches', robinia: 'Black Locusts',
  catalpa: 'Catalpas', zelkova: 'Zelkovas', crataegus: 'Hawthorns',
  sorbus: 'Mountain Ashes', amelanchier: 'Serviceberries',
  sassafras: 'Sassafras', carpinus: 'Hornbeams', ostrya: 'Hop-hornbeams',
  roystonea: 'Royal Palms', sabal: 'Palmetto Palms',
  washingtonia: 'Fan Palms', phoenix: 'Date Palms',
  ficus: 'Figs', morus: 'Mulberries', celtis: 'Hackberries',
  alnus: 'Alders', taxus: 'Yews', halesia: 'Silverbells',
  oxydendrum: 'Sourwoods', chionanthus: 'Fringetrees',
  davidia: 'Dove Trees', diospyros: 'Persimmons',
};

function getGrowthBucket(species) {
  const spd = species.growthSpeed ?? (species.growthRate === 'fast' ? 1.4 : species.growthRate === 'slow' ? 0.6 : 1.0);
  if (spd >= 1.3) return 'fast';
  if (spd >= 0.8) return 'moderate';
  return 'slow';
}

function getGenusFromScientificName(scientificName) {
  if (!scientificName) return null;
  return scientificName.split(' ')[0]?.toLowerCase() || null;
}

function getGenusLabel(genus) {
  return GENUS_LABELS[genus] || genus.charAt(0).toUpperCase() + genus.slice(1);
}

export default function TreeToolbar({
  selectedSpecies,
  onSelectSpecies,
  selectedSpeciesMix = [],
  onSetSpeciesMix,
  onSetMixProportions,
  mixProportions = {},
  fillSettings = { proportions: {}, spacingFt: null, pattern: 'hex' },
  onSetFillSettings,
  activeTool = 'place',
  allSpecies,
  speciesMap = {},
  apiLoading,
  showNonNative,
  onToggleNonNative,
  show3D,
  showGrowth,
  showSoilLayer,
  showPowerLines,
  onToggle3D,
  onToggleGrowth,
  onToggleSoilLayer,
  onTogglePowerLines,
  onUndo,
  onClear,
  treeCount,
  userEcoregion,
  onShowDetail,
  onOpenProject,
  detectedSoil,
  nearPowerLine,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMixes, setShowMixes] = useState(false);
  const [showFillSettings, setShowFillSettings] = useState(false);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const isMultiSelectMode = activeTool === 'row' || activeTool === 'area';
  const speciesList = allSpecies || TREE_SPECIES;

  // Auto-calculated spacing from species data
  const autoSpacingFt = useMemo(() => {
    if (selectedSpeciesMix.length === 0) return 20;
    return Math.max(
      ...selectedSpeciesMix.map((id) => {
        const sp = speciesMap[id];
        return sp?.spacingFt || sp?.matureSpreadFt || 20;
      })
    );
  }, [selectedSpeciesMix, speciesMap]);

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  }, []);

  const currentSpecies = useMemo(
    () => selectedSpecies ? speciesList.find((s) => s.id === selectedSpecies) : null,
    [speciesList, selectedSpecies]
  );

  useEffect(() => {
    if (panelOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  const { groups, totalCount } = useMemo(() => {
    let list = speciesList;

    if (activeFilters.size > 0) {
      const typeIds = new Set(['deciduous', 'evergreen', 'tropical', 'fruit']);
      const activeTypes = [...activeFilters].filter((f) => typeIds.has(f));
      if (activeTypes.length > 0) {
        list = list.filter((s) => activeTypes.includes(s.category));
      }
      if (activeFilters.has('native')) {
        list = list.filter((s) => {
          if (!userEcoregion) return s.nativeRegions.length > 0;
          return s.nativeRegions.includes(userEcoregion);
        });
      }
      if (activeFilters.has('soilMatch') && detectedSoil?.soilType) {
        list = list.filter((s) => {
          const compat = getSoilCompatibility(s, detectedSoil.soilType);
          return compat === 'ideal' || compat === 'tolerant';
        });
      }
      const growthIds = new Set(['fast', 'moderate', 'slow']);
      const activeGrowth = [...activeFilters].filter((f) => growthIds.has(f));
      if (activeGrowth.length > 0) {
        list = list.filter((s) => activeGrowth.includes(getGrowthBucket(s)));
      }
    }

    if (userEcoregion && !showNonNative) {
      list = list.filter((s) => getSpeciesStatus(s, userEcoregion) !== 'invasive');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.scientificName || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        getGrowthBucket(s).includes(q)
      );
    }

    const genusMap = new Map();
    const ungrouped = [];
    for (const species of list) {
      const genus = getGenusFromScientificName(species.scientificName);
      if (genus) {
        if (!genusMap.has(genus)) genusMap.set(genus, []);
        genusMap.get(genus).push(species);
      } else {
        ungrouped.push(species);
      }
    }

    const sortedGroups = [...genusMap.entries()]
      .map(([genus, species]) => {
        const sorted = [...species].sort((a, b) => {
          if (userEcoregion) {
            const statusOrder = { native: 0, 'non-native': 1, unknown: 2, invasive: 3 };
            const sa = getSpeciesStatus(a, userEcoregion);
            const sb = getSpeciesStatus(b, userEcoregion);
            const diff = (statusOrder[sa] ?? 2) - (statusOrder[sb] ?? 2);
            if (diff !== 0) return diff;
          }
          return a.name.localeCompare(b.name);
        });
        const nativeCount = userEcoregion
          ? sorted.filter((s) => getSpeciesStatus(s, userEcoregion) === 'native').length
          : 0;
        return { genus, label: getGenusLabel(genus), species: sorted, nativeCount };
      })
      .sort((a, b) => {
        if (b.nativeCount !== a.nativeCount) return b.nativeCount - a.nativeCount;
        if (b.species.length !== a.species.length) return b.species.length - a.species.length;
        return a.label.localeCompare(b.label);
      });

    if (ungrouped.length > 0) {
      sortedGroups.push({
        genus: '_other',
        label: 'Other',
        species: ungrouped.sort((a, b) => a.name.localeCompare(b.name)),
        nativeCount: 0,
      });
    }

    return { groups: sortedGroups, totalCount: list.length };
  }, [activeFilters, userEcoregion, speciesList, showNonNative, searchQuery, detectedSoil]);

  const handleSelect = useCallback((id) => {
    if (isMultiSelectMode && onSetSpeciesMix) {
      // Multi-select: toggle species in/out of the mix — clear community proportions
      onSetSpeciesMix((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        return [...prev, id];
      });
      if (onSetMixProportions) onSetMixProportions({});
      // Also set as single selected species (for visual feedback when mix is 1)
      onSelectSpecies(id);
    } else {
      // Single-select: toggle
      if (selectedSpecies === id) {
        onSelectSpecies(null);
      } else {
        onSelectSpecies(id);
      }
      setPanelOpen(false);
      setSearchQuery('');
    }
  }, [onSelectSpecies, selectedSpecies, isMultiSelectMode, onSetSpeciesMix, onSetMixProportions]);

  const handleApplyCommunity = useCallback((community) => {
    if (!onSetSpeciesMix) return;
    const ids = community.species.map((s) => s.speciesId);
    onSetSpeciesMix(ids);
    // Pass community proportions so fill tools respect the mix ratios
    if (onSetMixProportions) {
      const props = {};
      community.species.forEach((s) => {
        if (s.proportion != null) props[s.speciesId] = s.proportion;
      });
      onSetMixProportions(Object.keys(props).length > 0 ? props : {});
    }
    if (ids.length > 0) onSelectSpecies(ids[0]);
    setShowMixes(false);
    setPanelOpen(false);
  }, [onSetSpeciesMix, onSetMixProportions, onSelectSpecies]);

  const suggestedCommunities = useMemo(
    () => getCommunitiesForEcoregion(userEcoregion),
    [userEcoregion]
  );

  return (
    <div ref={panelRef} className="relative">
      {/* Expandable species panel */}
      {panelOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-0 z-20">
          <div className="glass-panel rounded-t-2xl border-b-0 max-h-[55vh] max-sm:max-h-[65vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Bottom sheet handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-2 pb-0 shrink-0">
              <div className="w-9 h-1 rounded-full bg-white/15" />
            </div>
            {/* Search + filters */}
            <div className="px-4 pt-3 max-sm:pt-2 pb-2 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search species..."
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
                  {totalCount}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {TYPE_FILTERS.map((f) => (
                  <FilterPill key={f.id} label={f.name} active={activeFilters.has(f.id)} onClick={() => toggleFilter(f.id)} />
                ))}
                <div className="w-px h-4 bg-white/[0.06] self-center mx-0.5" />
                {ATTR_FILTERS.map((f) => {
                  if (f.id === 'native' && !userEcoregion) return null;
                  // Soil filter is always available -- the visual layer is separate
                  return (
                    <span key={f.id} className="inline-flex items-center gap-0.5">
                      {f.id === 'soilMatch' ? (
                        detectedSoil?.soilType ? (
                          <FilterPill
                            label={`${SOIL_COLORS[detectedSoil.soilType]?.label || 'Soil'} compatible`}
                            active={activeFilters.has(f.id)}
                            onClick={() => toggleFilter(f.id)}
                            variant="soil"
                          />
                        ) : (
                          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md text-slate-700 italic cursor-default" title="Click the map to detect soil type">
                            Click map for soil filter
                          </span>
                        )
                      ) : (
                        <FilterPill label={f.name} active={activeFilters.has(f.id)} onClick={() => toggleFilter(f.id)} />
                      )}
                      {f.id === 'native' && <InfoTooltip topic="nativeSpecies" />}
                    </span>
                  );
                })}
                {activeFilters.size > 0 && (
                  <button onClick={() => setActiveFilters(new Set())} className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded text-slate-600 hover:text-slate-400 transition-colors">
                    Clear
                  </button>
                )}
                {userEcoregion && (
                  <button
                    onClick={onToggleNonNative}
                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ml-auto
                      ${showNonNative ? 'bg-red-950/40 text-red-400/80' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {showNonNative ? 'Hide invasive' : 'Show invasive'}
                  </button>
                )}
              </div>
            </div>

            {/* Multi-select mode indicator + suggested mixes */}
            {isMultiSelectMode && (
              <div className="px-4 py-2 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Multi-species {activeTool === 'row' ? 'row' : 'area fill'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedSpeciesMix.length === 0
                      ? 'Select species below'
                      : `${selectedSpeciesMix.length} species selected`}
                  </span>
                  {selectedSpeciesMix.length > 0 && (
                    <button
                      onClick={() => { onSetSpeciesMix([]); if (onSetMixProportions) onSetMixProportions({}); }}
                      className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors ml-auto"
                    >
                      Clear mix
                    </button>
                  )}
                </div>

                {/* Selected mix badges */}
                {selectedSpeciesMix.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedSpeciesMix.map((id) => {
                      const sp = speciesList.find((s) => s.id === id);
                      if (!sp) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/40 text-emerald-300 text-[9px] font-medium ring-1 ring-emerald-500/20"
                        >
                          <span>{sp.emoji}</span>
                          <span className="truncate max-w-[60px]">{sp.name}</span>
                          <button
                            onClick={() => onSetSpeciesMix((prev) => prev.filter((s) => s !== id))}
                            className="hover:text-red-400 transition-colors"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Suggested mixes button */}
                <button
                  onClick={() => setShowMixes((p) => !p)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5
                    ${showMixes
                      ? 'bg-blue-950/40 text-blue-400 ring-1 ring-blue-500/20'
                      : 'text-slate-500 bg-white/[0.03] hover:bg-white/[0.06] hover:text-slate-300'}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Suggested Mixes
                  {suggestedCommunities.length > 0 && (
                    <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded-full">
                      {suggestedCommunities.length}
                    </span>
                  )}
                </button>

                {/* Suggested mixes panel */}
                {showMixes && (
                  <div className="mt-2 space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                    {suggestedCommunities.length === 0 && (
                      <div className="text-[10px] text-slate-600 py-2 text-center">
                        No community mixes available for this region
                      </div>
                    )}
                    {suggestedCommunities.map((community) => (
                      <button
                        key={community.id}
                        onClick={() => handleApplyCommunity(community)}
                        className="w-full text-left rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-blue-500/20 p-2 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                            {community.name}
                          </span>
                          <span className="text-[8px] text-slate-600">
                            {community.species.length} species
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight mb-1.5 line-clamp-2">
                          {community.description}
                        </p>
                        <div className="flex flex-wrap gap-0.5">
                          {community.species.map((cs) => {
                            const sp = speciesList.find((s) => s.id === cs.speciesId);
                            return sp ? (
                              <span key={cs.speciesId} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/[0.04] text-[8px] text-slate-400">
                                <span>{sp.emoji}</span>
                                <span className="truncate max-w-[50px]">{sp.name}</span>
                                <span className="text-slate-600">{Math.round((cs.proportion || 0) * 100)}%</span>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fill Settings panel — visible when row/area tool active with 2+ species */}
            {isMultiSelectMode && selectedSpeciesMix.length > 1 && onSetFillSettings && (
              <div className="px-4 py-2 border-b border-white/[0.04]">
                <button
                  onClick={() => setShowFillSettings((p) => !p)}
                  className={`w-full flex items-center justify-between text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-all
                    ${showFillSettings
                      ? 'bg-amber-950/30 text-amber-400 ring-1 ring-amber-500/20'
                      : 'text-slate-500 bg-white/[0.03] hover:bg-white/[0.06] hover:text-slate-300'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Fill Settings
                  </span>
                  <svg className={`w-3 h-3 transition-transform ${showFillSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showFillSettings && (
                  <div className="mt-2 space-y-3">
                    {/* Proportions */}
                    <div>
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Proportions</div>
                      {/* Proportion bar visualization */}
                      <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-white/[0.04]">
                        {selectedSpeciesMix.map((id, i) => {
                          const hasOverride = Object.keys(fillSettings.proportions).length > 0;
                          const pct = hasOverride
                            ? (fillSettings.proportions[id] || 0)
                            : (Object.keys(mixProportions || {}).length > 0
                              ? (mixProportions[id] || 1 / selectedSpeciesMix.length)
                              : 1 / selectedSpeciesMix.length);
                          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500', 'bg-orange-500'];
                          return (
                            <div
                              key={id}
                              className={`${colors[i % colors.length]} transition-all`}
                              style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                          );
                        })}
                      </div>
                      {/* Per-species inputs */}
                      <div className="space-y-1">
                        {selectedSpeciesMix.map((id, i) => {
                          const sp = speciesList.find((s) => s.id === id);
                          if (!sp) return null;
                          const hasOverride = Object.keys(fillSettings.proportions).length > 0;
                          const currentPct = hasOverride
                            ? Math.round((fillSettings.proportions[id] || 0) * 100)
                            : (Object.keys(mixProportions || {}).length > 0
                              ? Math.round((mixProportions[id] || 1 / selectedSpeciesMix.length) * 100)
                              : Math.round((1 / selectedSpeciesMix.length) * 100));
                          const colors = ['text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-rose-400', 'text-violet-400', 'text-cyan-400', 'text-orange-400'];
                          const dotColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500', 'bg-orange-500'];
                          return (
                            <div key={id} className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColors[i % dotColors.length]} shrink-0`} />
                              <span className="text-[9px] text-slate-400 truncate flex-1 max-w-[80px]">
                                {sp.emoji} {sp.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={currentPct}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                    // Build new proportions, adjusting others proportionally
                                    const newProps = {};
                                    const otherIds = selectedSpeciesMix.filter((sid) => sid !== id);
                                    const remaining = 100 - val;
                                    // Get current values for others
                                    const otherCurrentTotal = otherIds.reduce((sum, sid) => {
                                      const p = hasOverride
                                        ? (fillSettings.proportions[sid] || 0)
                                        : (Object.keys(mixProportions || {}).length > 0
                                          ? (mixProportions[sid] || 1 / selectedSpeciesMix.length)
                                          : 1 / selectedSpeciesMix.length);
                                      return sum + p;
                                    }, 0);
                                    newProps[id] = val / 100;
                                    if (otherCurrentTotal > 0) {
                                      otherIds.forEach((sid) => {
                                        const p = hasOverride
                                          ? (fillSettings.proportions[sid] || 0)
                                          : (Object.keys(mixProportions || {}).length > 0
                                            ? (mixProportions[sid] || 1 / selectedSpeciesMix.length)
                                            : 1 / selectedSpeciesMix.length);
                                        newProps[sid] = (p / otherCurrentTotal) * (remaining / 100);
                                      });
                                    } else {
                                      const each = remaining / 100 / otherIds.length;
                                      otherIds.forEach((sid) => { newProps[sid] = each; });
                                    }
                                    onSetFillSettings((prev) => ({ ...prev, proportions: newProps }));
                                  }}
                                  className={`w-10 text-right text-[10px] ${colors[i % colors.length]} font-semibold bg-white/[0.04] border border-white/[0.06] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                />
                                <span className="text-[9px] text-slate-600">%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Reset proportions */}
                      {Object.keys(fillSettings.proportions).length > 0 && (
                        <button
                          onClick={() => onSetFillSettings((prev) => ({ ...prev, proportions: {} }))}
                          className="text-[8px] text-slate-600 hover:text-amber-400 transition-colors mt-1"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>

                    {/* Spacing */}
                    <div>
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Spacing</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={100}
                          placeholder={autoSpacingFt}
                          value={fillSettings.spacingFt || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.max(5, Math.min(100, parseInt(e.target.value) || 0));
                            onSetFillSettings((prev) => ({ ...prev, spacingFt: val }));
                          }}
                          className="w-14 text-[10px] text-slate-300 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/30 placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[9px] text-slate-500">ft</span>
                        <span className="text-[8px] text-slate-600 ml-auto">
                          Auto: {autoSpacingFt}ft
                        </span>
                      </div>
                    </div>

                    {/* Pattern */}
                    <div>
                      <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pattern</div>
                      <div className="flex gap-1">
                        {[
                          { id: 'hex', label: 'Staggered', desc: 'Hex offset — better for forestry' },
                          { id: 'grid', label: 'Grid', desc: 'Square rows — orchards & plantations' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => onSetFillSettings((prev) => ({ ...prev, pattern: opt.id }))}
                            className={`flex-1 text-left px-2 py-1.5 rounded-lg text-[9px] transition-all border
                              ${fillSettings.pattern === opt.id
                                ? 'bg-amber-950/30 text-amber-300 border-amber-500/20 ring-1 ring-amber-500/10'
                                : 'bg-white/[0.02] text-slate-500 border-white/[0.04] hover:bg-white/[0.04] hover:text-slate-300'}`}
                            title={opt.desc}
                          >
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-[8px] text-slate-600 mt-0.5 leading-tight">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Species grid */}
            <div className="overflow-y-auto overscroll-contain px-4 py-2 flex-1 scrollbar-thin">
              {apiLoading && (
                <div className="flex items-center gap-2 py-4 text-[11px] text-slate-500">
                  <div className="w-3 h-3 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
                  Loading species...
                </div>
              )}

              {groups.length === 0 && !apiLoading && (
                <div className="py-8 text-center text-[11px] text-slate-600">
                  No species found{searchQuery ? ` for "${searchQuery}"` : ''}
                </div>
              )}

              {groups.map(({ genus, label, species }) => (
                <div key={genus} className="mb-3 last:mb-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                    <span className="text-[9px] text-slate-700">{species.length}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                    {species.map((sp) => {
                      const status = getSpeciesStatus(sp, userEcoregion);
                      const isSelected = isMultiSelectMode
                        ? selectedSpeciesMix.includes(sp.id)
                        : selectedSpecies === sp.id;
                      const bucket = getGrowthBucket(sp);
                      const soilCompat = detectedSoil ? getSoilCompatibility(sp, detectedSoil.soilType) : null;
                      const powerLineConflict = nearPowerLine && sp.matureHeightFt > 30;
                      return (
                        <button
                          key={sp.id}
                          onClick={() => handleSelect(sp.id)}
                          onDoubleClick={() => onShowDetail?.(sp.id)}
                          className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 max-sm:py-2.5 text-left transition-all text-[10px] max-sm:text-[11px] active:scale-[0.98]
                            ${isSelected
                              ? 'bg-emerald-950/50 text-emerald-300 ring-1 ring-emerald-500/30'
                              : soilCompat === 'incompatible'
                                ? 'bg-red-950/20 text-slate-500 hover:bg-white/[0.06] hover:text-slate-400'
                                : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'}`}
                        >
                          {isMultiSelectMode && (
                            <span className={`shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors
                              ${isSelected
                                ? 'bg-emerald-500/30 border-emerald-500/50'
                                : 'border-white/10 bg-white/[0.02]'}`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          )}
                          <span className="text-sm leading-none shrink-0">{sp.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium leading-tight truncate block">{sp.name}</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <GrowthPill bucket={bucket} />
                              {status === 'invasive' && (
                                <span className="text-[8px] font-semibold text-red-400 bg-red-900/40 px-1 rounded">Invasive</span>
                              )}
                              {powerLineConflict && (
                                <span className="text-[8px] font-semibold text-amber-400 bg-amber-900/30 px-1 rounded" title="Exceeds utility line clearance">&#9889; Lines</span>
                              )}
                              {soilCompat === 'incompatible' && (
                                <span className="text-[8px] font-semibold text-red-400 bg-red-900/30 px-1 rounded">Bad soil</span>
                              )}
                              {soilCompat === 'tolerant' && (
                                <span className="text-[8px] font-semibold text-amber-400 bg-amber-900/30 px-1 rounded">Soil OK</span>
                              )}
                            </div>
                          </div>
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); onShowDetail?.(sp.id); }}
                            className="shrink-0 p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors"
                            title="Species details"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detected soil context badge */}
      {detectedSoil && (
        <div className="absolute bottom-full left-0 right-0 mb-1 flex justify-center pointer-events-none z-10">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/[0.08]">
            <span className={`w-2 h-2 rounded-full ${SOIL_COLORS[detectedSoil.soilType]?.bg || 'bg-slate-600'}`} />
            <span className="text-[10px] font-medium text-slate-300">
              {detectedSoil.textureClass || SOIL_COLORS[detectedSoil.soilType]?.label || 'Unknown'}
            </span>
            {detectedSoil.componentName && (
              <span className="text-[9px] text-slate-500">{detectedSoil.componentName}</span>
            )}
            {nearPowerLine && (
              <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Near power line
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collapsed toolbar */}
      <div className="glass-panel rounded-t-xl px-3 pt-2 pb-2 max-sm:pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanelOpen((p) => !p)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all flex-1 min-w-0
              ${panelOpen
                ? 'bg-emerald-950/40 ring-1 ring-emerald-500/20'
                : 'bg-white/[0.04] hover:bg-white/[0.06]'}`}
          >
            {isMultiSelectMode && selectedSpeciesMix.length > 0 ? (
              <>
                <div className="flex -space-x-1 shrink-0">
                  {selectedSpeciesMix.slice(0, 3).map((id) => {
                    const sp = speciesList.find((s) => s.id === id);
                    return <span key={id} className="text-sm leading-none">{sp?.emoji || '🌳'}</span>;
                  })}
                  {selectedSpeciesMix.length > 3 && (
                    <span className="text-[9px] text-slate-500 ml-0.5">+{selectedSpeciesMix.length - 3}</span>
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-blue-300 truncate w-full text-left">
                    {selectedSpeciesMix.length} species mix
                  </span>
                  <span className="text-[9px] text-slate-600 truncate w-full text-left">
                    {activeTool === 'row' ? 'Row planting' : 'Area fill'} mode
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-base leading-none shrink-0">{currentSpecies?.emoji || '🌳'}</span>
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-slate-200 truncate w-full text-left">
                    {isMultiSelectMode ? 'Select species for mix' : (currentSpecies?.name || 'Select species')}
                  </span>
                  <span className="text-[9px] text-slate-600 truncate w-full text-left flex items-center gap-1">
                    <span className="truncate">
                      {isMultiSelectMode ? 'Tap to browse & multi-select' : (currentSpecies?.scientificName || 'Tap to browse')}
                    </span>
                    {currentSpecies && !isMultiSelectMode && <GrowthPill bucket={getGrowthBucket(currentSpecies)} />}
                  </span>
                </div>
              </>
            )}
            <svg className={`w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform ${panelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Deselect / clear mix button */}
          {(currentSpecies || selectedSpeciesMix.length > 0) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectSpecies(null);
                if (onSetSpeciesMix) onSetSpeciesMix([]);
                if (onSetMixProportions) onSetMixProportions({});
              }}
              className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
              title={isMultiSelectMode ? 'Clear species mix' : 'Deselect species'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="w-px h-7 bg-white/[0.06] shrink-0" />

          <div className="flex gap-0.5 shrink-0 overflow-x-auto scrollbar-hide">
            <ActionBtn active={show3D} onClick={onToggle3D} label="Tilt" icon={<CubeIcon />} />
            <ActionBtn active={showSoilLayer} onClick={onToggleSoilLayer} label="Soil Map" icon={<SoilIcon />} />
            <ActionBtn active={showPowerLines} onClick={onTogglePowerLines} label="Power" icon={<PowerLineIcon />} />
            <ActionBtn active={showGrowth} onClick={onToggleGrowth} label="Growth" icon={<GrowthIcon />} />
            <ActionBtn onClick={onOpenProject} label="Save" icon={<SaveIcon />} />
            <div className="w-px bg-white/[0.06] mx-0.5 self-stretch shrink-0" />
            <ActionBtn onClick={onUndo} label="Undo" disabled={treeCount === 0} icon={<UndoIcon />} />
            <ActionBtn onClick={onClear} label="Clear" disabled={treeCount === 0} variant="danger" icon={<TrashIcon />} />
          </div>
        </div>
      </div>
    </div>
  );
}

const GROWTH_STYLES = {
  fast: { color: 'text-emerald-400/70', label: 'Fast' },
  moderate: { color: 'text-slate-500', label: 'Moderate' },
  slow: { color: 'text-amber-400/70', label: 'Slow' },
};

function GrowthPill({ bucket }) {
  const s = GROWTH_STYLES[bucket] || GROWTH_STYLES.moderate;
  return (
    <span className={`inline-flex items-center gap-0.5 ${s.color} text-[8px] leading-none shrink-0`}>
      <span className="w-1 h-1 rounded-full bg-current opacity-60" />
      {s.label}
    </span>
  );
}

function FilterPill({ label, active, onClick, variant }) {
  const activeStyle = variant === 'soil'
    ? 'bg-amber-950/50 text-amber-400 ring-1 ring-amber-500/20'
    : 'bg-emerald-950/50 text-emerald-400 ring-1 ring-emerald-500/20';
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-md transition-all
        ${active
          ? activeStyle
          : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'}`}
    >
      {label}
    </button>
  );
}

function ActionBtn({ active, onClick, label, icon, disabled, variant }) {
  let cls = 'action-btn flex flex-col items-center justify-center rounded-lg px-1.5 py-1 min-w-[36px] min-h-[36px] text-[8px] font-medium gap-0.5 transition-all';
  if (disabled) cls += ' text-slate-700 cursor-not-allowed';
  else if (active) cls += ' bg-emerald-950/40 text-emerald-400';
  else if (variant === 'danger') cls += ' text-red-400/50 hover:bg-red-950/30 hover:text-red-400';
  else cls += ' text-slate-500 hover:bg-white/[0.04] hover:text-slate-300';
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function CubeIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
}
function UndoIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" /></svg>;
}
function SaveIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
}
function TrashIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
function GrowthIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}
function SoilIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function PowerLineIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
}
