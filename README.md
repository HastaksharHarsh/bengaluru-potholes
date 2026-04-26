# Bengaluru Road Watch

The **Live Map** is a sophisticated geospatial visualization system designed for real-time monitoring and analysis of urban infrastructure issues. Below is a technical abstract of its architecture, components, and working principles.

## 1. Core Architecture
The system is built on a **Modular React Architecture** using the [react-google-maps/api](https://www.npmjs.com/package/@react-google-maps/api) library. It separates the orchestration of API credentials from the rendering of spatial data.

- **Dynamic Script Loader**: Unlike standard static imports, the map uses a custom `useGoogleMapsScript` hook. This ensures the Google Maps JavaScript API is loaded only when needed, with specific libraries (`visualization`, `places`) and regional settings (`region: "IN"`).
- **State-Driven Rendering**: The map switches seamlessly between **Marker View** (granular detail) and **Heatmap View** (density analysis) based on user state.

## 2. Key Components
- [PotholeMap.tsx](src/components/maps/PotholeMap.tsx): The primary container. It acts as a gatekeeper, checking for a valid API key via `GoogleMapsKeyPrompt` before initializing the map.
- **Heatmap Layer**: Utilizes the `HeatmapLayerF` component to aggregate thousands of data points into a visual "hotspot" map, weighted by severity scores.
- **Custom Markers**: Instead of standard pins, it uses **Vector Symbols** (`google.maps.SymbolPath.CIRCLE`). This allows for dynamic scaling and color-coding directly within the browser without external image assets.
- **Interactive InfoWindows**: A context-aware overlay that displays metadata (road name, ward number, report count) when a marker is clicked.

## 3. Working Style & Logic
- **Data-to-Visual Mapping**:
  - **Severity**: Determines the `fillColor` and `scale` of the marker.
  - **Status**: If `status === "repaired"`, the marker color overrides to green, providing immediate visual feedback on resolution progress.
  - **Integrity**: A red `strokeWeight` is applied to markers where `reoccurred: true`, highlighting areas with "Improper Repairs."
- **Performance Optimization**: Uses `useMemo` for calculating heatmap data points, ensuring that the map remains responsive even with high-frequency data updates.
- **Map De-cluttering**: Applies a custom `mapStyles` array to hide Points of Interest (POIs) and transit lines, keeping the focus strictly on road data.

## 4. Legends & Visual Vocabulary
| Element | Visual Cue | Meaning |
| :--- | :--- | :--- |
| **Color (Fill)** | Red / Orange / Yellow | Critical / High / Medium Severity |
| **Color (Green)** | #10b981 | Repaired / Resolved |
| **Size (Scale)** | Larger Radius | Higher Severity / Impact |
| **Red Border** | Thick Stroke | Reoccurred Pothole (Bad Repair) |
| **Heatmap Gradient** | Cyan → Yellow → Red | Low Density → High Severity Zone |

## 5. Replication Checklist
To replicate this in a different project, you would need:
1. **API Key Management**: A secure way to handle `GOOGLE_MAPS_API_KEY`.
2. **Data Structure**: A consistent JSON schema for markers (Lat/Lng, Severity, Status).
3. **Visualization Library**: Install `@react-google-maps/api`.
4. **Theme Configuration**: Tailwind CSS or similar for the InfoWindow and Badge components.
