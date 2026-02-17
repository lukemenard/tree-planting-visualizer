import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { generateCanopyShadowGeoJSON, generateTreeModelGeoJSON, generateTree3DExtrusionGeoJSON } from '../utils/geoUtils';
import { loadTreeIcons, generateTreeIconGeoJSON } from '../utils/treeIcons';
import { TREE_SPECIES } from '../data/treeSpecies';
import { getSoilWmsTileUrl } from '../services/soilApi';

// Canopy shape -> GLB model mapping
const CANOPY_SHAPES = ['round', 'oval', 'conical', 'columnar', 'vase', 'weeping', 'spreading', 'fan'];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const EMPTY_FC = { type: 'FeatureCollection', features: [] };

const MapView = forwardRef(function MapView(
  { trees, speciesMap, allSpecies, show3D, showSoilLayer, showPowerLines, powerLineData, powerLineBufferData, onMapClick, onRemoveTree, onMoveEnd, projectionYear, siteIndex, prescription, onMapReady, hasSpeciesSelected, planningData, cursorStyle, lightPreset, season },
  ref
) {
  const containerRef = useRef(null);
  const mapInstance = useRef(null);
  const sourcesReady = useRef(false);

  const onMapClickRef = useRef(onMapClick);
  const onRemoveTreeRef = useRef(onRemoveTree);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onRemoveTreeRef.current = onRemoveTree; }, [onRemoveTree]);

  const onMoveEndRef = useRef(onMoveEnd);
  useEffect(() => { onMoveEndRef.current = onMoveEnd; }, [onMoveEnd]);

  useImperativeHandle(ref, () => ({
    flyTo: (...args) => mapInstance.current?.flyTo(...args),
    easeTo: (...args) => mapInstance.current?.easeTo(...args),
    getCenter: () => mapInstance.current?.getCenter(),
    getZoom: () => mapInstance.current?.getZoom(),
    getPitch: () => mapInstance.current?.getPitch(),
    getBearing: () => mapInstance.current?.getBearing(),
    getBounds: () => mapInstance.current?.getBounds(),
    getCanvas: () => mapInstance.current?.getCanvas(),
    on: (...args) => mapInstance.current?.on(...args),
    off: (...args) => mapInstance.current?.off(...args),
    setConfigProperty: (...args) => mapInstance.current?.setConfigProperty?.(...args),
  }), []);

  // Initialize the map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || mapInstance.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      center: [-73.985, 40.748],
      zoom: 17,
      pitch: 45,
      bearing: -17,
      antialias: true,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');

    map.on('load', async () => {
      // Configure Standard Satellite style (supports lightPreset but NOT show3dObjects/Buildings)
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'day');
      } catch (e) {
        console.warn('[MapView] Standard Satellite config not fully supported:', e);
      }

      // Terrain (Standard Satellite does NOT include terrain by default)
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });

      // 3D Buildings (Standard Satellite doesn't include 3D buildings, so we add them manually)
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

      // Load species-specific canopy icons for bundled + any initial API species
      await loadTreeIcons(map, allSpecies || TREE_SPECIES);

      // --- Register 3D tree models ---
      for (const shape of CANOPY_SHAPES) {
        const modelId = `tree-${shape}`;
        try {
          map.addModel(modelId, `/models/${modelId}.glb`);
        } catch (e) {
          console.warn(`Could not load model ${modelId}:`, e);
        }
      }

      // --- Soil WMS raster source & layer ---
      map.addSource('soil-wms', {
        type: 'raster',
        tiles: [getSoilWmsTileUrl()],
        tileSize: 256,
      });
      map.addLayer({
        id: 'soil-overlay',
        type: 'raster',
        source: 'soil-wms',
        slot: 'middle',
        paint: {
          'raster-opacity': 0,
          'raster-contrast': 0.4,
          'raster-saturation': 0.6,
          'raster-brightness-min': 0.1,
          'raster-brightness-max': 0.9,
        },
      });

      // --- Power line sources & layers ---
      map.addSource('power-lines', { type: 'geojson', data: EMPTY_FC });
      map.addSource('power-line-buffer', { type: 'geojson', data: EMPTY_FC });

      map.addLayer({
        id: 'power-line-buffer-fill',
        type: 'fill',
        source: 'power-line-buffer',
        slot: 'middle',
        paint: {
          'fill-color': 'rgba(245, 158, 11, 0.12)',
          'fill-outline-color': 'rgba(245, 158, 11, 0.3)',
        },
      });
      map.addLayer({
        id: 'power-line-routes',
        type: 'line',
        source: 'power-lines',
        slot: 'top',
        paint: {
          'line-color': '#f59e0b',
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 17, 3, 20, 5],
          'line-opacity': 0,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // --- Tree sources ---
      map.addSource('canopy-shadow', { type: 'geojson', data: EMPTY_FC });
      map.addSource('tree-icons', { type: 'geojson', data: EMPTY_FC });
      map.addSource('tree-models', { type: 'geojson', data: EMPTY_FC });
      map.addSource('tree-3d', { type: 'geojson', data: EMPTY_FC });

      // --- Tree layers ---

      // Ground canopy coverage indicator (click target + visible coverage)
      map.addLayer({
        id: 'canopy-shadow',
        type: 'fill',
        source: 'canopy-shadow',
        slot: 'middle',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            '*',
            ['coalesce', ['get', 'seasonalOpacity'], 1],
            ['interpolate', ['linear'], ['zoom'],
              13, 0.35,
              16, 0.25,
              19, 0.15,
            ],
          ],
        },
      });

      // Top-down canopy icons (fallback for zoomed-out views, fades out as 3D fades in)
      map.addLayer({
        id: 'tree-canopies',
        type: 'symbol',
        source: 'tree-icons',
        slot: 'top',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': [
            'interpolate', ['exponential', 2], ['zoom'],
            13, ['*', ['get', 'sizeAtZ17'], 0.0625],   // 2^(13-17) = 1/16
            15, ['*', ['get', 'sizeAtZ17'], 0.25],      // 2^(15-17) = 1/4
            17, ['get', 'sizeAtZ17'],                     // reference zoom
            19, ['*', ['get', 'sizeAtZ17'], 4],           // 2^(19-17) = 4
            21, ['*', ['get', 'sizeAtZ17'], 16],          // 2^(21-17) = 16
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-pitch-alignment': 'map',
          'icon-rotation-alignment': 'map',
        },
        paint: {
          // Crossfade: fully visible below zoom 14.5, fades out by zoom 15.5
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, 0.92,
            15.5, 0,
          ],
        },
      });

      // 3D tree models (visible at close zoom, fade in as icons fade out)
      try {
        map.addLayer({
          id: 'tree-models',
          type: 'model',
          source: 'tree-models',
          slot: 'top',
          layout: {
            'model-id': ['get', 'modelId'],
          },
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
      } catch (e) {
        console.warn('Could not add 3D model layer (may not be supported):', e);
      }

      // 3D tree fill-extrusion (reliable fallback - works everywhere)
      map.addLayer({
        id: 'tree-3d-extrusion',
        type: 'fill-extrusion',
        source: 'tree-3d',
        slot: 'top',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'baseHeight'],
          'fill-extrusion-opacity': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            15.5, 0.85,
          ],
        },
      });

      // Species name labels (visible at close zoom, floating above the 3D models)
      map.addLayer({
        id: 'tree-labels',
        type: 'symbol',
        source: 'tree-models',
        slot: 'top',
        minzoom: 17,
        layout: {
          'text-field': ['get', 'speciesName'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 17, 9, 19, 12, 21, 15],
          'text-offset': [0, -2.5],
          'text-anchor': 'bottom',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-optional': true,
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.7)',
          'text-halo-width': 1.2,
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            17, 0,
            17.5, 0.85,
          ],
        },
      });

      // --- Planning tool sources & layers ---
      map.addSource('spacing-rings', { type: 'geojson', data: EMPTY_FC });
      map.addSource('spacing-conflicts', { type: 'geojson', data: EMPTY_FC });
      map.addSource('ruler-line', { type: 'geojson', data: EMPTY_FC });
      map.addSource('ruler-points', { type: 'geojson', data: EMPTY_FC });
      map.addSource('boundary-polygon', { type: 'geojson', data: EMPTY_FC });
      map.addSource('boundary-points', { type: 'geojson', data: EMPTY_FC });
      map.addSource('drawing-polygon', { type: 'geojson', data: EMPTY_FC });
      map.addSource('drawing-points', { type: 'geojson', data: EMPTY_FC });
      map.addSource('row-preview', { type: 'geojson', data: EMPTY_FC });

      // Spacing rings (ground overlays -> middle slot)
      map.addLayer({
        id: 'spacing-rings-fill',
        type: 'fill',
        source: 'spacing-rings',
        slot: 'middle',
        paint: {
          'fill-color': 'rgba(56, 189, 248, 0.06)',
          'fill-outline-color': 'rgba(56, 189, 248, 0.25)',
        },
      });
      map.addLayer({
        id: 'spacing-rings-line',
        type: 'line',
        source: 'spacing-rings',
        slot: 'middle',
        paint: {
          'line-color': 'rgba(56, 189, 248, 0.3)',
          'line-width': 1,
          'line-dasharray': [3, 2],
        },
      });

      // Spacing conflicts (top slot for visibility)
      map.addLayer({
        id: 'spacing-conflicts-line',
        type: 'line',
        source: 'spacing-conflicts',
        slot: 'top',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-dasharray': [4, 3],
        },
      });

      // Ruler (top slot)
      map.addLayer({
        id: 'ruler-line-layer',
        type: 'line',
        source: 'ruler-line',
        slot: 'top',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      });
      map.addLayer({
        id: 'ruler-label-layer',
        type: 'symbol',
        source: 'ruler-line',
        slot: 'top',
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'label'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-offset': [0, -1],
        },
        paint: {
          'text-color': '#38bdf8',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: 'ruler-points-layer',
        type: 'circle',
        source: 'ruler-points',
        slot: 'top',
        paint: {
          'circle-radius': 5,
          'circle-color': '#38bdf8',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c0c0c',
        },
      });

      // Boundary polygon (ground fill -> middle, labels/lines/points -> top)
      map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary-polygon',
        slot: 'middle',
        paint: {
          'fill-color': 'rgba(167, 139, 250, 0.1)',
          'fill-outline-color': 'rgba(167, 139, 250, 0.5)',
        },
      });
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary-polygon',
        slot: 'top',
        paint: {
          'line-color': '#a78bfa',
          'line-width': 2,
          'line-dasharray': [5, 3],
        },
      });
      map.addLayer({
        id: 'boundary-label',
        type: 'symbol',
        source: 'boundary-polygon',
        slot: 'top',
        layout: {
          'text-field': ['concat', ['get', 'areaAcres'], ' acres'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#a78bfa',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: 'boundary-points-layer',
        type: 'circle',
        source: 'boundary-points',
        slot: 'top',
        paint: {
          'circle-radius': 5,
          'circle-color': '#a78bfa',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c0c0c',
        },
      });

      // Drawing polygon (ground fill -> middle, lines/points -> top)
      map.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: 'drawing-polygon',
        slot: 'middle',
        paint: {
          'fill-color': 'rgba(74, 222, 128, 0.1)',
          'fill-outline-color': 'rgba(74, 222, 128, 0.4)',
        },
      });
      map.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing-polygon',
        slot: 'top',
        paint: {
          'line-color': '#4ade80',
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      });
      map.addLayer({
        id: 'drawing-points-layer',
        type: 'circle',
        source: 'drawing-points',
        slot: 'top',
        paint: {
          'circle-radius': 5,
          'circle-color': '#4ade80',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c0c0c',
        },
      });

      // Row preview dots (top slot)
      map.addLayer({
        id: 'row-preview-layer',
        type: 'circle',
        source: 'row-preview',
        slot: 'top',
        paint: {
          'circle-radius': 4,
          'circle-color': '#4ade80',
          'circle-opacity': 0.6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#166534',
        },
      });

      sourcesReady.current = true;
      if (onMapReady) onMapReady();
    });

    // Click to place tree
    map.on('click', (e) => {
      onMapClickRef.current(e.lngLat);
    });

    // Right-click to remove tree
    map.on('contextmenu', (e) => {
      const queryLayers = ['canopy-shadow', 'tree-canopies'];
      if (map.getLayer('tree-models')) queryLayers.push('tree-models');
      const features = map.queryRenderedFeatures(e.point, {
        layers: queryLayers,
      });
      if (features.length > 0) {
        onRemoveTreeRef.current(features[0].properties.id);
      }
    });

    // Viewport change for power line fetching
    map.on('moveend', () => {
      if (onMoveEndRef.current) {
        onMoveEndRef.current(map.getBounds(), map.getZoom());
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      sourcesReady.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data when trees or projection year change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current) return;

    const currentSeason = season || 'summer';
    const shadowData = generateCanopyShadowGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription, currentSeason);
    const iconData = generateTreeIconGeoJSON(trees, speciesMap, projectionYear);
    const modelData = generateTreeModelGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription);
    const tree3dData = generateTree3DExtrusionGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription, currentSeason);

    const s = (name) => map.getSource(name);
    if (s('canopy-shadow')) s('canopy-shadow').setData(shadowData);
    if (s('tree-icons')) s('tree-icons').setData(iconData);
    if (s('tree-models')) s('tree-models').setData(modelData);
    if (s('tree-3d')) s('tree-3d').setData(tree3dData);
  }, [trees, speciesMap, projectionYear, siteIndex, prescription, season]);

  // Load icons for any new species added via Flora API
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current || !allSpecies) return;
    loadTreeIcons(map, allSpecies);
  }, [allSpecies]);

  // Tilt toggle (perspective vs flat)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current) return;

    map.easeTo({
      pitch: show3D ? 50 : 0,
      duration: 800,
    });
  }, [show3D]);

  // Soil layer toggle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current) return;

    map.setPaintProperty('soil-overlay', 'raster-opacity', showSoilLayer ? 0.7 : 0);
  }, [showSoilLayer]);

  // Power line layer toggle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current) return;

    map.setPaintProperty('power-line-routes', 'line-opacity', showPowerLines ? 0.9 : 0);
    map.setPaintProperty('power-line-buffer-fill', 'fill-color',
      showPowerLines ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0)');
    map.setPaintProperty('power-line-buffer-fill', 'fill-outline-color',
      showPowerLines ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 0, 0, 0)');
  }, [showPowerLines]);

  // Update power line data
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current) return;

    const s = (name) => map.getSource(name);
    if (powerLineData && s('power-lines')) s('power-lines').setData(powerLineData);
    if (powerLineBufferData && s('power-line-buffer')) s('power-line-buffer').setData(powerLineBufferData);
  }, [powerLineData, powerLineBufferData]);

  // Update planning layer data
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current || !planningData) return;

    const s = (name) => map.getSource(name);
    const setIf = (name, data) => { if (data && s(name)) s(name).setData(data); };

    setIf('spacing-rings', planningData.spacingRings);
    setIf('spacing-conflicts', planningData.spacingConflicts);
    setIf('ruler-line', planningData.rulerLine);
    setIf('ruler-points', planningData.rulerPoints);
    setIf('boundary-polygon', planningData.boundaryPolygon);
    setIf('boundary-points', planningData.boundaryPoints);
    setIf('drawing-polygon', planningData.drawingPolygon);
    setIf('drawing-points', planningData.drawingPoints);
    setIf('row-preview', planningData.rowPreview);
  }, [planningData]);

  // Light preset toggle (Standard Satellite style feature)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !sourcesReady.current || !lightPreset) return;
    try {
      map.setConfigProperty('basemap', 'lightPreset', lightPreset);
    } catch (e) {
      console.warn('[MapView] Could not set light preset:', e);
    }
  }, [lightPreset]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: cursorStyle || (hasSpeciesSelected ? 'crosshair' : 'pointer') }}
    />
  );
});

export default MapView;
