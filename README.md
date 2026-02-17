# CanopyViz — Tree Planting Visualizer

A professional-grade forestry planning and visualization PWA built for arborists, urban foresters, and land managers. Place trees on a satellite map, simulate stand growth over 60+ years with an FVS-calibrated engine, model silvicultural prescriptions, estimate carbon credits, and generate detailed PDF reports — all from a browser.

![React](https://img.shields.io/badge/React-19-blue) ![Mapbox](https://img.shields.io/badge/Mapbox_GL_JS-3.18-green) ![Validation](https://img.shields.io/badge/FVS_Accuracy-88.9%25-brightgreen) ![PWA](https://img.shields.io/badge/PWA-Installable-purple)

---

## Features

### Interactive Map & Tree Placement
- **Satellite imagery** with 3D terrain via Mapbox GL JS
- **Address search** with Mapbox Geocoding — fly to any location
- **Geolocation** — auto-pan to your current position on load
- **Tap to plant** individual trees or use bulk planting tools
- **3D procedural tree models** — 7 distinct tree forms (broadleaf-round, conical, columnar, vase, spreading, weeping, palm) rendered as Mapbox fill-extrusions with species-specific trunk height, crown width, and shape
- **Seasonal canopy colors** — species-appropriate colors for spring, summer, fall, and winter (deciduous vs. evergreen)

### Species Database
- **121 bundled tree species** with detailed attributes: growth rate, mature dimensions, hardiness zones, native range, soil preferences, drought/salt tolerance, ecoregion suitability, and allometric parameters
- **Ecoregion-aware filtering** — species are filtered by your location's ecoregion, with native/introduced/invasive status indicators
- **Flora API integration** (Perenual) — supplements the bundled database with additional species
- **29 natural community mixes** — historically common species combinations by ecoregion (e.g., "Loblolly Pine Plantation 80-10-10%") with recommended proportions
- **Multi-select filters** — filter by native status, deciduous/evergreen, growth rate, soil tolerance, and more
- **Species detail panels** — double-click any species for full details with a real photo (fetched from Wikipedia)
- **Soil-based filtering** — auto-filters species compatible with the detected soil type at your location

### Planning Tools
- **Area fill** — draw a polygon and auto-fill with selected species at proper spacing, respecting mix proportions
- **Row planting** — click two endpoints to generate evenly-spaced tree rows
- **Spacing rings** — visual circles showing each species' recommended spacing
- **Spacing conflict detection** — warns when trees are placed too close together
- **Distance ruler** — measure distances between any two points
- **Property boundary drawing** — outline a parcel for area calculations
- **Acreage calculation** — real-time area display when drawing fill polygons
- **Fill settings panel** — override species proportions, spacing, and other parameters for fill operations; settings persist per session

### Growth & Yield Engine
- **FVS-calibrated growth model** — validated against 4 canonical FVS benchmark stands at **88.9% overall accuracy** (Loblolly Pine 93.4%, Oak-Hickory 88.8%, Douglas-fir 87.3%, Ponderosa Pine 86.1%)
- **Individual tree tracking** — each tree has its own DBH, height, crown width, crown ratio, biomass, volume, and carbon storage
- **Individual tree vigor variation** — Box-Muller-distributed growth multipliers (σ=0.12) create realistic diameter distributions (CV ~20-25% by mid-rotation), matching real stand variability
- **Competition-dependent growth** — Stand Density Index (SDI) drives a `competitionModifier` that reduces growth as canopy closes
- **Density-dependent mortality** — power-function mortality with crown-ratio weighting (suppressed trees die 2-4x faster), producing natural self-thinning patterns
- **Adaptive urban/natural context** — automatically infers urban vs. natural forestry from planting density and area, adjusting mortality curves accordingly
- **Crown ratio dynamics** — tracks per-tree crown ratio based on relative canopy position, the single most important mortality predictor in FVS (Wykoff 1986)
- **Site index support** — numeric site index (40-100 scale) or auto-derived from USDA soil texture
- **Interactive growth slider** — scrub through 0-100 years and watch the 3D stand evolve in real time

### Allometric Equations
- **21 species groups** with calibrated coefficients for:
  - Height: Chapman-Richards equation
  - Crown width: linear model
  - Biomass: Jenkins et al. (2003) with **regional correction factors** (Jenkins-to-CRM) by FVS variant — accounts for the known 10-25% overestimate in national equations
  - Volume: board feet (Scribner) with soft merchantability threshold (8-12" DBH ramp)
  - Pulpwood: cord volume (Honer et al. 1983) for 5-10" DBH
  - Leaf area: power function for ecosystem services
- **Regional biomass corrections** — published Domke et al. (2012) correction factors split by softwood/hardwood and 6 FVS variant regions (SN, NE, PN, CR, CI, CA)

### Silvicultural Prescriptions
- **10 pre-defined management regimes**: Even-aged Sawtimber, Pulpwood Rotation, Shelterwood, Selection Harvest, Pine Plantation, Sanitation Thinning, Wildlife Habitat, Old-Growth Conservation, PCT + Commercial, and Custom
- **Thinning types**: low thinning, crown thinning, mechanical thinning, selection, shelterwood seed/removal cuts, clearcut
- **Prescription timeline visualization** — see exactly what happens at each scheduled action
- **Growth projection under management** — watch how thinning schedules affect stand development, volume yield, and financial returns

### Forest Finance
- **Timber product classification** — veneer, sawtimber, and pulpwood based on DBH thresholds
- **Species-group stumpage pricing** — regional market prices per MBF and per cord
- **Per-harvest revenue calculation** — detailed breakdown of removed trees, volumes, and values
- **Management cost tracking** — site prep, planting, PCT, and overhead costs
- **Investment analysis** — Net Present Value (NPV), Land Expectation Value (LEV), and Internal Rate of Return (IRR) at configurable discount rates

### Carbon Credit Estimation
- **IFM (Improved Forest Management)** and **A/R (Afforestation/Reforestation)** methodologies
- **Baseline vs. project scenario modeling** — quantifies additionality
- **Buffer pool allocation** — 10-20% risk buffer per registry standards (ACR, Verra VCS, Gold Standard, CAR)
- **Leakage deduction** — activity-shifting and market leakage estimates
- **Risk assessment scoring** — permanence, financial, regulatory, and natural disturbance risks
- **Revenue projection** — at configurable $/tCO2e prices with vintage year breakdown

### Ecosystem Services Valuation
- **Stormwater interception** — gallons captured per year, valued at municipal treatment cost
- **Energy savings** — cooling/heating reduction from shading and windbreak effects
- **Air quality improvement** — PM2.5, O3, NO2, SO2 removal valued at EPA benefit rates
- **Property value uplift** — hedonic valuation based on tree proximity and maturity
- **Carbon valuation** — social cost of carbon applied to sequestration

### FVS Integration
- **FVS keyword file export** (`.key`) — generates complete keyword files for running through USDA Forest Service FVS Suppose or command-line FVS
- **Automatic variant detection** — determines the correct FVS variant (NE, SN, PN, CR, CI, CA) from coordinates
- **Species code mapping** — 109 species mapped to FVS 2-letter codes across 6 variants, with cross-variant fallback logic
- **Benchmark validation panel** — run 4 canonical benchmark stands through the internal engine and see side-by-side comparisons with FVS outputs (QMD, TPA, BA, volume, biomass) at every decade

### Environmental Data Layers
- **USDA soil data** — real-time soil texture identification from NRCS Soil Data Access API, displayed as a toggleable map layer with color-coded soil types
- **Power line detection** — OpenStreetMap Overpass API integration showing overhead power lines as a conflict layer
- **Auto soil selection** — automatically identifies soil at the planting location for species filtering

### Project Management
- **Save & load projects** — localStorage with optional Firebase Firestore cloud sync
- **User authentication** — email/password and Google sign-in via Firebase Auth
- **Share via URL** — generate shareable links to projects
- **PDF report export** — multi-page professional reports with map snapshots, stand metrics, growth projections, harvest schedules, financial analysis, and ecosystem services valuation

---

## Architecture

```
src/
├── App.jsx                      # Root component — state management, tool orchestration
├── components/
│   ├── AnalyticsDashboard.jsx   # Unified tabbed dashboard (Stats, Forestry, Silviculture, Carbon, Validation)
│   ├── AuthModal.jsx            # Login/signup modal (Firebase Auth)
│   ├── CarbonCreditPanel.jsx    # Carbon credit estimation UI
│   ├── ForestryPanel.jsx        # Growth & yield metrics, time-series charts
│   ├── GrowthTimeline.jsx       # Interactive year slider for 3D growth visualization
│   ├── MapView.jsx              # Mapbox GL JS map with all custom layers
│   ├── PlanningTools.jsx        # Tool mode selector (place, row, fill, measure, boundary)
│   ├── SearchBar.jsx            # Address geocoding & geolocation
│   ├── SilviculturePanel.jsx    # Prescription selection & harvest analysis
│   ├── SpeciesDetail.jsx        # Full species info modal with photo
│   ├── StatsPanel.jsx           # Real-time environmental stats
│   ├── TreeToolbar.jsx          # Species selector with filters & community mixes
│   ├── ValidationPanel.jsx      # FVS benchmark validation runner & results
│   └── ...
├── models/
│   ├── allometry.js             # Allometric equations, species groups, biomass corrections
│   ├── carbonCredits.js         # IFM/A/R carbon credit methodology
│   ├── ecosystemServices.js     # Annual ecosystem service valuations
│   ├── forestFinance.js         # Timber pricing, NPV/LEV/IRR analysis
│   ├── forestryModel.js         # Core growth engine: projectStand(), mortality, competition
│   └── validation.js            # FVS benchmark validation runner
├── services/
│   ├── authService.js           # Firebase Auth wrapper
│   ├── cloudStore.js            # Firestore project sync + localStorage fallback
│   ├── floraApi.js              # Perenual Flora API client
│   ├── fvsExport.js             # FVS .key file generation
│   ├── pdfExport.js             # Multi-page PDF report generation (jsPDF)
│   ├── powerLineApi.js          # OpenStreetMap Overpass API for power lines
│   ├── soilApi.js               # USDA NRCS Soil Data Access API
│   ├── speciesImages.js         # Wikipedia REST API for species photos
│   └── ...
├── data/
│   ├── treeSpecies.js           # 121 species with full attributes
│   ├── speciesCommunities.js    # 29 natural community mixes by ecoregion
│   ├── silviculturalPrescriptions.js  # 10 management prescriptions
│   ├── fvsBenchmarks.js         # 4 canonical FVS validation stands
│   ├── fvsSpeciesCodes.js       # Species → FVS code mapping (6 variants)
│   └── educationalContent.js    # Tooltip educational snippets
└── utils/
    ├── calculations.js          # Environmental benefit calculations
    ├── geoUtils.js              # GeoJSON generation for map layers
    ├── planningUtils.js         # Spacing, row, fill, and measurement tools
    ├── seasonalColors.js        # Season-appropriate canopy colors
    ├── treeIcons.js             # Top-down SVG canopy icons for 2D view
    └── treeModels.js            # Procedural 3D tree form definitions
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A free [Mapbox access token](https://account.mapbox.com/access-tokens/)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/tree-planting-visualizer.git
cd tree-planting-visualizer
npm install
```

### Configuration

Copy the example environment file and add your tokens:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required — Mapbox satellite map and geocoding
VITE_MAPBOX_TOKEN=your_mapbox_token

# Optional — Perenual Flora API for extended species database
VITE_FLORA_API_KEY=your_flora_api_key

# Optional — Firebase for user accounts and cloud project sync
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> **Note:** The app works fully with only a Mapbox token. Firebase and Flora API are optional enhancements.

### Development

```bash
npm run dev
```

Open http://localhost:5173 on your phone or desktop.

### Build

```bash
npm run build
npm run preview
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + Vite 5 |
| **Mapping** | Mapbox GL JS 3.18 (satellite, 3D terrain, fill-extrusion, custom layers) |
| **Styling** | Tailwind CSS 4 with glassmorphism dark theme |
| **Forestry Models** | Custom growth engine calibrated against USDA FVS |
| **PDF Generation** | jsPDF + html2canvas |
| **Authentication** | Firebase Auth (email/password + Google) |
| **Cloud Storage** | Firebase Firestore + localStorage fallback |
| **External APIs** | Mapbox Geocoding, USDA NRCS Soil Data Access, OSM Overpass, Perenual Flora, Wikipedia REST |
| **PWA** | vite-plugin-pwa (Workbox service worker, offline caching) |

---

## Growth Model Validation

The internal growth engine is validated against 4 canonical FVS benchmark stands:

| Benchmark | FVS Variant | Site Index | Initial TPA | Score |
|---|---|---|---|---|
| Loblolly Pine Plantation | Southern (SN) | 65 | 300 | **93.4% (A)** |
| Mixed Oak-Hickory | Northeast (NE) | 65 | 200 | **88.8% (B)** |
| Douglas-fir Natural Stand | Pacific NW (PN) | 80 | 250 | **87.3% (B)** |
| Ponderosa Pine | Central Rockies (CI) | 70 | 200 | **86.1% (B)** |
| **Overall** | | | | **88.9% (B)** |

Metrics compared: QMD, TPA, Basal Area, Volume (BF), and Biomass — at 10-year intervals through age 60. Run the validation yourself from the app's Analytics Dashboard → Validation tab.

---

## Scientific References

- **Jenkins, J.C. et al. (2003)** — National-scale biomass estimators for United States tree species. *Forest Science* 49(1):12-35
- **Domke, G.M. et al. (2012)** — Consequences of applying the FIA component ratio method biomass estimation. *Forest Ecology and Management* 272:126-133
- **Reineke, L.H. (1933)** — Perfecting a stand-density index for even-aged forests. *Journal of Agricultural Research* 46:627-638
- **Wykoff, W.R. (1986)** — A basal area increment model for individual conifers in the northern Rocky Mountains. *Forest Science* 32(1):37-47
- **Honer, T.G., Ker, M.F., Alemdag, I.S. (1983)** — Metric timber tables for the commercial tree species of central and eastern Canada. *CFS Information Report PI-X-5*
- **Dixon, G.E. (2002)** — Essential FVS: A User's Guide to the Forest Vegetation Simulator. *USDA Forest Service GTR-INT-327*

---

## License

MIT
