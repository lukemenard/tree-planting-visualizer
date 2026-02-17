import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import TreeToolbar from './components/TreeToolbar';
import WelcomeHint from './components/WelcomeHint';
import SpeciesDetail from './components/SpeciesDetail';
import GrowthTimeline from './components/GrowthTimeline';
import ProjectDrawer from './components/ProjectDrawer';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { TREE_SPECIES, ECOREGIONS, getEcoregionForState } from './data/treeSpecies';
import { isFloraApiConfigured, fetchTreesForState } from './services/floraApi';
import { saveProject, generateProjectId } from './services/projectStore';
import { parseShareUrl } from './services/shareUrl';
import { onAuthChange } from './services/authService';
import { saveProjectHybrid, migrateLocalToCloud } from './services/cloudStore';
import { fetchSoilAtPoint } from './services/soilApi';
import { debouncedFetchPowerLines, generatePowerLineBuffer, checkPowerLineProximity } from './services/powerLineApi';
import { siteIndexFromSoil } from './models/forestryModel';
import { getPrescription } from './data/silviculturalPrescriptions';
import {
  generateSpacingRingsGeoJSON,
  generateSpacingConflictsGeoJSON,
  generateRulerGeoJSON,
  generateRulerPointsGeoJSON,
  generateBoundaryGeoJSON,
  generateBoundaryPointsGeoJSON,
  computeRowPositions,
  computeAreaFillPositions,
  assignSpeciesToPositions,
  formatDistance,
  distanceMeters,
  polygonAreaAcres,
} from './utils/planningUtils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
let treeIdCounter = 0;

export default function App() {
  const [trees, setTrees] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [show3D, setShow3D] = useState(true);
  const [detailSpecies, setDetailSpecies] = useState(null);
  const [userEcoregion, setUserEcoregion] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [projectionYear, setProjectionYear] = useState(null);
  const [showGrowth, setShowGrowth] = useState(false);
  const [apiSpecies, setApiSpecies] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [userStateCode, setUserStateCode] = useState(null);
  const [showNonNative, setShowNonNative] = useState(false);

  // Soil & power line map layer state
  const [showSoilLayer, setShowSoilLayer] = useState(false);
  const [showPowerLines, setShowPowerLines] = useState(false);
  const [detectedSoil, setDetectedSoil] = useState(null);
  const [nearPowerLine, setNearPowerLine] = useState(false);
  const [powerLineGeoJSON, setPowerLineGeoJSON] = useState(null);
  const [powerLineBufferGeoJSON, setPowerLineBufferGeoJSON] = useState(null);

  // Forestry model state
  const [siteIndex, setSiteIndex] = useState(1.0);
  const [prescription, setPrescription] = useState(() => getPrescription('no-management'));
  const [season, setSeason] = useState('summer');

  // Planning tools state
  const [activeTool, setActiveTool] = useState('place');
  const [selectedSpeciesMix, setSelectedSpeciesMix] = useState([]); // multi-species for row/area fill
  const [mixProportions, setMixProportions] = useState({}); // { speciesId: proportion } from community mixes
  const defaultFillSettings = { proportions: {}, spacingFt: null, pattern: 'hex' };
  const [fillSettings, setFillSettings] = useState(defaultFillSettings);
  const [showSpacingRings, setShowSpacingRings] = useState(false);
  const [lightPreset, setLightPreset] = useState('day');
  const [rulerPoints, setRulerPoints] = useState([]);
  const [rowPoints, setRowPoints] = useState([]);
  const [areaPoints, setAreaPoints] = useState([]);
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [boundaryPolygon, setBoundaryPolygon] = useState(null);

  // Project persistence state
  const [projectId, setProjectId] = useState(() => generateProjectId());
  const [projectName, setProjectName] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [showProjectDrawer, setShowProjectDrawer] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectSaved, setProjectSaved] = useState(false); // only auto-save after explicit save

  const mapRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Merge bundled + API species into a single list (bundled first, no duplicates)
  const allSpecies = useMemo(() => {
    const bundledIds = new Set(TREE_SPECIES.map((s) => s.id));
    const uniqueApi = apiSpecies.filter((s) => !bundledIds.has(s.id));
    return [...TREE_SPECIES, ...uniqueApi];
  }, [apiSpecies]);

  // Species map for quick lookup (used by MapView, AnalyticsDashboard)
  const speciesMap = useMemo(() => {
    const map = {};
    allSpecies.forEach((s) => { map[s.id] = s; });
    return map;
  }, [allSpecies]);

  // Reset fill settings when the species mix changes
  const prevMixRef = useRef(selectedSpeciesMix);
  useEffect(() => {
    const prev = prevMixRef.current;
    const changed = prev.length !== selectedSpeciesMix.length || prev.some((id, i) => id !== selectedSpeciesMix[i]);
    if (changed) {
      setFillSettings(defaultFillSettings);
      prevMixRef.current = selectedSpeciesMix;
    }
  }, [selectedSpeciesMix]);

  const placeTree = useCallback((lng, lat, speciesId) => {
    const newTree = {
      id: `tree-${++treeIdCounter}`,
      lng, lat,
      speciesId: speciesId || selectedSpecies,
      placedAt: Date.now(),
    };
    setTrees((prev) => [...prev, newTree]);
    return newTree;
  }, [selectedSpecies]);

  const handleMapClick = useCallback(
    (lngLat) => {
      const pt = [lngLat.lng, lngLat.lat];

      // Always query soil/power lines regardless of tool
      fetchSoilAtPoint(lngLat.lng, lngLat.lat).then((soil) => {
        if (soil) setDetectedSoil(soil);
      });
      if (powerLineGeoJSON && powerLineGeoJSON.features.length > 0) {
        const result = checkPowerLineProximity(lngLat, powerLineGeoJSON);
        setNearPowerLine(result.near);
      }

      // Route to active tool
      switch (activeTool) {
        case 'place':
          if (!selectedSpecies) return;
          placeTree(lngLat.lng, lngLat.lat);
          break;

        case 'ruler':
          setRulerPoints((prev) => {
            if (prev.length >= 2) return [pt]; // start over
            return [...prev, pt];
          });
          break;

        case 'row':
          setRowPoints((prev) => {
            if (prev.length >= 2) return [pt]; // start over
            const effectiveMix = selectedSpeciesMix.length > 0 ? selectedSpeciesMix : (selectedSpecies ? [selectedSpecies] : []);
            if (prev.length === 1 && effectiveMix.length > 0) {
              const spacingFt = fillSettings.spacingFt || Math.max(
                ...effectiveMix.map((id) => {
                  const sp = speciesMap[id];
                  return sp?.spacingFt || sp?.matureSpreadFt || 20;
                })
              );
              const positions = computeRowPositions(prev[0], pt, spacingFt);
              if (effectiveMix.length === 1) {
                positions.forEach((p) => placeTree(p[0], p[1], effectiveMix[0]));
              } else {
                const hasOverrideProportions = Object.keys(fillSettings.proportions).length > 0;
                const mix = effectiveMix.map((id) => ({
                  speciesId: id,
                  ...(hasOverrideProportions
                    ? { proportion: fillSettings.proportions[id] }
                    : (mixProportions[id] != null ? { proportion: mixProportions[id] } : {})),
                }));
                const assigned = assignSpeciesToPositions(positions, mix);
                assigned.forEach((a) => placeTree(a.lng, a.lat, a.speciesId));
              }
              return []; // reset
            }
            return [...prev, pt];
          });
          break;

        case 'area':
          setAreaPoints((prev) => [...prev, pt]);
          break;

        case 'boundary':
          setBoundaryPoints((prev) => [...prev, pt]);
          break;

        default:
          break;
      }
    },
    [selectedSpecies, selectedSpeciesMix, mixProportions, fillSettings, powerLineGeoJSON, activeTool, speciesMap, placeTree]
  );

  const handleRemoveTree = useCallback((treeId) => {
    setTrees((prev) => prev.filter((t) => t.id !== treeId));
  }, []);

  const handleUndo = useCallback(() => {
    setTrees((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setTrees([]);
  }, []);

  const handleFlyTo = useCallback((coords) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: coords,
        zoom: 17,
        pitch: 45,
        bearing: 0,
        duration: 2000,
      });
    }
    // Reverse geocode to detect ecoregion
    detectEcoregion(coords);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(coords);
        try { localStorage.setItem('canopyviz_last_location', JSON.stringify(coords)); } catch {}
        handleFlyTo(coords);
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleFlyTo]);

  // Reverse geocode to find the user's US state -> ecoregion + trigger Flora API
  const detectEcoregion = useCallback(async (coords) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}&types=region&limit=1`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        // Extract state code from short_code (e.g., "US-CA" -> "CA")
        const shortCode = feature.properties?.short_code;
        if (shortCode && shortCode.startsWith('US-')) {
          const stateCode = shortCode.replace('US-', '');
          const ecoregion = getEcoregionForState(stateCode);
          console.log(`[App] Detected state: ${stateCode}, ecoregion: ${ecoregion}`);
          setUserEcoregion(ecoregion);
          setUserStateCode(stateCode);
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
  }, []);

  // When the map is ready, detect ecoregion and set up moveend listener
  const handleMapReady = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Detect initial ecoregion
    const center = map.getCenter();
    if (center) detectEcoregion([center.lng, center.lat]);

    // Debounced moveend listener
    let timeout;
    const onMoveEnd = () => {
      const c = map.getCenter();
      if (c) detectEcoregion([c.lng, c.lat]);
    };
    const debouncedMoveEnd = () => {
      clearTimeout(timeout);
      timeout = setTimeout(onMoveEnd, 2000);
    };
    map.on('moveend', debouncedMoveEnd);
  }, [detectEcoregion]);

  // Finish polygon drawing for area fill or boundary
  const handleFinishPolygon = useCallback(() => {
    const effectiveMix = selectedSpeciesMix.length > 0 ? selectedSpeciesMix : (selectedSpecies ? [selectedSpecies] : []);
    if (activeTool === 'area' && areaPoints.length >= 3 && effectiveMix.length > 0) {
      const spacingFt = fillSettings.spacingFt || Math.max(
        ...effectiveMix.map((id) => {
          const sp = speciesMap[id];
          return sp?.spacingFt || sp?.matureSpreadFt || 20;
        })
      );
      const positions = computeAreaFillPositions(areaPoints, spacingFt, fillSettings.pattern);
      if (effectiveMix.length === 1) {
        positions.forEach((p) => placeTree(p[0], p[1], effectiveMix[0]));
      } else {
        const hasOverrideProportions = Object.keys(fillSettings.proportions).length > 0;
        const mix = effectiveMix.map((id) => ({
          speciesId: id,
          ...(hasOverrideProportions
            ? { proportion: fillSettings.proportions[id] }
            : (mixProportions[id] != null ? { proportion: mixProportions[id] } : {})),
        }));
        const assigned = assignSpeciesToPositions(positions, mix);
        assigned.forEach((a) => placeTree(a.lng, a.lat, a.speciesId));
      }
      setAreaPoints([]);
    } else if (activeTool === 'boundary' && boundaryPoints.length >= 3) {
      setBoundaryPolygon([...boundaryPoints]);
      setBoundaryPoints([]);
    }
  }, [activeTool, areaPoints, boundaryPoints, selectedSpecies, selectedSpeciesMix, mixProportions, fillSettings, speciesMap, placeTree]);

  // When tool changes, clear intermediate state
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    setRulerPoints([]);
    setRowPoints([]);
    setAreaPoints([]);
    setBoundaryPoints([]);
    // Clear species mix when leaving fill tools
    if (tool !== 'row' && tool !== 'area') {
      setSelectedSpeciesMix([]);
      setMixProportions({});
    }
  }, []);

  // Compute planning overlay data
  const EMPTY_FC = { type: 'FeatureCollection', features: [] };

  const planningData = useMemo(() => {
    const data = {};

    // Spacing rings
    if (showSpacingRings && trees.length > 0) {
      data.spacingRings = generateSpacingRingsGeoJSON(trees, speciesMap);
      data.spacingConflicts = generateSpacingConflictsGeoJSON(trees, speciesMap);
    } else {
      data.spacingRings = EMPTY_FC;
      data.spacingConflicts = EMPTY_FC;
    }

    // Ruler
    data.rulerLine = rulerPoints.length === 2 ? generateRulerGeoJSON(rulerPoints) : EMPTY_FC;
    data.rulerPoints = generateRulerPointsGeoJSON(rulerPoints);

    // Boundary
    data.boundaryPolygon = boundaryPolygon ? generateBoundaryGeoJSON(boundaryPolygon) : EMPTY_FC;
    data.boundaryPoints = generateBoundaryPointsGeoJSON(boundaryPoints);

    // Drawing polygon (area fill in progress)
    if (areaPoints.length >= 3) {
      const closed = [...areaPoints, areaPoints[0]];
      data.drawingPolygon = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [closed] },
        }],
      };
    } else if (areaPoints.length >= 2) {
      data.drawingPolygon = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: areaPoints },
        }],
      };
    } else {
      data.drawingPolygon = EMPTY_FC;
    }
    data.drawingPoints = generateBoundaryPointsGeoJSON(areaPoints);

    // Row preview
    if (rowPoints.length === 1 && (selectedSpecies || selectedSpeciesMix.length > 0)) {
      data.rowPreview = generateRulerPointsGeoJSON(rowPoints);
    } else {
      data.rowPreview = EMPTY_FC;
    }

    return data;
  }, [trees, speciesMap, showSpacingRings, rulerPoints, boundaryPolygon, boundaryPoints, areaPoints, rowPoints, selectedSpecies, selectedSpeciesMix]);

  // Derived stats for planning tools UI
  const conflictCount = planningData.spacingConflicts?.features?.length || 0;
  const rulerLabel = rulerPoints.length === 2
    ? formatDistance(distanceMeters(rulerPoints[0], rulerPoints[1]))
    : null;
  const boundaryAreaLabel = boundaryPolygon
    ? `${polygonAreaAcres(boundaryPolygon).toFixed(2)} acres`
    : null;
  const areaFillAcres = activeTool === 'area' && areaPoints.length >= 3
    ? polygonAreaAcres(areaPoints)
    : null;

  const hasSpeciesSelected = !!selectedSpecies || selectedSpeciesMix.length > 0;

  // Cursor style based on tool
  const cursorStyle = useMemo(() => {
    switch (activeTool) {
      case 'ruler': return 'crosshair';
      case 'row': return rowPoints.length === 0 ? 'crosshair' : 'cell';
      case 'area': return 'crosshair';
      case 'boundary': return 'crosshair';
      default: return hasSpeciesSelected ? 'crosshair' : 'pointer';
    }
  }, [activeTool, rowPoints.length, hasSpeciesSelected]);

  const toggle3D = useCallback(() => setShow3D((p) => !p), []);
  const toggleSoilLayer = useCallback(() => setShowSoilLayer((p) => !p), []);
  const togglePowerLines = useCallback(() => setShowPowerLines((p) => !p), []);

  // Fetch power lines when the viewport changes and the layer is active
  const handleMoveEnd = useCallback((bounds, zoom) => {
    if (!showPowerLines) return;
    debouncedFetchPowerLines(bounds, zoom, (geojson) => {
      setPowerLineGeoJSON(geojson);
      setPowerLineBufferGeoJSON(generatePowerLineBuffer(geojson));
    });
  }, [showPowerLines]);

  // When power lines toggle on, trigger an immediate fetch
  useEffect(() => {
    if (!showPowerLines) return;
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (bounds) {
      debouncedFetchPowerLines(bounds, zoom, (geojson) => {
        setPowerLineGeoJSON(geojson);
        setPowerLineBufferGeoJSON(generatePowerLineBuffer(geojson));
      });
    }
  }, [showPowerLines]);

  // Auto-derive site index from detected soil texture
  useEffect(() => {
    if (detectedSoil?.texture) {
      setSiteIndex(siteIndexFromSoil(detectedSoil.texture));
    }
  }, [detectedSoil]);

  // Fetch Flora API species when the user's state changes
  useEffect(() => {
    if (!userStateCode) return;
    if (!isFloraApiConfigured()) {
      console.log('[App] Flora API key not configured — using bundled species only');
      return;
    }

    let cancelled = false;
    setApiLoading(true);
    console.log(`[App] State changed to ${userStateCode} — fetching species from Flora API...`);

    fetchTreesForState(userStateCode).then((species) => {
      if (!cancelled) {
        const ecoregion = getEcoregionForState(userStateCode);
        const marked = species.map((s) => ({
          ...s,
          nativeRegions: ecoregion ? [ecoregion] : [],
        }));
        console.log(`[App] Loaded ${marked.length} API species for ${userStateCode}`);
        setApiSpecies(marked);
        setApiLoading(false);
      }
    }).catch((err) => {
      console.warn('[App] Flora API error:', err);
      if (!cancelled) setApiLoading(false);
    });

    return () => { cancelled = true; };
  }, [userStateCode]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      if (user) {
        migrateLocalToCloud().catch((err) =>
          console.warn('[App] Cloud migration error:', err)
        );
      }
    });
    return unsubscribe;
  }, []);

  // Load shared/saved project from URL on mount, or auto-locate user
  useEffect(() => {
    const shared = parseShareUrl();
    if (shared) {
      setTrees(shared.trees || []);
      setProjectName(shared.name || '');
      setAddressLabel(shared.address || '');
      treeIdCounter = shared.trees?.length || 0;

      // Fly to saved location after map loads
      const flyTimer = setTimeout(() => {
        if (mapRef.current && shared.center) {
          mapRef.current.flyTo({
            center: shared.center,
            zoom: shared.zoom || 17,
            pitch: shared.pitch || 45,
            bearing: shared.bearing || 0,
            duration: 2000,
          });
        }
      }, 1500);
      return () => clearTimeout(flyTimer);
    }

    // No shared project — auto-locate the user
    const LOCATION_CACHE_KEY = 'canopyviz_last_location';
    const cachedRaw = localStorage.getItem(LOCATION_CACHE_KEY);
    const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

    // Immediately fly to cached location if we have one (instant on return visits)
    if (cached) {
      const flyTimer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: cached,
            zoom: 17,
            pitch: 45,
            bearing: 0,
            duration: 1200,
          });
          detectEcoregion(cached);
        }
      }, 800);
      // Still attempt live geolocation to update cache
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = [pos.coords.longitude, pos.coords.latitude];
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords));
            setUserLocation(coords);
            // Only fly if significantly different from cached (>500m)
            const dlng = coords[0] - cached[0];
            const dlat = coords[1] - cached[1];
            const dist = Math.sqrt(dlng * dlng + dlat * dlat) * 111000;
            if (dist > 500 && mapRef.current) {
              mapRef.current.flyTo({ center: coords, zoom: 17, pitch: 45, bearing: 0, duration: 2000 });
              detectEcoregion(coords);
            }
          },
          () => {}, // silent failure — we already used cache
          { enableHighAccuracy: false, timeout: 8000 }
        );
      }
      return () => clearTimeout(flyTimer);
    }

    // No cache — request live geolocation
    if (navigator.geolocation) {
      const geoTimer = setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = [pos.coords.longitude, pos.coords.latitude];
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(coords));
            setUserLocation(coords);
            if (mapRef.current) {
              mapRef.current.flyTo({ center: coords, zoom: 17, pitch: 45, bearing: 0, duration: 2000 });
              detectEcoregion(coords);
            }
          },
          (err) => console.warn('[App] Geolocation denied or failed:', err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }, 1000); // small delay for map to initialize
      return () => clearTimeout(geoTimer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save (debounced 2s) -- only runs after the user has explicitly saved once
  useEffect(() => {
    if (!projectSaved || trees.length === 0) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const map = mapRef.current;
      const project = {
        id: projectId,
        name: projectName || 'Untitled Plan',
        address: addressLabel || null,
        center: map ? [map.getCenter().lng, map.getCenter().lat] : [-73.985, 40.748],
        zoom: map?.getZoom() || 17,
        pitch: map?.getPitch() || 45,
        bearing: map?.getBearing() || 0,
        trees,
      };
      saveProjectHybrid(project).catch((err) =>
        console.warn('[App] Auto-save error:', err)
      );
    }, 3000);
    return () => clearTimeout(autoSaveRef.current);
  }, [trees, projectId, projectName, addressLabel, currentUser, projectSaved]);

  // Handle loading a saved project
  const handleLoadProject = useCallback((proj) => {
    setProjectId(proj.id || generateProjectId());
    setTrees(proj.trees || []);
    setProjectName(proj.name || '');
    setAddressLabel(proj.address || '');
    setProjectSaved(true); // loaded projects are already saved
    treeIdCounter = proj.trees?.length || 0;

    if (mapRef.current && proj.center) {
      mapRef.current.flyTo({
        center: proj.center,
        zoom: proj.zoom || 17,
        pitch: proj.pitch || 45,
        bearing: proj.bearing || 0,
        duration: 2000,
      });
    }
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center w-screen h-dvh bg-[#0f1a0f] p-6">
        <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🌳</div>
          <h1 className="text-green-300 font-bold text-xl mb-2">CanopyViz</h1>
          <p className="text-slate-400 text-sm mb-4">
            A Mapbox access token is required to load the map.
          </p>
          <div className="bg-black/30 rounded-lg p-4 text-left text-xs font-mono text-slate-300 mb-4">
            <p className="text-slate-500 mb-1"># Create a .env file in the project root:</p>
            <p>VITE_MAPBOX_TOKEN=your_token_here</p>
            <p className="mt-2 text-slate-500"># Optional: enables dynamic species database</p>
            <p>VITE_FLORA_API_KEY=your_key_here</p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-800/60 text-green-300 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-green-700/60 transition-colors"
            >
              Get a free Mapbox token
            </a>
            <a
              href="https://perenual.com/docs/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-900/40 text-blue-300 text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-800/40 transition-colors"
            >
              Get a free Flora API key (optional)
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#0c0c0c]">
      {/* Map layer */}
      <MapView
        ref={mapRef}
        trees={trees}
        speciesMap={speciesMap}
        allSpecies={allSpecies}
        show3D={show3D}
        showSoilLayer={showSoilLayer}
        showPowerLines={showPowerLines}
        powerLineData={powerLineGeoJSON}
        powerLineBufferData={powerLineBufferGeoJSON}
        onMapClick={handleMapClick}
        onRemoveTree={handleRemoveTree}
        onMoveEnd={handleMoveEnd}
        projectionYear={projectionYear}
        siteIndex={siteIndex}
        prescription={prescription}
        onMapReady={handleMapReady}
        hasSpeciesSelected={hasSpeciesSelected}
        planningData={planningData}
        cursorStyle={cursorStyle}
        lightPreset={lightPreset}
        season={season}
      />

      {/* Welcome hint */}
      <WelcomeHint treeCount={trees.length} />

      {/* Top bar: search + user menu */}
      <div className="absolute top-0 left-0 right-0 z-20 safe-top">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
          <div className="flex-1 min-w-0">
            <SearchBar onFlyTo={handleFlyTo} onLocate={handleLocate} onAddressSelect={setAddressLabel} />
          </div>
          <UserMenu user={currentUser} onSignInClick={() => setShowAuthModal(true)} />
        </div>
      </div>

      {/* Ecoregion badge */}
      {userEcoregion && (
        <div className="absolute top-[50px] left-0 right-0 z-10 flex justify-center pointer-events-none safe-top">
          <div className="rounded-full px-2.5 py-0.5 text-[9px] text-slate-400 font-medium pointer-events-auto bg-black/40 backdrop-blur-md border border-white/[0.06]">
            {ECOREGIONS[userEcoregion]?.name || userEcoregion}
          </div>
        </div>
      )}

      {/* Analytics Dashboard (includes tools) */}
      <AnalyticsDashboard
        trees={trees}
        speciesMap={speciesMap}
        projectionYear={projectionYear}
        siteIndex={siteIndex}
        prescription={prescription}
        onSiteIndexChange={setSiteIndex}
        onChangePrescription={setPrescription}
        mapCenter={userLocation}
        projectName={projectName}
        activeTool={activeTool}
        onToolChange={handleToolChange}
        showSpacingRings={showSpacingRings}
        onToggleSpacingRings={() => setShowSpacingRings((p) => !p)}
        conflicts={conflictCount}
        rulerLabel={rulerLabel}
        boundaryArea={boundaryAreaLabel}
        areaFillAcres={areaFillAcres}
        onFinishPolygon={handleFinishPolygon}
        polygonPoints={activeTool === 'area' ? areaPoints.length : activeTool === 'boundary' ? boundaryPoints.length : 0}
        lightPreset={lightPreset}
        onLightPresetChange={setLightPreset}
        season={season}
        onSeasonChange={setSeason}
      />

      {/* Growth timeline overlay */}
      {showGrowth && (
        <GrowthTimeline
          projectionYear={projectionYear ?? 30}
          onChangeYear={setProjectionYear}
          trees={trees}
          speciesMap={speciesMap}
          siteIndex={siteIndex}
          prescription={prescription}
        />
      )}

      {/* Bottom toolbar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 safe-bottom">
        <TreeToolbar
          selectedSpecies={selectedSpecies}
          onSelectSpecies={setSelectedSpecies}
          selectedSpeciesMix={selectedSpeciesMix}
          onSetSpeciesMix={setSelectedSpeciesMix}
          onSetMixProportions={setMixProportions}
          mixProportions={mixProportions}
          fillSettings={fillSettings}
          onSetFillSettings={setFillSettings}
          activeTool={activeTool}
          allSpecies={allSpecies}
          speciesMap={speciesMap}
          apiLoading={apiLoading}
          showNonNative={showNonNative}
          onToggleNonNative={() => setShowNonNative((p) => !p)}
          show3D={show3D}
          showGrowth={showGrowth}
          showSoilLayer={showSoilLayer}
          showPowerLines={showPowerLines}
          onToggle3D={toggle3D}
          onToggleSoilLayer={toggleSoilLayer}
          onTogglePowerLines={togglePowerLines}
          onToggleGrowth={() => {
            setShowGrowth((p) => {
              if (!p) {
                setProjectionYear(5);
              } else {
                setProjectionYear(null);
              }
              return !p;
            });
          }}
          onUndo={handleUndo}
          onClear={handleClear}
          treeCount={trees.length}
          userEcoregion={userEcoregion}
          onShowDetail={setDetailSpecies}
          onOpenProject={() => setShowProjectDrawer(true)}
          detectedSoil={detectedSoil}
          nearPowerLine={nearPowerLine}
        />
      </div>

      {/* Species detail modal */}
      {detailSpecies && (
        <SpeciesDetail
          speciesId={detailSpecies}
          userEcoregion={userEcoregion}
          speciesMap={speciesMap}
          detectedSoil={detectedSoil}
          nearPowerLine={nearPowerLine}
          onClose={() => setDetailSpecies(null)}
        />
      )}

      {/* Auth modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={(user) => setCurrentUser(user)}
      />

      {/* Project drawer */}
      <ProjectDrawer
        open={showProjectDrawer}
        onClose={() => setShowProjectDrawer(false)}
        trees={trees}
        speciesMap={speciesMap}
        mapRef={mapRef}
        projectId={projectId}
        projectName={projectName}
        address={addressLabel}
        currentUser={currentUser}
        onProjectNameChange={setProjectName}
        onLoadProject={handleLoadProject}
        onProjectSaved={() => setProjectSaved(true)}
        onSignInClick={() => { setShowProjectDrawer(false); setShowAuthModal(true); }}
        prescription={prescription}
        siteIndex={siteIndex}
        projectionYear={projectionYear}
      />
    </div>
  );
}
