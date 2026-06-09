import { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Circle,
  Popup, Tooltip, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverallScore } from '../../lib/scoring';

// ── Tile layers ──────────────────────────────────────────────────────────────
const SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attr: '&copy; Esri',
};
// Transparent labels-only overlay — adds road names, POI labels, city names
const LABELS = {
  url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  attr: '&copy; CartoDB',
};

// ── Score → marker colour ────────────────────────────────────────────────────
function ownColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

// ── Internal helper components ───────────────────────────────────────────────
function MapController({ flyTo }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (flyTo && flyTo !== prev.current) {
      prev.current = flyTo;
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 13, { duration: 1.5 });
    }
  }, [flyTo, map]);
  return null;
}

function MapBoundsWatcher({ onBoundsChange }) {
  const map = useMap();
  const scheduleRef = useRef(null);

  function emit() {
    const b = map.getBounds();
    onBoundsChange({
      north: b.getNorth(), south: b.getSouth(),
      east: b.getEast(),  west: b.getWest(),
    });
  }

  function debounced() {
    clearTimeout(scheduleRef.current);
    scheduleRef.current = setTimeout(emit, 700);
  }

  useMapEvents({ moveend: debounced, zoomend: debounced });
  useEffect(() => { emit(); }, []); // initial load
  return null;
}

function RightClickHandler({ onRightClick }) {
  useMapEvents({
    contextmenu(e) {
      e.originalEvent.preventDefault();
      onRightClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function isValid(lat, lng) {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InteractiveMap({
  locations = [],
  selectedIds = [],
  onSelectLocation,
  flyTo,
  onRightClick,
  onBoundsChange,
  // layer data
  competitors = [],     // OSM restaurants
  heatPoints = [],      // pre-scored grid
  recommendations = [], // AI picks
  // toggles
  showCompetitors = false,
  showTerritories = false,
  showHeatmap = false,
  showAI = true,
}) {
  const validOwn = locations.filter(l => isValid(l.lat, l.lng));

  return (
    <div className="w-full h-full overflow-hidden">
      <MapContainer
        center={[41.5868, -87.4]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        {/* Satellite base */}
        <TileLayer attribution={SATELLITE.attr} url={SATELLITE.url} />
        {/* Transparent labels overlay — shows restaurant names, roads, cities */}
        <TileLayer attribution={LABELS.attr} url={LABELS.url} opacity={0.9} />

        <MapController flyTo={flyTo} />
        {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
        {onRightClick && <RightClickHandler onRightClick={onRightClick} />}

        {/* ── HEAT MAP ── */}
        {showHeatmap && heatPoints.map((pt, i) => (
          <CircleMarker
            key={`heat-${i}`}
            center={[pt.lat, pt.lng]}
            radius={Math.max(8, Math.round(pt.score / 6))}
            fillColor={pt.fill}
            fillOpacity={pt.opacity}
            color="transparent"
            weight={0}
          />
        ))}

        {/* ── TRADE AREA CIRCLES (1-mile radius) ── */}
        {showTerritories && validOwn.map(loc => (
          <Circle
            key={`territory-${loc.id}`}
            center={[loc.lat, loc.lng]}
            radius={1609}
            color="#f97316"
            weight={1.5}
            fillColor="#f97316"
            fillOpacity={0.06}
            dashArray="6,10"
          />
        ))}

        {/* ── COMPETITOR MARKERS (OSM restaurants, never own stores) ── */}
        {showCompetitors && competitors.map((c, i) => (
          <CircleMarker
            key={`comp-${i}`}
            center={[c.lat, c.lng]}
            radius={5}
            fillColor="#9e5a00"
            fillOpacity={0.75}
            color="#fff"
            weight={1}
          >
            {c.name && (
              <Tooltip direction="top" offset={[0, -4]} opacity={0.92}>
                <span style={{ fontFamily: 'system-ui', fontSize: 12 }}>
                  {c.name}
                </span>
              </Tooltip>
            )}
          </CircleMarker>
        ))}

        {/* ── AI RECOMMENDATION MARKERS ── */}
        {showAI && recommendations.map((rec, idx) => (
          <CircleMarker
            key={`rec-${idx}`}
            center={[rec.lat, rec.lng]}
            radius={16}
            fillColor="#7c3aed"
            fillOpacity={0.88}
            color="#fff"
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 210 }}>
                <p style={{ fontWeight: 800, margin: '0 0 4px', fontSize: 13, color: '#6d28d9' }}>
                  AI Site #{idx + 1}
                </p>
                <span style={{
                  background: '#7c3aed', color: '#fff', padding: '2px 10px',
                  borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 8,
                }}>
                  Opportunity Score: {rec.score} / 100
                </span>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <tbody>
                    {rec.breakdown && Object.entries({
                      'Road Access': rec.breakdown.road,
                      'Retail Synergy': rec.breakdown.retail,
                      'Competition Signal': rec.breakdown.competition,
                      'Cannibalization': rec.breakdown.cannibalization,
                    }).map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ color: '#666', paddingRight: 8, paddingBottom: 2 }}>{k}</td>
                        <td style={{ fontWeight: 600, color: v < 0 ? '#dc2626' : '#16a34a' }}>
                          {v > 0 ? '+' : ''}{v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rec.nearestStore && rec.nearestStore !== 'N/A' && (
                  <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0', fontStyle: 'italic' }}>
                    {rec.distanceToNearest?.toFixed(1)} mi from {rec.nearestStore}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ── OWN LOCATION MARKERS ── */}
        {validOwn.map(loc => {
          const score = computeOverallScore(loc);
          const color = ownColor(score);
          const selected = selectedIds.includes(loc.id);
          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={selected ? 20 : 14}
              fillColor={color}
              fillOpacity={0.93}
              color={selected ? '#f97316' : '#fff'}
              weight={selected ? 3 : 2}
              eventHandlers={{ click: () => onSelectLocation?.(loc) }}
            >
              <Tooltip direction="top" offset={[0, -6]} permanent={false}>
                <span style={{ fontFamily: 'system-ui', fontSize: 12, fontWeight: 600 }}>
                  {loc.name}
                </span>
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 175 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 3px', fontSize: 14 }}>{loc.name}</p>
                  <p style={{ color: '#888', fontSize: 11, margin: '0 0 8px' }}>
                    {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}
                  </p>
                  <span style={{
                    background: color, color: '#fff',
                    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  }}>
                    Score: {score}
                  </span>
                  {loc.avg_unit_volume > 0 && (
                    <p style={{ fontSize: 12, color: '#555', margin: '6px 0 0' }}>
                      AUV: ${(loc.avg_unit_volume / 1_000_000).toFixed(2)}M
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>Click pin for full details</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
