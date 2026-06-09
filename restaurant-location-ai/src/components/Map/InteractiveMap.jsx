import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { computeOverallScore } from '../../lib/scoring';
import { generateDemandPoints } from '../../lib/expansion';

const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = '&copy; Esri';

function markerColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

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
  return typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export default function InteractiveMap({
  locations,
  showHeatmap,
  selectedIds = [],
  onSelectLocation,
  flyTo,
  recommendations = [],
  onRightClick,
}) {
  const demandPoints = showHeatmap ? generateDemandPoints(locations) : [];
  const validLocations = locations.filter(l => isValid(l.lat, l.lng));

  return (
    <div className="w-full h-full overflow-hidden">
      <MapContainer
        center={[41.5868, -87.4]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution={SATELLITE_ATTRIBUTION} url={SATELLITE_URL} />
        <MapController flyTo={flyTo} />
        {onRightClick && <RightClickHandler onRightClick={onRightClick} />}

        {/* Demand heatmap */}
        {showHeatmap &&
          demandPoints.map((pt, idx) => (
            <CircleMarker
              key={`demand-${idx}`}
              center={[pt.lat, pt.lng]}
              radius={50}
              fillColor="#f97316"
              fillOpacity={Math.min(pt.intensity * 0.4, 0.6)}
              color="#f97316"
              weight={0}
            />
          ))}

        {/* AI expansion markers */}
        {recommendations.map((rec, idx) => (
          <CircleMarker
            key={`rec-${idx}`}
            center={[rec.lat, rec.lng]}
            radius={14}
            fillColor="#8b5cf6"
            fillOpacity={0.85}
            color="#6d28d9"
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 200 }}>
                <p style={{ fontWeight: 700, margin: '0 0 5px', fontSize: 13, color: '#7c3aed' }}>
                  AI Site #{idx + 1}
                </p>
                <span style={{
                  background: '#8b5cf6', color: '#fff',
                  padding: '2px 10px', borderRadius: 999,
                  fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 7,
                }}>
                  Score: {rec.score} / 100
                </span>
                <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>
                  {rec.distanceToNearest.toFixed(1)} mi from {rec.nearestStore}
                </p>
                <p style={{ fontSize: 11, color: '#777', margin: 0, fontStyle: 'italic', lineHeight: 1.45 }}>
                  {rec.reasoning}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Your location markers */}
        {validLocations.map((loc) => {
          const score = computeOverallScore(loc);
          const color = markerColor(score);
          const selected = selectedIds.includes(loc.id);

          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={selected ? 20 : 14}
              fillColor={color}
              fillOpacity={0.92}
              color={selected ? '#f97316' : 'white'}
              weight={selected ? 3 : 2}
              eventHandlers={{ click: () => onSelectLocation?.(loc) }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 160 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 13 }}>{loc.name}</p>
                  <p style={{ color: '#999', fontSize: 11, margin: '0 0 7px' }}>{loc.city}, {loc.state}</p>
                  <span style={{
                    background: color, color: '#fff',
                    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                  }}>
                    Score: {score}
                  </span>
                  {loc.avg_unit_volume > 0 && (
                    <p style={{ fontSize: 12, color: '#555', margin: '5px 0 0' }}>
                      AUV: ${(loc.avg_unit_volume / 1_000_000).toFixed(2)}M
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>
                    Click pin for details
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
