import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  ReactCompareSlider,
  ReactCompareSliderHandle,
} from 'react-compare-slider';
import { generateCanopyShadowGeoJSON, generateHeatmapGeoJSON, generateTreeModelGeoJSON } from '../utils/geoUtils';
import { loadTreeIcons, generateTreeIconGeoJSON } from '../utils/treeIcons';
import { TREE_SPECIES } from '../data/treeSpecies';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const CANOPY_SHAPES = ['round', 'oval', 'conical', 'columnar', 'vase', 'weeping', 'spreading', 'fan'];

export default function CompareView({ trees, speciesMap, allSpecies, show3D, showHeatmap, mapRef }) {
  const beforeContainerRef = useRef(null);
  const afterContainerRef = useRef(null);
  const beforeMapRef = useRef(null);
  const afterMapRef = useRef(null);
  const afterReadyRef = useRef(false);

  // Capture the main map's viewport at mount time (stable reference)
  const viewStateRef = useRef(null);
  if (!viewStateRef.current) {
    const mainMap = mapRef?.current;
    if (mainMap) {
      try {
        viewStateRef.current = {
          center: mainMap.getCenter(),
          zoom: mainMap.getZoom(),
          pitch: mainMap.getPitch(),
          bearing: mainMap.getBearing(),
        };
      } catch {
        // proxy may not be ready
      }
    }
    if (!viewStateRef.current) {
      viewStateRef.current = { center: [-73.985, 40.748], zoom: 17, pitch: 45, bearing: -17 };
    }
  }

  // Update "after" map data without re-creating the maps
  const updateAfterData = useCallback(() => {
    const map = afterMapRef.current;
    if (!map || !afterReadyRef.current) return;

    const shadowSrc = map.getSource('canopy-shadow');
    const iconSrc = map.getSource('tree-icons');
    const modelSrc = map.getSource('tree-models');
    const heatSrc = map.getSource('heatmap-data');

    if (shadowSrc) shadowSrc.setData(generateCanopyShadowGeoJSON(trees, speciesMap));
    if (iconSrc) iconSrc.setData(generateTreeIconGeoJSON(trees, speciesMap));
    if (modelSrc) modelSrc.setData(generateTreeModelGeoJSON(trees, speciesMap));
    if (heatSrc) heatSrc.setData(generateHeatmapGeoJSON(trees, speciesMap));

    // Toggle heatmap layer visibility
    if (map.getLayer('cooling-heatmap')) {
      map.setLayoutProperty('cooling-heatmap', 'visibility', showHeatmap ? 'visible' : 'none');
    }
  }, [trees, speciesMap, showHeatmap]);

  // ── Create both maps ONCE on mount ──
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    const viewState = viewStateRef.current;

    const beforeMap = new mapboxgl.Map({
      container: beforeContainerRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      ...viewState,
      antialias: true,
      interactive: false,
      attributionControl: false,
    });

    const afterMap = new mapboxgl.Map({
      container: afterContainerRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      ...viewState,
      antialias: true,
      interactive: false,
      attributionControl: false,
    });

    // Configure Standard Satellite features on both maps
    const configureStandard = (map) => {
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'day');
      } catch { /* Standard config not fully supported */ }

      // Terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });

      // 3D Buildings
      map.addSource('building-data', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
      });
      map.addLayer({
        id: '3d-buildings',
        source: 'building-data',
        'source-layer': 'building',
        type: 'fill-extrusion',
        slot: 'middle',
        minzoom: 15,
        filter: ['==', 'extrude', 'true'],
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['get', 'height'],
            0, '#c8beb4',
            20, '#b5aba2',
            50, '#a89e96',
            100, '#9a918a',
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            16, ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            16, ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 1,
        },
      });
    };

    beforeMap.on('load', () => configureStandard(beforeMap));

    afterMap.on('load', async () => {
      configureStandard(afterMap);

      // Load tree icons
      await loadTreeIcons(afterMap, allSpecies || TREE_SPECIES);

      // Register 3D models
      for (const shape of CANOPY_SHAPES) {
        try { afterMap.addModel(`tree-${shape}`, `/models/tree-${shape}.glb`); } catch { /* ok */ }
      }

      // Add all sources (empty initially — will be populated by updateAfterData)
      const emptyFC = { type: 'FeatureCollection', features: [] };
      afterMap.addSource('canopy-shadow', { type: 'geojson', data: emptyFC });
      afterMap.addSource('heatmap-data', { type: 'geojson', data: emptyFC });
      afterMap.addSource('tree-icons', { type: 'geojson', data: emptyFC });
      afterMap.addSource('tree-models', { type: 'geojson', data: emptyFC });

      // Canopy shadow fill
      afterMap.addLayer({
        id: 'canopy-shadow',
        type: 'fill',
        source: 'canopy-shadow',
        slot: 'middle',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
      });

      // 2D icons with zoom crossfade
      afterMap.addLayer({
        id: 'tree-canopies',
        type: 'symbol',
        source: 'tree-icons',
        slot: 'top',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': [
            'interpolate', ['exponential', 2], ['zoom'],
            13, ['*', ['get', 'sizeAtZ17'], 0.0625],
            15, ['*', ['get', 'sizeAtZ17'], 0.25],
            17, ['get', 'sizeAtZ17'],
            19, ['*', ['get', 'sizeAtZ17'], 4],
            21, ['*', ['get', 'sizeAtZ17'], 16],
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'map',
          'icon-rotation-alignment': 'map',
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, 0.92,
            15.5, 0,
          ],
        },
      });

      // 3D models with crossfade
      try {
        afterMap.addLayer({
          id: 'tree-models',
          type: 'model',
          source: 'tree-models',
          slot: 'top',
          layout: { 'model-id': ['get', 'modelId'] },
          paint: {
            'model-scale': ['get', 'scale'],
            'model-color': ['get', 'color'],
            'model-color-mix-intensity': 0.65,
            'model-opacity': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              15.5, 1,
            ],
          },
        });
      } catch { /* model layer not supported in this browser */ }

      // Heatmap layer (hidden by default, toggled by updateAfterData)
      afterMap.addLayer({
        id: 'cooling-heatmap',
        type: 'heatmap',
        source: 'heatmap-data',
        slot: 'middle',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': 1.5,
          'heatmap-radius': 50,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.1, 'rgba(74, 222, 128, 0.1)',
            0.3, 'rgba(74, 222, 128, 0.3)',
            0.5, 'rgba(34, 197, 94, 0.45)',
            0.7, 'rgba(22, 163, 74, 0.55)',
            1.0, 'rgba(21, 128, 61, 0.7)',
          ],
          'heatmap-opacity': 0.8,
        },
      });

      afterReadyRef.current = true;
      // Populate with current tree data
      updateAfterData();
    });

    beforeMapRef.current = beforeMap;
    afterMapRef.current = afterMap;

    return () => {
      afterReadyRef.current = false;
      beforeMap.remove();
      afterMap.remove();
      beforeMapRef.current = null;
      afterMapRef.current = null;
      viewStateRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update data when trees/speciesMap/heatmap changes ──
  useEffect(() => {
    updateAfterData();
  }, [updateAfterData]);

  return (
    <div className="absolute inset-0">
      <ReactCompareSlider
        handle={
          <ReactCompareSliderHandle
            buttonStyle={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(15, 26, 15, 0.8)',
              border: '2px solid rgba(74, 222, 128, 0.6)',
              color: '#4ade80',
              width: 40,
              height: 40,
            }}
            linesStyle={{
              width: 3,
              background: 'rgba(74, 222, 128, 0.5)',
            }}
          />
        }
        itemOne={
          <div className="relative w-full h-full">
            <div ref={beforeContainerRef} className="w-full h-full" />
            <div className="absolute top-16 left-3 glass-panel rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300">
              Before
            </div>
          </div>
        }
        itemTwo={
          <div className="relative w-full h-full">
            <div ref={afterContainerRef} className="w-full h-full" />
            <div className="absolute top-16 right-3 glass-panel rounded-lg px-3 py-1.5 text-xs font-semibold text-green-300">
              After
            </div>
          </div>
        }
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
