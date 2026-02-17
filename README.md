# CanopyViz - Tree Planting Visualizer

A mobile-first PWA that lets you visualize the impact of planting trees in any neighborhood. Search for an address, tap to place trees on a satellite map, and see real-time stats on CO2 absorption, shade coverage, and urban heat island reduction.

## Features

- **Satellite Map** -- Full Mapbox satellite imagery with 3D terrain
- **Address Search** -- Fly to any location with geocoding
- **Tap to Plant** -- Choose from 4 tree species (Oak, Maple, Pine, Palm)
- **3D Tree Models** -- Extruded trunks and canopies visible in 3D perspective
- **Live Stats** -- CO2 absorbed, canopy shade area, and cooling effect
- **Heat Island Heatmap** -- Toggle a cooling-effect heatmap overlay
- **Before/After Slider** -- Compare bare vs. tree-covered views side by side
- **PWA** -- Installable on iOS/Android home screens

## Setup

1. Get a free Mapbox access token at https://account.mapbox.com/access-tokens/

2. Create a `.env` file:
   ```
   VITE_MAPBOX_TOKEN=your_token_here
   ```

3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 on your phone or desktop

## Tech Stack

- React + Vite
- Mapbox GL JS (satellite, 3D terrain, fill-extrusion, heatmap)
- Tailwind CSS v4
- react-compare-slider
- vite-plugin-pwa (Workbox service worker)
