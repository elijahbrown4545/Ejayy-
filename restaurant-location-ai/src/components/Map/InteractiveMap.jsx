import { useEffect, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Circle,
  Popup, Tooltip, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverallScore } from '../../lib/scoring';

const SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attr: '&copy; Esri',
};
// Transparent labels-only overlay: restaurant names, road names, city labels
const LABELS = {
  url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  attr: '&copy; CartoDB',
};

function ownColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

// ── Fly-to controller ────────────────────────────────────────────────────────
function MapController({ flyTo }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (flyTo && flyTo !== prev.current) {
      prev.current = flyTo;
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
}

// ── Emit bounds after map stops moving ───────────────────────────────────────
function MapBoundsWatcher({ onBoundsChange }) {
  const map = useMap();
  const timer = useRef(null);

  const emit = useCallback(() => {
    const b = map.getBounds();
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east:  b.getEast(),
      west:  b.getWest(),
    });
  }, [map, onBoundsChange]);

  const debounced = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(emit, 900);
  }, [emit]);

  useMapEvents({ moveend: debounced, zoomend: debounced });

  // Fire once on mount
  useEffect(() => {
    const t = setTimeout(emit, 200);
    return () => clearTimeout(t);
  }, [emit]);

  return null;
}

// ── Right-click → add site ────────────────────────────────────────────────────
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

// ── Main map component ────────────────────────────────────────────────────────
export default function InteractiveMap({
  locations = [],
  selectedIds = [],
  onSelectLocation,
  flyTo,
  onRightClick,
  onBoundsChange,
  competitors = [],
  heatPoints = [],
  recommendations = [],
  showCompetitors = false,
  showTerritories = false,
  showHeatmap = false,
  showAI = true,
}) {
  const validOwn = locations.filter(l => isValid(l.lat, l.lng));

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[41.5868, -87.4]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        zoomSnap={0.5}
      >
        {/* Satellite photo base */}
        <TileLayer attribution={SATELLITE.attr} url={SATELLITE.url} />
        {/* Transparent text labels on top (shows restaurant/road names) */}
        <TileLayer attribution={LABELS.attr} url={LABELS.url} opacity={0.95} />

        <MapController flyTo={flyTo} />
        {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
        {onRightClick   && <RightClickHandler onRightClick={onRightClick} />}

        {/* ── HEAT MAP ─────────────────────────────────────────────────── */}
        {showHeatmap && heatPoints.map((pt, i) => (
          <CircleMarker
            key={`h${i}`}
            center={[pt.lat, pt.lng]}
            radius={pt.radius}
            fillColor={pt.fill}
            fillOpacity={pt.opacity}
            color="transparent"
            weight={0}
            interactive={false}
          />
        ))}

        {/* ── TRADE AREA CIRCLES ────────────────────────────────────────── */}
        {showTerritories && validOwn.map(loc => (
          <Circle
            key={`ta-${loc.id}`}
            center={[loc.lat, loc.lng]}
            radius={1609}
            color="#f97316"
            weight={1.5}
            fillColor="#f97316"
            fillOpacity={0.06}
            dashArray="6,10"
            interactive={false}
          />
        ))}

        {/* ── COMPETITOR MARKERS ───────────────────────────────────────── */}
        {showCompetitors && competitors.map((c, i) => (
          <CircleMarker
            key={`c${i}`}
            center={[c.lat, c.lng]}
            radius={5}
            fillColor="#92400e"
            fillOpacity={0.78}
            color="#fff"
            weight={1}
          >
            {c.name && (
              <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                <span style={{ fontFamily: 'system-ui', fontSize: 12 }}>{c.name}</span>
              </Tooltip>
            )}
          </CircleMarker>
        ))}

        {/* ── AI RECOMMENDATION MARKERS ────────────────────────────────── */}
        {showAI && recommendations.map((rec, idx) => (
          <CircleMarker
            key={`r${idx}`}
            center={[rec.lat, rec.lng]}
            radius={16}
            fillColor="#7c3aed"
            fillOpacity={0.9}
            color="#fff"
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 215 }}>
                <p style={{ fontWeight: 800, margin: '0 0 4px', fontSize: 14, color: '#6d28d9' }}>
                  AI Site #{idx + 1}
                </p>
                <span style={{
                  background: '#7c3aed', color: '#fff', padding: '2px 12px',
                  borderRadius: 999, fontSize: 12, fontWeight: 700,
                  display: 'inline-block', marginBottom: 10,
                }}>
                  Opportunity Score: {rec.score} / 100
                </span>
                {rec.breakdown && (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Road Access',       rec.breakdown.road],
                        ['Retail Synergy',    rec.breakdown.retail],
                        ['Competition Signal',rec.breakdown.competition],
                        ['Cannibalization',   rec.breakdown.cannibalization],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ color: '#6b7280', padding: '3px 8px 3px 0' }}>{k}</td>
                          <td style={{ fontWeight: 700, color: v < 0 ? '#dc2626' : '#16a34a', textAlign: 'right' }}>
                            {v > 0 ? '+' : ''}{v} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rec.nearestStore && rec.nearestStore !== 'N/A' && (
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '7px 0 0', fontStyle: 'italic' }}>
                    {rec.distanceToNearest?.toFixed(1)} mi from {rec.nearestStore}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ── OWN LOCATION MARKERS ─────────────────────────────────────── */}
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
              <Tooltip direction="top" offset={[0, -7]} opacity={0.95}>
                <span style={{ fontFamily: 'system-ui', fontSize: 12, fontWeight: 600 }}>
                  {loc.name}
                </span>
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 175 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 3px', fontSize: 14 }}>{loc.name}</p>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 8px' }}>
                    {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}
                  </p>
                  <span style={{
                    background: color, color: '#fff',
                    padding: '2px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  }}>
                    Score: {score}
                  </span>
                  {loc.avg_unit_volume > 0 && (
                    <p style={{ fontSize: 12, color: '#374151', margin: '7px 0 0' }}>
                      AUV: ${(loc.avg_unit_volume / 1_000_000).toFixed(2)}M
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#d1d5db', margin: '3px 0 0' }}>Click for full details</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
